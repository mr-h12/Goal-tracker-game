# ⚔️ Quest Duo

A private **2-player RPG life-improvement tracker**. Two friends (MOHANAD 🐺 and
HASABO 🐋) turn real-life habits into quests, earn XP, level up, and compete on
daily / weekly / monthly leaderboards. Dark neon-orange gaming UI, mobile-first,
installable as a PWA with offline support.

---

## 1. Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        React + Vite (PWA)                 │
│                                                           │
│  Pages ── ProfileSelect · Dashboard · Character           │
│           Quests · Leaderboard · Manage                   │
│     │                                                     │
│     ▼                                                     │
│  Zustand store (useGameStore)  ── UI state + actions      │
│     │                                                     │
│     ▼                                                     │
│  GameRepository  (interface)   ── the ONLY data boundary  │
│     ├── localRepository     (localStorage — active now)   │
│     └── supabaseRepository   (Supabase  — drop-in later)  │
└──────────────────────────────────────────────────────────┘
                              │
                              ▼  (when you flip the switch)
                    ┌────────────────────┐
                    │  Supabase          │
                    │  Postgres · Auth   │
                    │  Realtime · RLS    │
                    └────────────────────┘
```

**Key decision — the repository boundary.** No page or component ever touches
storage directly. They call methods on a single `GameRepository` interface
(`src/lib/repository/types.ts`). Today that interface is fulfilled by
`localRepository` (browser `localStorage`), so the app runs with zero backend.
When you're ready for real multiplayer sync, install `@supabase/supabase-js`,
uncomment `supabaseRepository`, and change one line in
`src/lib/repository/index.ts`. **No UI code changes.**

**Leveling** lives in one place (`src/lib/leveling/index.ts`) and is fully
configurable — change `XP_STEP` or the functions and every XP bar, level-up
trigger, and rank title updates consistently.

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (dark theme, neon-orange accents, glow utilities)
- **Animation:** Framer Motion (XP bar springs, swipe-to-complete drag, level-up modal)
- **State:** Zustand, persisted through the repository to `localStorage`
- **PWA:** `vite-plugin-pwa` (auto-update service worker, offline precache, installable manifest)
- **Backend (optional/later):** Supabase — Postgres, Auth, Realtime, RLS

---

## 2. Database schema

Full SQL in [`supabase/migrations`](supabase/migrations). Summary:

| Table              | Columns |
|--------------------|---------|
| `users`            | id (text PK), username, avatar, title, level, xp, created_at |
| `tasks`            | id, owner_id → users, name, category, icon, xp_reward, active |
| `task_completions` | id, task_id → tasks, user_id → users, date, status (done/miss), xp_earned · **unique(task_id, date)** |
| `xp_history`       | id, user_id → users, amount, reason, created_at |
| `achievements`     | id, user_id → users, name, unlocked_at · **unique(user_id, name)** |

`users.id` is a **text** key (`'mohanad'`, `'hasabo'`) rather than a UUID, so the
two seeded players are stable and the schema still expands to N players by
inserting more rows — nothing is hardcoded to two.

Security: [`0002_rls.sql`](supabase/migrations/0002_rls.sql) enables Row Level
Security on every table and ships two models — **Model A** (anon-key access for a
private shared app, default) and **Model B** (per-user Supabase Auth, commented,
for public hosting).

---

## 3. Folder structure

```
quest-duo/
├── public/
│   └── icons/                 # PWA icons (192, 512) — replace with real art
├── supabase/
│   └── migrations/
│       ├── 0001_init.sql      # tables + seed (players & default quests)
│       └── 0002_rls.sql       # Row Level Security policies
├── src/
│   ├── components/            # Avatar, XpBar, HealthBar, QuestCard,
│   │                          # PlayerCard, NavBar, LevelUpModal
│   ├── pages/                 # ProfileSelect, Dashboard, Character,
│   │                          # Quests, Leaderboard, Manage
│   ├── lib/
│   │   ├── leveling/          # configurable XP curve + rank titles
│   │   └── repository/        # GameRepository interface + local/supabase impls
│   ├── store/                 # useGameStore (Zustand)
│   ├── types/                 # shared domain types
│   ├── App.tsx                # routing + auth gate + layout
│   ├── main.tsx               # entry (BrowserRouter)
│   └── index.css              # Tailwind theme + glow utilities
├── .env.example
├── vercel.json
└── vite.config.ts             # Vite + PWA config
```

---

## 4. Running locally

```bash
cd quest-duo
npm install
npm run dev          # http://localhost:5173
```

The app works immediately on local storage — pick a profile and play. Data
persists in the browser; to reset, clear the `quest-duo:v1` localStorage key.

Build / preview production:

```bash
npm run build        # tsc + vite build (+ generates PWA service worker)
npm run preview
```

---

## 5. Switching to Supabase (optional, later)

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/0001_init.sql` then `0002_rls.sql`.
3. `npm install @supabase/supabase-js`
4. `cp .env.example .env` and fill `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
5. In `src/lib/repository/supabaseRepository.ts`, uncomment the implementation block.
6. In `src/lib/repository/index.ts`, export `supabaseRepository` instead of `localRepository`.

That's the entire migration — the UI is untouched. For live cross-device sync,
subscribe to Supabase Realtime on `users`/`task_completions` inside `init()` and
call the store setters on change.

---

## 6. Deploying to Vercel

`vercel.json` is included (Vite framework preset + SPA rewrite).

```bash
npm i -g vercel
vercel            # first run: link/create project
vercel --prod     # production deploy
```

Or connect the repo in the Vercel dashboard — it auto-detects Vite. If/when you
enable Supabase, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in
**Project → Settings → Environment Variables**.

The build emits a service worker, so the deployed site is installable ("Add to
Home Screen") and works offline after first load.

---

## 7. Gameplay

- **Profile select** — no signup; tap MOHANAD or HASABO to enter (`Switch` in the nav to swap).
- **Quests** — swipe a card **right = DONE** (adds XP, records completion) or **left = MISS**. Framer Motion drag with live DONE/MISS badges.
- **Level up** — crossing an XP threshold fires an animated LEVEL UP modal.
- **Dashboard** — both players' avatars, level, animated XP bar, and today's quest progress.
- **Character** — avatar, level, XP + health bars, done/missed stats, achievements, XP history.
- **Leaderboard** — daily / weekly / monthly XP totals with medals.
- **Manage** — add / edit / toggle / delete quests and **edit XP rewards** inline.
