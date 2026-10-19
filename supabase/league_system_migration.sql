-- ============================================================
-- ELITE KANNADIGA — LEAGUE SYSTEM (seasons, schedules, wheel,
-- results & standings)
-- Run this in the Supabase SQL Editor:
-- Dashboard → SQL Editor → New query → paste → Run
-- Safe to re-run.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. SEASONS
-- ------------------------------------------------------------
create table if not exists public.league_seasons (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  season_number integer not null check (season_number >= 1),
  name text not null,
  matches_per_team integer not null default 5 check (matches_per_team between 1 and 20),
  win_points integer not null default 3 check (win_points >= 1),
  current_round integer not null default 1 check (current_round >= 1),
  status text not null default 'active' check (status in ('draft', 'active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, season_number)
);

-- ------------------------------------------------------------
-- 2. SEASON TEAMS (snapshot of tournament registrations)
-- ------------------------------------------------------------
create table if not exists public.league_season_teams (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.league_seasons(id) on delete cascade,
  registration_id uuid not null references public.tournament_registrations(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'excluded', 'withdrawn')),
  created_at timestamptz not null default now(),
  unique (season_id, registration_id)
);

-- ------------------------------------------------------------
-- 3. PAIRINGS (the full schedule is generated up-front)
-- status:
--   scheduled -> pre-generated, waiting to be revealed on the wheel
--   locked    -> confirmed by the admin, label written to DB
--   completed -> a result has been recorded
--   cancelled -> removed from the wheel / team excluded
-- ------------------------------------------------------------
create table if not exists public.league_pairings (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.league_seasons(id) on delete cascade,
  round_number integer not null check (round_number >= 1),
  match_number integer not null check (match_number >= 1),
  team_a_id uuid not null references public.tournament_registrations(id) on delete cascade,
  team_b_id uuid not null references public.tournament_registrations(id) on delete cascade,
  status text not null default 'scheduled' check (status in ('scheduled', 'locked', 'completed', 'cancelled')),
  label text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint league_pairings_distinct_teams check (team_a_id <> team_b_id),
  unique (season_id, round_number, match_number)
);

-- One unordered pair may only exist once per season (cancelled rows excluded).
create unique index if not exists league_pairings_unique_opponents
  on public.league_pairings (
    season_id,
    least(team_a_id, team_b_id),
    greatest(team_a_id, team_b_id)
  )
  where status <> 'cancelled';

-- ------------------------------------------------------------
-- 4. MATCH RESULTS
-- ------------------------------------------------------------
create table if not exists public.league_match_results (
  id uuid primary key default gen_random_uuid(),
  pairing_id uuid not null unique references public.league_pairings(id) on delete cascade,
  season_id uuid not null references public.league_seasons(id) on delete cascade,
  team_a_score integer not null default 0 check (team_a_score >= 0),
  team_b_score integer not null default 0 check (team_b_score >= 0),
  team_a_rounds_lost integer not null default 0 check (team_a_rounds_lost >= 0),
  team_b_rounds_lost integer not null default 0 check (team_b_rounds_lost >= 0),
  winner_id uuid not null references public.tournament_registrations(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. INDEXES
-- ------------------------------------------------------------
create index if not exists idx_league_pairings_season_round
  on public.league_pairings (season_id, round_number);
create index if not exists idx_league_pairings_season_status
  on public.league_pairings (season_id, status);
create index if not exists idx_league_season_teams_season
  on public.league_season_teams (season_id);
create index if not exists idx_league_results_season
  on public.league_match_results (season_id);

-- ------------------------------------------------------------
-- 6. VALIDATION TRIGGERS
-- ------------------------------------------------------------

-- Keep updated_at fresh.
create or replace function public.league_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_league_seasons_updated on public.league_seasons;
create trigger trg_league_seasons_updated
  before update on public.league_seasons
  for each row execute function public.league_touch_updated_at();

drop trigger if exists trg_league_pairings_updated on public.league_pairings;
create trigger trg_league_pairings_updated
  before update on public.league_pairings
  for each row execute function public.league_touch_updated_at();

drop trigger if exists trg_league_results_updated on public.league_match_results;
create trigger trg_league_results_updated
  before update on public.league_match_results
  for each row execute function public.league_touch_updated_at();

-- Enforce all pairing rules in the database.
create or replace function public.validate_league_pairing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season public.league_seasons%rowtype;
  v_count integer;
begin
  select * into v_season from public.league_seasons where id = new.season_id;
  if not found then
    raise exception 'SEASON_NOT_FOUND';
  end if;

  -- Cancelled rows are kept for history and skip every rule.
  if new.status <> 'cancelled' then
    -- Status-only changes (lock/unlock/complete) must never be blocked by a
    -- team being excluded later. Only re-validate when the teams or round
    -- actually change.
    if tg_op = 'UPDATE'
       and old.status in ('locked', 'completed')
       and new.status in ('locked', 'completed')
       and new.team_a_id = old.team_a_id
       and new.team_b_id = old.team_b_id
       and new.round_number = old.round_number then
      return new;
    end if;

    if new.round_number < 1 or new.round_number > (v_season.matches_per_team + 1) then
      raise exception 'BAD_ROUND';
    end if;

    if not exists (
      select 1
      from public.league_season_teams st
      join public.tournament_registrations tr on tr.id = st.registration_id
      where st.season_id = new.season_id
        and st.registration_id = new.team_a_id
        and st.status = 'active'
        and tr.tournament_id = v_season.tournament_id
    ) then
      raise exception 'TEAM_A_NOT_ACTIVE';
    end if;

    if not exists (
      select 1
      from public.league_season_teams st
      join public.tournament_registrations tr on tr.id = st.registration_id
      where st.season_id = new.season_id
        and st.registration_id = new.team_b_id
        and st.status = 'active'
        and tr.tournament_id = v_season.tournament_id
    ) then
      raise exception 'TEAM_B_NOT_ACTIVE';
    end if;

    -- A team cannot appear twice in the same round.
    select count(*) into v_count
    from public.league_pairings p
    where p.season_id = new.season_id
      and p.round_number = new.round_number
      and p.status <> 'cancelled'
      and p.id <> new.id
      and (
        p.team_a_id in (new.team_a_id, new.team_b_id)
        or p.team_b_id in (new.team_a_id, new.team_b_id)
      );
    if v_count > 0 then
      raise exception 'TEAM_BUSY_IN_ROUND';
    end if;

    -- The same two teams can only meet once.
    select count(*) into v_count
    from public.league_pairings p
    where p.season_id = new.season_id
      and p.status <> 'cancelled'
      and p.id <> new.id
      and (
        (p.team_a_id = new.team_a_id and p.team_b_id = new.team_b_id)
        or (p.team_a_id = new.team_b_id and p.team_b_id = new.team_a_id)
      );
    if v_count > 0 then
      raise exception 'REPEAT_OPPONENT';
    end if;

    select count(*) into v_count
    from public.league_pairings p
    where p.season_id = new.season_id
      and p.status <> 'cancelled'
      and p.id <> new.id
      and (p.team_a_id = new.team_a_id or p.team_b_id = new.team_a_id);
    if v_count >= v_season.matches_per_team then
      raise exception 'MAX_MATCHES_TEAM_A';
    end if;

    select count(*) into v_count
    from public.league_pairings p
    where p.season_id = new.season_id
      and p.status <> 'cancelled'
      and p.id <> new.id
      and (p.team_a_id = new.team_b_id or p.team_b_id = new.team_b_id);
    if v_count >= v_season.matches_per_team then
      raise exception 'MAX_MATCHES_TEAM_B';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_league_pairing on public.league_pairings;
create trigger trg_validate_league_pairing
  before insert or update on public.league_pairings
  for each row execute function public.validate_league_pairing();

-- Results must reference a pairing from the same season, and the winner
-- must be one of the two teams that played.
create or replace function public.validate_league_result()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pairing public.league_pairings%rowtype;
begin
  select * into v_pairing from public.league_pairings where id = new.pairing_id;
  if not found then
    raise exception 'PAIRING_NOT_FOUND';
  end if;
  if v_pairing.status = 'cancelled' then
    raise exception 'PAIRING_CANCELLED';
  end if;
  if v_pairing.status not in ('locked', 'completed') then
    raise exception 'PAIRING_NOT_LOCKED';
  end if;
  if new.season_id <> v_pairing.season_id then
    raise exception 'SEASON_MISMATCH';
  end if;
  if new.winner_id <> v_pairing.team_a_id and new.winner_id <> v_pairing.team_b_id then
    raise exception 'WINNER_NOT_IN_PAIRING';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_league_result on public.league_match_results;
create trigger trg_validate_league_result
  before insert or update on public.league_match_results
  for each row execute function public.validate_league_result();

-- Recording a result completes the pairing; deleting it unlocks the pairing.
create or replace function public.sync_pairing_status_from_result()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    update public.league_pairings
      set status = 'locked'
      where id = old.pairing_id and status = 'completed';
    return old;
  end if;

  update public.league_pairings
    set status = 'completed'
    where id = new.pairing_id;
  return new;
end;
$$;

drop trigger if exists trg_sync_pairing_status on public.league_match_results;
create trigger trg_sync_pairing_status
  after insert or update or delete on public.league_match_results
  for each row execute function public.sync_pairing_status_from_result();

-- ------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.league_seasons enable row level security;
alter table public.league_season_teams enable row level security;
alter table public.league_pairings enable row level security;
alter table public.league_match_results enable row level security;

-- Logged-in players can read (the admin dashboard is gated anyway).
drop policy if exists "league_seasons_read" on public.league_seasons;
create policy "league_seasons_read" on public.league_seasons
  for select to authenticated using (true);

drop policy if exists "league_season_teams_read" on public.league_season_teams;
create policy "league_season_teams_read" on public.league_season_teams
  for select to authenticated using (true);

drop policy if exists "league_pairings_read" on public.league_pairings;
create policy "league_pairings_read" on public.league_pairings
  for select to authenticated using (true);

drop policy if exists "league_results_read" on public.league_match_results;
create policy "league_results_read" on public.league_match_results
  for select to authenticated using (true);

-- Only admins may write.
drop policy if exists "league_seasons_admin" on public.league_seasons;
create policy "league_seasons_admin" on public.league_seasons
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "league_season_teams_admin" on public.league_season_teams;
create policy "league_season_teams_admin" on public.league_season_teams
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "league_pairings_admin" on public.league_pairings;
create policy "league_pairings_admin" on public.league_pairings
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "league_results_admin" on public.league_match_results;
create policy "league_results_admin" on public.league_match_results
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

grant select, insert, update, delete on public.league_seasons to authenticated;
grant select, insert, update, delete on public.league_season_teams to authenticated;
grant select, insert, update, delete on public.league_pairings to authenticated;
grant select, insert, update, delete on public.league_match_results to authenticated;

-- Ask PostgREST to expose the new tables immediately.
notify pgrst, 'reload schema';
