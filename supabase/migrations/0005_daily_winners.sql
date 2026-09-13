-- Quest Duo — Daily Winner history + atomic award.
-- Replaces the client-side "check then write" bonus (which could double-award
-- under React StrictMode / concurrent inits) with a DB-atomic award keyed on
-- the winner's date. Also satisfies the spec's "store winner history".

create table if not exists public.daily_winners (
  date        date primary key,
  user_id     text not null references public.users(id) on delete cascade,
  xp          int  not null default 0,
  bonus_xp    int  not null default 50,
  created_at  timestamptz not null default now()
);

alter table public.daily_winners enable row level security;
create policy "read_all_daily_winners" on public.daily_winners for select to authenticated using (true);

-- Atomically records the winner for p_date and, if this is the first time the
-- day is recorded, awards the bonus XP + 'Daily Winner' achievement.
-- Returns the recorded winner (whether or not this call awarded it).
create or replace function public.award_daily_winner(p_date date)
returns table(winner_id text, winner_xp int, newly_awarded boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  w_id text;
  w_xp int;
  did_insert boolean := false;
  new_total int;
  new_level int;
begin
  -- Winner = most quest-XP earned on p_date (bonuses excluded from the contest).
  select user_id, total into w_id, w_xp
  from (
    select user_id, sum(amount) as total
    from public.xp_history
    where created_at::date = p_date
      and amount > 0
      and reason not ilike 'Daily Winner Bonus%'
    group by user_id
    order by sum(amount) desc, user_id
    limit 1
  ) t;

  if w_id is null then
    return query select null::text, 0, false;
    return;
  end if;

  insert into public.daily_winners (date, user_id, xp)
  values (p_date, w_id, w_xp)
  on conflict (date) do nothing;
  get diagnostics did_insert = row_count;

  if did_insert then
    -- award the bonus once
    insert into public.xp_history (user_id, amount, reason)
    values (w_id, 50, format('Daily Winner Bonus (%s)', p_date));

    select xp into new_total from public.users where id = w_id;
    new_level := floor(new_total / 100.0) + 1;

    update public.users
    set xp = new_total,
        level = new_level,
        title = case
          when new_level >= 20 then 'Legend'
          when new_level >= 15 then 'Champion'
          when new_level >= 10 then 'Veteran'
          when new_level >= 5  then 'Adventurer'
          else 'Novice' end
    where id = w_id;

    insert into public.achievements (user_id, name)
    values (w_id, 'Daily Winner')
    on conflict (user_id, name) do nothing;
  end if;

  return query select w_id, w_xp, did_insert;
end;
$$;

-- ----------------------------------------------------------------------------
-- Reconcile existing data: the client double-awarded 2026-07-09's bonus.
-- Keep one, drop the duplicate, backfill the winners table so the new atomic
-- function treats past days as already-awarded.
-- ----------------------------------------------------------------------------

-- Remove exactly one duplicate 2026-07-09 bonus row (keep the earliest).
delete from public.xp_history
where id in (
  select id from public.xp_history
  where reason = 'Daily Winner Bonus (2026-07-09)'
  order by created_at
  offset 1
);

-- Recompute each user's xp/level/title from their full history so totals match.
do $$
declare u record; total int; lvl int;
begin
  for u in select id from public.users loop
    select coalesce(sum(amount), 0) into total from public.xp_history where user_id = u.id;
    total := greatest(total, 0);
    lvl := floor(total / 100.0) + 1;
    update public.users
    set xp = total, level = lvl,
        title = case
          when lvl >= 20 then 'Legend'
          when lvl >= 15 then 'Champion'
          when lvl >= 10 then 'Veteran'
          when lvl >= 5  then 'Adventurer'
          else 'Novice' end
    where id = u.id;
  end loop;
end $$;

-- Backfill winners table for days already paid out (idempotent).
insert into public.daily_winners (date, user_id, xp)
select * from (
select d.day,
       (select h.user_id from public.xp_history h
        where h.created_at::date = d.day and h.amount > 0 and h.reason not ilike 'Daily Winner Bonus%'
        group by h.user_id order by sum(h.amount) desc, h.user_id limit 1),
       (select sum(h.amount) from public.xp_history h
        where h.created_at::date = d.day and h.amount > 0 and h.reason not ilike 'Daily Winner Bonus%'
        group by h.user_id order by sum(h.amount) desc, h.user_id limit 1)
from (values (date '2026-07-08'), (date '2026-07-09')) as d(day)
) w(day, user_id, xp)
where w.user_id is not null  -- fresh DB has no history to backfill
on conflict (date) do nothing;
