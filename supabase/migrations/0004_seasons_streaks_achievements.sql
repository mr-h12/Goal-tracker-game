-- Quest Duo — Seasons, Streaks, Achievements.
-- Additive only. Derives everything from existing tasks/task_completions/
-- xp_history — no duplicate completion-tracking tables.

-- ----------------------------------------------------------------------------
-- Seasons
-- ----------------------------------------------------------------------------

create table if not exists public.seasons (
  id          uuid primary key default gen_random_uuid(),
  number      int  not null unique,
  name        text not null,
  start_date  date not null,
  end_date    date not null,
  is_active   boolean not null default true,
  champion_id text references public.users(id),
  finalized_at timestamptz
);

insert into public.seasons (number, name, start_date, end_date, is_active)
select 1, 'Season 1', current_date, date '2026-09-25', true
where not exists (select 1 from public.seasons where number = 1);

create index if not exists idx_seasons_active on public.seasons(is_active);

-- ----------------------------------------------------------------------------
-- Streaks (cached rollups on users, recomputed from task_completions)
-- ----------------------------------------------------------------------------

alter table public.users add column if not exists current_streak int not null default 0;
alter table public.users add column if not exists longest_streak int not null default 0;

create or replace function public.recompute_streak(p_user_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  active_days date[];
  d date;
  prev date;
  run int := 0;
  best int := 0;
  cur int := 0;
begin
  select array_agg(distinct date order by date)
  into active_days
  from public.task_completions
  where user_id = p_user_id and status = 'done';

  if active_days is null then
    update public.users set current_streak = 0, longest_streak = 0 where id = p_user_id;
    return;
  end if;

  prev := null;
  foreach d in array active_days loop
    if prev is not null and d = prev + 1 then
      run := run + 1;
    else
      run := 1;
    end if;
    best := greatest(best, run);
    prev := d;
  end loop;

  -- current streak only counts if the last active day is today or yesterday
  if prev = current_date or prev = current_date - 1 then
    cur := run;
  else
    cur := 0;
  end if;

  update public.users
  set current_streak = cur,
      longest_streak = greatest(longest_streak, best)
  where id = p_user_id;
end;
$$;

create or replace function public.trg_recompute_streak()
returns trigger
language plpgsql
as $$
begin
  perform public.recompute_streak(new.user_id);
  return new;
end;
$$;

drop trigger if exists recompute_streak_on_completion on public.task_completions;
create trigger recompute_streak_on_completion
  after insert or update on public.task_completions
  for each row execute function public.trg_recompute_streak();

-- backfill once for existing data
do $$
declare u record;
begin
  for u in select id from public.users loop
    perform public.recompute_streak(u.id);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Achievements (auto-unlock catalog)
-- ----------------------------------------------------------------------------

create or replace function public.check_achievements(p_user_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total_xp int;
  best_streak int;
  cur_streak int;
  quest_count int;
  perfect_day boolean;
begin
  select xp, longest_streak, current_streak into total_xp, best_streak, cur_streak
  from public.users where id = p_user_id;

  select count(*) into quest_count from public.task_completions
  where user_id = p_user_id and status = 'done';

  if quest_count >= 1 then
    insert into public.achievements (user_id, name) values (p_user_id, 'First Quest')
    on conflict (user_id, name) do nothing;
  end if;

  if total_xp >= 100 then
    insert into public.achievements (user_id, name) values (p_user_id, '100 XP')
    on conflict (user_id, name) do nothing;
  end if;
  if total_xp >= 500 then
    insert into public.achievements (user_id, name) values (p_user_id, '500 XP')
    on conflict (user_id, name) do nothing;
  end if;
  if total_xp >= 1000 then
    insert into public.achievements (user_id, name) values (p_user_id, '1000 XP')
    on conflict (user_id, name) do nothing;
  end if;

  if best_streak >= 7 then
    insert into public.achievements (user_id, name) values (p_user_id, '7 Day Streak')
    on conflict (user_id, name) do nothing;
  end if;
  if best_streak >= 30 then
    insert into public.achievements (user_id, name) values (p_user_id, '30 Day Streak')
    on conflict (user_id, name) do nothing;
  end if;

  -- Complete All Daily Tasks: every active task owned by this user has a
  -- 'done' completion today.
  select not exists (
    select 1 from public.tasks t
    where t.owner_id = p_user_id and t.active
      and not exists (
        select 1 from public.task_completions c
        where c.task_id = t.id and c.user_id = p_user_id
          and c.date = current_date and c.status = 'done'
      )
  ) and exists (select 1 from public.tasks where owner_id = p_user_id and active)
  into perfect_day;

  if perfect_day then
    insert into public.achievements (user_id, name) values (p_user_id, 'Complete All Daily Tasks')
    on conflict (user_id, name) do nothing;
  end if;

  -- Themed "Master" achievements, matched by task name (case-insensitive).
  if exists (
    select 1 from public.task_completions c join public.tasks t on t.id = c.task_id
    where c.user_id = p_user_id and c.status = 'done' and t.name ilike '%gym%'
    group by c.user_id having count(*) >= 20
  ) then
    insert into public.achievements (user_id, name) values (p_user_id, 'Gym Master')
    on conflict (user_id, name) do nothing;
  end if;

  if exists (
    select 1 from public.task_completions c join public.tasks t on t.id = c.task_id
    where c.user_id = p_user_id and c.status = 'done' and t.name ilike '%quran%'
    group by c.user_id having count(*) >= 20
  ) then
    insert into public.achievements (user_id, name) values (p_user_id, 'Quran Master')
    on conflict (user_id, name) do nothing;
  end if;

  if exists (
    select 1 from public.task_completions c join public.tasks t on t.id = c.task_id
    where c.user_id = p_user_id and c.status = 'done' and t.name ilike '%prayer%'
    group by c.user_id having count(*) >= 20
  ) then
    insert into public.achievements (user_id, name) values (p_user_id, 'Prayer Master')
    on conflict (user_id, name) do nothing;
  end if;

  if exists (
    select 1 from public.task_completions c join public.tasks t on t.id = c.task_id
    where c.user_id = p_user_id and c.status = 'done' and (t.name ilike '%saas%' or t.name ilike '%cashier%')
    group by c.user_id having count(*) >= 20
  ) then
    insert into public.achievements (user_id, name) values (p_user_id, 'SaaS Master')
    on conflict (user_id, name) do nothing;
  end if;

  if exists (
    select 1 from public.task_completions c join public.tasks t on t.id = c.task_id
    where c.user_id = p_user_id and c.status = 'done' and t.name ilike '%graduation%'
    group by c.user_id having count(*) >= 20
  ) then
    insert into public.achievements (user_id, name) values (p_user_id, 'Graduation Hero')
    on conflict (user_id, name) do nothing;
  end if;
end;
$$;

create or replace function public.trg_check_achievements_xp()
returns trigger
language plpgsql
as $$
begin
  perform public.check_achievements(new.user_id);
  return new;
end;
$$;

drop trigger if exists check_achievements_on_xp on public.xp_history;
create trigger check_achievements_on_xp
  after insert on public.xp_history
  for each row execute function public.trg_check_achievements_xp();

drop trigger if exists check_achievements_on_completion on public.task_completions;
create trigger check_achievements_on_completion
  after insert or update on public.task_completions
  for each row execute function public.trg_check_achievements_xp();

-- backfill once for existing data
do $$
declare u record;
begin
  for u in select id from public.users loop
    perform public.check_achievements(u.id);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- RLS: seasons are shared read-only (no player writes; admin manages via SQL)
-- ----------------------------------------------------------------------------

alter table public.seasons enable row level security;
create policy "read_all_seasons" on public.seasons for select to authenticated using (true);
