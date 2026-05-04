# Havells Live Poll

A real-time polling and quiz app built for internal townhalls, offsites, and team pulse-checks. The host launches a poll from their laptop, players scan a QR with their phone, and everyone's responses stream live across devices — no logins for players, no plugin installs, just a URL and a phone camera.

Built on Supabase (Postgres + Auth + Realtime) and deployed as a static SPA on Vercel. Runs comfortably on free tiers for ~80 concurrent players.

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Local setup](#local-setup)
  - [1. Create a Supabase project](#1-create-a-supabase-project)
  - [2. Run the SQL schema](#2-run-the-sql-schema)
  - [3. Configure Auth](#3-configure-auth)
  - [4. Get your API keys](#4-get-your-api-keys)
  - [5. Wire up the local app](#5-wire-up-the-local-app)
  - [6. Run the dev server](#6-run-the-dev-server)
  - [7. Smoke test](#7-smoke-test)
- [Deploy to Vercel](#deploy-to-vercel)
- [Project structure](#project-structure)
- [Schema map](#schema-map)
- [How it works at runtime](#how-it-works-at-runtime)
- [Scaling notes](#scaling-notes)
- [Troubleshooting](#troubleshooting)
- [Scripts](#scripts)
- [License](#license)

---

## Features

**Admin (laptop / large screen)**
- Sign up / sign in with email + password
- Create polls with multiple-choice, true/false, and rating-style questions
- Per-question timer, optional scoring, optional "research insight" reveal
- Mark a correct answer for quiz-mode questions (bars hide during voting to discourage peeking)
- Edit, duplicate, delete drafts
- One-click **Launch live** — generates a 6-char join code and a scannable QR
- Live lobby shows players joining and floating reaction emoji
- Live voting screen with real-time distribution bars, timer, and answered count
- Auto-advance when timer hits 0 or every player has answered
- Reveal screen with "Did you know" research card
- Finished-poll details view with aggregated results from the latest run

**Player (phone)**
- Scan QR or paste 6-char code → join
- Pick a name + emoji vibe — that's it
- Lobby with sendable reaction emoji
- Vote screen with timer, options, live distribution (or hidden during quiz mode for fairness)
- Result reveal with correct/incorrect feedback for scored questions
- Finished screen at the end

**Realtime**
- Postgres-changes subscriptions for answers, participants, reactions
- **Broadcast channel** for phase transitions (bypasses WAL queue — phase changes are instant even under heavy answer load)
- Visibility-change recovery — when a phone unlocks, the session state refetches automatically

---

## Architecture

```
┌────────────────────┐         ┌──────────────────────────────┐
│  Admin (laptop)    │         │       Supabase project       │
│  • Vite + React    │ ◄──────► │ • Postgres (8 tables, RLS)   │
│  • Supabase Auth   │  HTTPS  │ • Auth (email + password)    │
│  • Realtime sub    │  + WSS  │ • Realtime (postgres_changes │
└────────────────────┘         │   + broadcast channels)      │
                               │ • RPC functions:             │
┌────────────────────┐         │   - launch_session()         │
│  Player (phone)    │ ◄──────► │   - finalize_session()       │
│  • Same Vite app   │         └──────────────────────────────┘
│  • No auth          │
│  • Joins by ?join=  │
└────────────────────┘
```

- **Frontend:** Vite + React 18 (single static SPA, ~127 KB gzipped JS).
- **Backend:** Supabase Postgres + Auth + Realtime. No custom server, no Edge Functions.
- **Auth:** Supabase Auth for admins (email/password). Players are anonymous — they hit `/?join=CODE` and just type a name.
- **Realtime:** Two pipelines layered for reliability:
  1. `postgres_changes` for durable, eventually-consistent state (answers, participants, reactions).
  2. `broadcast` channel for instant phase transitions (lobby → voting → research → done) so the host's reveal click flips every screen in ~100ms regardless of WAL load.
- **Deploy:** Vercel (or any static host). Vercel's `rewrites` config sends every URL to `index.html` so client-side routing on `?join=…` works.

---

## Local setup

This is a step-by-step walk-through. Plan ~10 minutes the first time.

### Prerequisites
- Node.js 18+ and npm (or pnpm/yarn — examples use npm).
- A free [Supabase](https://supabase.com) account.
- A modern browser (Chrome, Edge, or Firefox).
- Optional: a phone on the same wifi for end-to-end testing.

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Pick any name and a region close to you.
3. Set a strong database password (save it; you may need it later for direct DB access).
4. Choose the **Free** plan. Click **Create new project**.
5. Wait ~1 minute for the project to provision. The dashboard will load when ready.

### 2. Run the SQL schema

This single SQL file creates every table, RLS policy, trigger, RPC, and turns on realtime publication. Idempotent — safe to re-run if anything fails partway.

1. In the Supabase dashboard left sidebar → **SQL Editor**.
2. Click **New query**.
3. Open [`supabase/schema.sql`](supabase/schema.sql) in your editor, **select all**, copy.
4. Paste into the Supabase SQL editor.
5. Click **Run** (or press Ctrl+Enter).
6. The result panel should say `Success. No rows returned`.

To verify everything applied:

```sql
-- Should return 8 tables
select tablename from pg_tables
where schemaname = 'public'
  and tablename in ('profiles','polls','questions','options','sessions','participants','answers','reactions');

-- Should return 2 rows
select proname from pg_proc where proname in ('launch_session','finalize_session');

-- Should return 4 rows
select tablename from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public';
```

If any of those return fewer rows than expected, scroll the SQL editor's result panel for an error message and re-run.

### 3. Configure Auth

1. Sidebar → **Authentication** → **Providers** → **Email**.
2. **Enable** the Email provider.
3. Toggle **"Confirm email"** OFF for local development (you can sign in immediately without checking your inbox). Re-enable for real production.
4. Save.

### 4. Get your API keys

1. Sidebar → **Project Settings** (gear icon) → **API**.
2. Copy the **Project URL** (looks like `https://abcdefgh.supabase.co`).
3. Copy the **anon public** key (a long JWT starting with `eyJ…`).

> ⚠️ Use the **anon** key, not the **service_role** key. The service_role key bypasses RLS and must never go into a frontend.

### 5. Wire up the local app

Clone the repo, then:

```bash
cd Havells_poll
cp .env.example .env.local
```

Open `.env.local` and paste your values:

```env
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi…your-long-anon-key…
```

Install dependencies:

```bash
npm install
```

### 6. Run the dev server

```bash
npm run dev
```

Vite will print something like:

```
  VITE v5.4.21  ready in 320 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.12:5173/
```

Open the **Local** URL in your browser. You should see the admin sign-in screen.

> 🔧 If you change `.env.local`, **restart `npm run dev`** — Vite only reads env vars at startup.

### 7. Smoke test

End-to-end check that admin → live → player works:

1. **Sign up** as an admin (email + password + name + designation).
2. Click **+ New poll**, type a name, add at least one question with two options, click **Save draft**.
3. Click **Launch** on the new poll → you'll see the lobby with a QR and a 6-char code.
4. Open a second browser tab (or your phone on the same wifi) and either:
   - Scan the QR, or
   - Manually go to `http://localhost:5173/?join=THECODE`
5. Type a name → click **Join lobby**.
6. Back on the admin tab, click **Start poll**. The player tab should flip to the vote screen automatically.
7. Vote on the player tab — admin's distribution updates in real time.
8. Click **Reveal insight** on the admin → both screens flip to the research card.
9. Click **Next question** or **Finish poll** to walk through the rest.

If any step hangs or doesn't propagate, check the browser console (F12) for errors and the [Troubleshooting](#troubleshooting) section.

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/havells-live-poll.git
git push -u origin main
```

`.env.local` is gitignored — your Supabase keys won't leak.

### 2. Import the repo into Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
2. **Import** your GitHub repo.
3. Framework preset: **Vite** (auto-detected).
4. Build command: `npm run build` (default).
5. Output directory: `dist` (default).
6. Expand **Environment Variables** and add:
   - `VITE_SUPABASE_URL` → your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` → your anon key
7. Click **Deploy**.

Vercel will build and give you a `https://your-project.vercel.app` URL.

### 3. Tell Supabase about the Vercel URL

Once you have the production URL:

1. Supabase → **Authentication** → **URL Configuration**.
2. Set **Site URL** to your Vercel URL.
3. Add the same URL to **Redirect URLs**.
4. Save.

Without this step, password resets and any future email-confirm flows would break.

### 4. (Optional) Re-enable email confirmation for production

For real prod, go back to **Authentication → Providers → Email** and turn **"Confirm email"** back ON. Test by signing up a new admin — they'll need to click the link in their inbox before they can sign in.

That's it — admins go to `https://your-project.vercel.app`, players scan the QR or hit `https://your-project.vercel.app/?join=ABC123`.

---

## Project structure

```
Havells_poll/
├── src/
│   ├── App.jsx                 # Top-level routing + state machine
│   ├── main.jsx                # ReactDOM mount
│   ├── styles.css              # Design tokens + all UI styles
│   ├── lib/
│   │   ├── supabase.js         # Supabase client + getClientId()
│   │   └── db.js               # Data layer — every CRUD + realtime helper
│   └── components/
│       ├── icons.jsx           # SVG icons + REACTION_EMOJIS + classNames()
│       ├── Auth.jsx            # Admin sign in / sign up screen
│       ├── Chrome.jsx          # Top bar, EmptyState, DoneScreen
│       ├── QrCode.jsx          # Real QR encoder (qrcode npm pkg)
│       ├── AdminList.jsx       # Poll list with search + filter
│       ├── AdminEdit.jsx       # Create / edit poll form
│       ├── AdminDetails.jsx    # Finished poll results page
│       ├── AdminLobby.jsx      # Live lobby (QR, code, joined players)
│       ├── AdminLive.jsx       # Live question + reveal screens
│       └── Player.jsx          # All player screens (Join/Lobby/Vote/Research/Finished/CodeEntry)
├── supabase/
│   └── schema.sql              # Full DDL — tables, RLS, triggers, RPCs, realtime
├── index.html                  # Vite entry HTML
├── vite.config.js
├── vercel.json                 # SPA rewrite rule
├── package.json
├── .env.example                # Template for .env.local
└── .gitignore
```

Key principle: **components never import `@supabase/supabase-js` directly**. All DB access goes through `src/lib/db.js`. If you need a new query, add it there.

---

## Schema map

Every UI concept maps to one Supabase table.

| UI concept              | Table         | Notes                                                        |
| ----------------------- | ------------- | ------------------------------------------------------------ |
| Admin account           | `auth.users` + `profiles` | Supabase Auth + display profile (auto-created via trigger) |
| Poll (template)         | `polls`       | Owned by admin (`owner_id`); status `draft` or `finished`    |
| Question                | `questions`   | FK → `polls`; type `multiple` / `truefalse` / `rating`       |
| Option                  | `options`     | FK → `questions`                                             |
| Live run                | `sessions`    | Each launch creates one with a unique 6-char join `code`     |
| Player                  | `participants`| Anonymous; identified by `(session_id, client_id)`           |
| Vote                    | `answers`     | UNIQUE on `(participant_id, question_id)` — one vote per Q   |
| Lobby reaction          | `reactions`   | Ephemeral emoji stream                                       |

**Two RPC functions** (defined in [`supabase/schema.sql`](supabase/schema.sql)):
- `launch_session(poll_id)` — atomically creates a session row with a unique join code; verifies the caller owns the poll.
- `finalize_session(session_id)` — marks the session and parent poll as finished.

**RLS in plain English:**
- Admins can only see/edit polls they own.
- Anyone (anon) can read a poll's questions/options if it's been launched (so players can render).
- Anyone can insert participants/answers/reactions for an *active* session (i.e. `ended_at is null`).
- Only the session owner can delete participants.

---

## How it works at runtime

1. **Admin clicks Launch** → frontend calls the `launch_session(poll_id)` RPC → Supabase generates a 6-char code, inserts a `sessions` row, returns it. Admin's UI moves to lobby view.
2. **Admin's lobby** subscribes to `participants` table changes for that session_id → players appear as they join.
3. **Player scans QR** → lands on `/?join=CODE` → app does `select * from sessions where code = ?` → resolves session and poll → shows join screen → on submit, inserts a `participants` row.
4. **Admin clicks Start poll** → optimistic local update + broadcast push + DB update on `sessions.phase = 'voting'`. Players hear the broadcast almost instantly and switch to vote screen.
5. **Player submits an answer** → INSERT into `answers`. Admin and other players subscribed to that table see it via `postgres_changes` and update their distribution bars.
6. **Round ends** (timer hits 0 OR every participant answered) → admin auto-advances to `phase: research` via the same broadcast + DB-update pattern.
7. **Admin clicks Next question** → broadcast updates `current_question_id` and `current_question_started_at` → all clients reset to the new question's timer.
8. **Admin clicks Finish poll** → calls `finalize_session(session_id)` → poll marked `finished`, session marked `done`, all clients flip to the wrap-up screen.
9. **Admin opens the finished poll's Details page** → it queries the latest finalized session's answers and groups counts per option per question for display.

---

## Scaling notes

Comfortable for **70–80 concurrent players** on free tiers. Tested envelope:

- **Supabase free tier** caps at 200 concurrent realtime connections — you'll use ~81. Plenty of headroom.
- **Postgres free tier** handles bursty inserts (everyone answering at once) without breaking a sweat.
- **Bundle size** is ~127 KB gzipped JS + ~3 KB gzipped CSS. First-load on 3G is ~1–2 seconds; after that it's all websocket.
- **Realtime architecture** uses broadcast for phase transitions (bypasses WAL queue) and postgres_changes for data. Phase changes are instant even when answers are flooding in.

If you push past ~150 concurrent players or run multiple polls simultaneously, you'll want Supabase Pro tier ($25/mo, lifts to 500 concurrent + higher rate limits).

---

## Troubleshooting

**"Missing `VITE_SUPABASE_URL`" in the console**
You haven't created `.env.local` yet, or you didn't restart `npm run dev` after creating it. Vite only reads env at startup.

**404 on `/rest/v1/rpc/launch_session`**
The RPC functions weren't created or the PostgREST schema cache is stale. Re-run [`supabase/schema.sql`](supabase/schema.sql), then run `notify pgrst, 'reload schema';` in the SQL editor.

**`net::ERR_INTERNET_DISCONNECTED`**
Your network is down or an extension/firewall is blocking the Supabase domain. Test by opening `https://your-project.supabase.co` in a browser tab.

**"No live game with that code"**
The session was either ended (`finalize_session` called) or the code is mistyped. Re-launch from the admin tab.

**Lobby shows participants but Start poll doesn't propagate to phones**
You're either on the old code (this is fixed by the broadcast + visibilitychange logic in [`src/App.jsx`](src/App.jsx)), or the player's phone has been locked long enough that the websocket suspended *and* the broadcast missed. Players who unlock their phone will refetch automatically; if not, refresh the player tab.

**RLS errors on insert**
Re-run [`supabase/schema.sql`](supabase/schema.sql) — it drops & recreates every policy idempotently.

**Build fails locally with module-not-found**
Delete `node_modules` and `package-lock.json`, run `npm install` fresh.

---

## Scripts

```bash
npm run dev        # Start Vite dev server (default: http://localhost:5173)
npm run build      # Build for production into dist/
npm run preview    # Serve the built dist/ locally to test the production build
```

---

## License

Internal Havells project. All rights reserved.
