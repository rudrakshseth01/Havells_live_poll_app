# Havells Live Poll — Production

Production-ready, Supabase-backed live polling app. Deploys to Vercel with the Supabase free tier.

## Architecture

- **Frontend:** Vite + React 18 (deploys to Vercel as a static SPA)
- **Backend:** Supabase Postgres + Realtime + Auth (free tier sufficient — RLS-secured)
- **Auth:** Supabase Auth — admins sign up / sign in. Players join anonymously by code.
- **Realtime:** Postgres changes streamed via Supabase Realtime — answers, lobby, phase transitions.

No bots, no simulated players, no split-screen. Real users only.

---

## Quick start (local)

```bash
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

---

## Supabase setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, paste & run [`supabase/schema.sql`](supabase/schema.sql) (creates tables, RLS policies, triggers, RPC functions).
3. **Auth → Providers → Email:** enable, disable "Confirm email" for the demo (re-enable in real prod).
4. **Auth → URL Configuration:** add your Vercel URL to "Site URL" and "Redirect URLs".
5. **Database → Replication:** turn on Realtime for these tables: `sessions`, `participants`, `answers`, `reactions`.
6. Copy **Project URL** and **anon public key** from Settings → API into your env vars.

---

## Vercel deploy

1. Push this folder to a Git repo.
2. In Vercel dashboard → New Project → import the repo.
3. **Framework preset:** Vite. **Build command:** `npm run build`. **Output directory:** `dist`.
4. Add env vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. Done.

---

## Schema map

| UI concept              | Table         | Notes                                                        |
| ----------------------- | ------------- | ------------------------------------------------------------ |
| Admin account           | `auth.users` + `profiles` | Supabase Auth + display profile                  |
| Poll (template)         | `polls`       | Owned by admin (`owner_id`)                                  |
| Question                | `questions`   | FK → polls                                                   |
| Option                  | `options`     | FK → questions                                               |
| Live run                | `sessions`    | Each launch creates a session w/ join code                   |
| Player                  | `participants`| Anonymous; identified by name + emoji + session              |
| Vote                    | `answers`     | One per (participant, question)                              |
| Lobby reaction          | `reactions`   | Ephemeral, RLS-allowed insert by participants                |

Every component in the original prototype has a 1:1 mapping — see [`src/lib/db.js`](src/lib/db.js) for the data layer.

---

## What changed from the prototype

- Bots, simulated lobby trickle, fake distribution updates — all removed
- Split-screen tab — removed (admin and player are now distinct devices in production)
- Tweaks panel — removed (design-tool-only, not a runtime concern)
- localStorage auth — replaced with Supabase Auth
- All UI preserved (admin list, edit, details, live, lobby, leaderboard, player flow)
- Realtime subscriptions replace polling timers for cross-device sync
- Join code is generated per session — players land on `/?join=ABC123` from the QR
