-- Quest Duo — initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Designed to expand beyond 2 players: players are rows, not hardcoded.

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.users (
  id          text primary key,                 -- 'mohanad', 'hasabo', ...
  username    text not null,
  avatar      text not null default 'wolf',      -- 'wolf' | 'whale' | ...
  title       text not null default 'Novice',
  level       int  not null default 1,
  xp          int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.tasks (
  id         uuid primary key default gen_random_uuid(),
  owner_id   text not null references public.users(id) on delete cascade,
  name       text not null,
  category   text not null,
  icon       text not null default '⭐',
  xp_reward  int  not null default 20 check (xp_reward >= 0),
  active     boolean not null default true
);

create table if not exists public.task_completions (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks(id) on delete cascade,
  user_id    text not null references public.users(id) on delete cascade,
  date       date not null default current_date,
  status     text not null check (status in ('done', 'miss')),
  xp_earned  int  not null default 0,
  unique (task_id, date)
);

create table if not exists public.xp_history (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null references public.users(id) on delete cascade,
  amount     int  not null,
  reason     text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references public.users(id) on delete cascade,
  name        text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists idx_tasks_owner on public.tasks(owner_id);
create index if not exists idx_completions_date on public.task_completions(date);
create index if not exists idx_xp_history_user on public.xp_history(user_id, created_at);

-- ----------------------------------------------------------------------------
-- Seed data (the two players + default quests)
-- ----------------------------------------------------------------------------

insert into public.users (id, username, avatar) values
  ('mohanad', 'MOHANAD', 'wolf'),
  ('hasabo',  'HASABO',  'whale')
on conflict (id) do nothing;

insert into public.tasks (owner_id, name, category, icon, xp_reward)
select u.id, t.name, t.category, t.icon, t.xp_reward
from public.users u
cross join (values
  ('Prayer on time',       'Faith',  '🕌', 20),
  ('Read Quran',           'Faith',  '📖', 20),
  ('Cashier SaaS project', 'Work',   '💼', 40),
  ('Gym',                  'Health', '🏋️', 50),
  ('Social',               'Life',   '🎉', 15),
  ('Graduation project',   'Work',   '🎓', 40)
) as t(name, category, icon, xp_reward)
on conflict do nothing;
