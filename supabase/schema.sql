-- Havells Live Poll — Supabase schema
-- Run once in the SQL editor of a fresh Supabase project.

-- Required extension for gen_random_uuid()
create extension if not exists pgcrypto;

-- ============================================================
-- TABLES
-- ============================================================

-- 1. Profile per admin (1:1 with auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  designation text not null default '',
  created_at timestamptz not null default now()
);

-- 2. Polls (templates owned by an admin)
create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  name text not null,
  description text not null default '',
  status text not null default 'draft' check (status in ('draft','finished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists polls_owner_lower_name on polls (owner_id, lower(name));

-- 3. Questions (FK polls)
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls on delete cascade,
  position int not null,
  text text not null default '',
  type text not null default 'multiple' check (type in ('multiple','truefalse','rating')),
  timer int not null default 30,
  scoring boolean not null default false,
  correct_option_id uuid,
  research_headline text not null default '',
  research_source text not null default ''
);
create index if not exists questions_poll_id_position on questions (poll_id, position);

-- 4. Options (FK questions)
create table if not exists options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions on delete cascade,
  position int not null,
  label text not null default ''
);
create index if not exists options_question_id_position on options (question_id, position);

-- 5. Sessions (each launch creates one)
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls on delete cascade,
  owner_id uuid not null references auth.users on delete cascade,
  code text not null unique,
  phase text not null default 'lobby' check (phase in ('lobby','voting','research','done')),
  current_question_id uuid references questions on delete set null,
  current_question_started_at timestamptz,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists sessions_code on sessions (code);

-- 6. Participants (anonymous players)
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions on delete cascade,
  client_id text not null,
  name text not null,
  emoji text not null default '👋',
  color text not null default '#7C5CFF',
  joined_at timestamptz not null default now(),
  unique (session_id, client_id)
);
create index if not exists participants_session on participants (session_id);

-- 7. Answers (one per participant per question)
create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions on delete cascade,
  participant_id uuid not null references participants on delete cascade,
  question_id uuid not null references questions on delete cascade,
  option_id uuid not null references options on delete cascade,
  answered_at timestamptz not null default now(),
  unique (participant_id, question_id)
);
create index if not exists answers_session_question on answers (session_id, question_id);

-- 8. Reactions (ephemeral lobby emoji stream)
create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions on delete cascade,
  participant_id uuid references participants on delete set null,
  name text not null default 'Guest',
  emoji text not null,
  x numeric not null default 50,
  created_at timestamptz not null default now()
);
create index if not exists reactions_session_created on reactions (session_id, created_at desc);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Keep polls.updated_at fresh on update
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists polls_touch_updated_at on polls;
create trigger polls_touch_updated_at
  before update on polls
  for each row execute function touch_updated_at();

-- Auto-create a profile row when a user signs up (so display name is available)
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, designation)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'designation', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table polls enable row level security;
alter table questions enable row level security;
alter table options enable row level security;
alter table sessions enable row level security;
alter table participants enable row level security;
alter table answers enable row level security;
alter table reactions enable row level security;

-- Profiles: anyone authenticated can read; user manages their own row
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select using (true);
drop policy if exists profiles_modify_own on profiles;
create policy profiles_modify_own on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Polls: owner CRUD
drop policy if exists polls_owner on polls;
create policy polls_owner on polls
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Polls (and nested questions/options): publicly readable when referenced by an active session
-- so anonymous players can render the questions during a live run.
drop policy if exists polls_session_read on polls;
create policy polls_session_read on polls for select
  using (exists (select 1 from sessions s where s.poll_id = polls.id));

drop policy if exists questions_owner on questions;
create policy questions_owner on questions for all
  using (exists (select 1 from polls p where p.id = questions.poll_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from polls p where p.id = questions.poll_id and p.owner_id = auth.uid()));

drop policy if exists questions_session_read on questions;
create policy questions_session_read on questions for select
  using (exists (select 1 from sessions s where s.poll_id = questions.poll_id));

