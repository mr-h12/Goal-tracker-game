-- Quest Duo — Row Level Security
--
-- This is a private 2-player app with no public signup. There are two viable
-- security models; pick ONE.
--
-- MODEL A (default below): trusted-client, anon key only.
--   Both friends share the app; the anon key can read/write game data. Enable
--   RLS so the tables aren't wide open to arbitrary schemas, but allow the
--   anon role to operate on these specific tables. Simple; fine for two
--   friends on a private URL.
--
-- MODEL B (stricter): Supabase Auth per player.
--   Give each player a real auth user, store users.id = auth.uid()::text, and
--   restrict writes to `auth.uid()::text = user_id`. Use this if you ever host
--   it publicly. Commented at the bottom.

alter table public.users            enable row level security;
alter table public.tasks            enable row level security;
alter table public.task_completions enable row level security;
alter table public.xp_history       enable row level security;
alter table public.achievements     enable row level security;

-- ---- MODEL A: allow the anon (and authenticated) roles full access ----------
do $$
declare t text;
begin
  foreach t in array array['users','tasks','task_completions','xp_history','achievements']
  loop
    execute format('drop policy if exists "anon_all_%1$s" on public.%1$s;', t);
    execute format(
      'create policy "anon_all_%1$s" on public.%1$s
         for all to anon, authenticated
         using (true) with check (true);', t);
  end loop;
end $$;

-- ---- MODEL B (stricter, per-user) — uncomment to use instead of Model A ------
-- Requires users.id = auth.uid()::text.
--
-- create policy "read_all_users" on public.users
--   for select to authenticated using (true);
-- create policy "update_self" on public.users
--   for update to authenticated using (id = auth.uid()::text);
--
-- create policy "tasks_owner" on public.tasks
--   for all to authenticated
--   using (owner_id = auth.uid()::text)
--   with check (owner_id = auth.uid()::text);
--
-- create policy "completions_owner" on public.task_completions
--   for all to authenticated
--   using (user_id = auth.uid()::text)
--   with check (user_id = auth.uid()::text);
--
-- create policy "xp_owner" on public.xp_history
--   for all to authenticated
--   using (user_id = auth.uid()::text)
--   with check (user_id = auth.uid()::text);
--
-- create policy "ach_owner" on public.achievements
--   for all to authenticated
--   using (user_id = auth.uid()::text)
--   with check (user_id = auth.uid()::text);
