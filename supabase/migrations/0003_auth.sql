-- Quest Duo — link public.users to Supabase Auth, tighten RLS per-player.
-- Additive: does not touch existing rows/columns from 0001/0002.

alter table public.users
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

-- Maps the logged-in auth session to the player row (id = 'mohanad' | 'hasabo' | ...).
create or replace function public.current_player_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where auth_user_id = auth.uid();
$$;

-- Replace the old "anon, wide-open" policies (Model A) with per-player write
-- restrictions now that real accounts exist (Model B from 0002's comment).
do $$
declare t text;
begin
  foreach t in array array['users','tasks','task_completions','xp_history','achievements']
  loop
    execute format('drop policy if exists "anon_all_%1$s" on public.%1$s;', t);
  end loop;
end $$;

-- Both players can see everything (dashboard/leaderboard show both characters).
create policy "read_all_users"       on public.users            for select to authenticated using (true);
create policy "read_all_tasks"       on public.tasks             for select to authenticated using (true);
create policy "read_all_completions" on public.task_completions  for select to authenticated using (true);
create policy "read_all_xp_history"  on public.xp_history        for select to authenticated using (true);
create policy "read_all_achievements" on public.achievements     for select to authenticated using (true);

-- Writes are restricted to the authenticated player's own rows.
create policy "update_self_user" on public.users for update to authenticated
  using (id = public.current_player_id()) with check (id = public.current_player_id());

create policy "manage_own_tasks" on public.tasks for all to authenticated
  using (owner_id = public.current_player_id()) with check (owner_id = public.current_player_id());

create policy "manage_own_completions" on public.task_completions for all to authenticated
  using (user_id = public.current_player_id()) with check (user_id = public.current_player_id());

create policy "insert_own_xp_history" on public.xp_history for insert to authenticated
  with check (user_id = public.current_player_id());

create policy "manage_own_achievements" on public.achievements for all to authenticated
  using (user_id = public.current_player_id()) with check (user_id = public.current_player_id());