drop policy if exists options_owner on options;
create policy options_owner on options for all
  using (exists (
    select 1 from questions q join polls p on p.id = q.poll_id
    where q.id = options.question_id and p.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from questions q join polls p on p.id = q.poll_id
    where q.id = options.question_id and p.owner_id = auth.uid()
  ));

drop policy if exists options_session_read on options;
create policy options_session_read on options for select
  using (exists (
    select 1 from questions q join sessions s on s.poll_id = q.poll_id
    where q.id = options.question_id
  ));

-- Sessions: owner CRUD; anyone can read (so /?join=code works without auth)
drop policy if exists sessions_owner_write on sessions;
create policy sessions_owner_write on sessions for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists sessions_public_read on sessions;
create policy sessions_public_read on sessions for select using (true);

-- Participants: anyone can insert/read (anonymous players); only owner can delete
drop policy if exists participants_anon_insert on participants;
create policy participants_anon_insert on participants for insert with check (
  exists (select 1 from sessions s where s.id = participants.session_id and s.ended_at is null)
);

drop policy if exists participants_public_read on participants;
create policy participants_public_read on participants for select using (true);

drop policy if exists participants_owner_delete on participants;
create policy participants_owner_delete on participants for delete
  using (exists (select 1 from sessions s where s.id = participants.session_id and s.owner_id = auth.uid()));

-- Answers: any participant of an active session can insert; everyone reads
drop policy if exists answers_anon_insert on answers;
create policy answers_anon_insert on answers for insert with check (
  exists (
    select 1 from sessions s
    where s.id = answers.session_id
      and s.phase = 'voting'
      and s.current_question_id = answers.question_id
  )
);

drop policy if exists answers_public_read on answers;
create policy answers_public_read on answers for select using (true);

-- Reactions: anyone can insert/read (lobby emoji stream)
drop policy if exists reactions_anon_insert on reactions;
create policy reactions_anon_insert on reactions for insert with check (
  exists (select 1 from sessions s where s.id = reactions.session_id and s.ended_at is null)
);
drop policy if exists reactions_public_read on reactions;
create policy reactions_public_read on reactions for select using (true);

-- ============================================================
-- REALTIME
-- Add the 4 hot tables to the supabase_realtime publication so
-- postgres_changes events stream to subscribed clients. This is
-- the SQL equivalent of toggling them on under
-- Database → Replication in the dashboard.
-- ============================================================
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['sessions','participants','answers','reactions'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ============================================================
-- RPC: launch_session — copies a draft poll into a new live session
-- with a unique 6-char join code. Returns the session row.
-- ============================================================
create or replace function launch_session(p_poll_id uuid)
returns sessions
language plpgsql security definer set search_path = public as $$
declare
  s sessions;
  new_code text;
  attempts int := 0;
begin
  -- Caller must own the poll
  if not exists (select 1 from polls p where p.id = p_poll_id and p.owner_id = auth.uid()) then
    raise exception 'not allowed';
  end if;

  -- Generate a unique code (6 chars, no ambiguous chars)
  loop
    new_code := upper(substr(translate(encode(extensions.gen_random_bytes(6), 'base64'), '+/=OIl01', 'XYZABCDE'), 1, 6));
    exit when not exists (select 1 from sessions where code = new_code);
    attempts := attempts + 1;
    if attempts > 8 then exit; end if;
  end loop;

  insert into sessions (poll_id, owner_id, code, phase)
  values (p_poll_id, auth.uid(), new_code, 'lobby')
  returning * into s;

  return s;
end $$;

-- ============================================================
-- RPC: finalize_session — bake answer counts into a results JSON
-- on the poll's questions and mark the poll finished.
-- Called when admin clicks "Finish poll".
-- ============================================================
create or replace function finalize_session(p_session_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_poll_id uuid;
begin
  select poll_id into v_poll_id from sessions
    where id = p_session_id and owner_id = auth.uid();
  if v_poll_id is null then raise exception 'not allowed'; end if;

  update polls set status = 'finished', updated_at = now()
    where id = v_poll_id;

  update sessions set phase = 'done', ended_at = now()
    where id = p_session_id;
end $$;

grant execute on function launch_session(uuid) to authenticated;
grant execute on function finalize_session(uuid) to authenticated;
