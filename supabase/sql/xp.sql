-- XP, COMPUTED IN THE DATABASE SO THE TRADING CARD AND THE RANKING READ ONE DEFINITION. RUN IN THE SUPABASE SQL EDITOR;
-- THIS FILE IS THE RECORD OF WHAT'S LIVE, SO KEEP IT IN SYNC WHEN A FUNCTION CHANGES

-- EVERY COUNTED GAME OF ONE PLAYER (OR ONE VISITOR'S DEVICE) WITH THE XP IT EARNED. THE ONE DEFINITION OF A COUNTED GAME:
-- THE PROFILE, AND LATER THE RANKING, BOTH READ IT, SO THE XP RULES LIVE ONLY HERE
create or replace function public.games_xp(p_player uuid, p_device uuid)
returns table (kind text, court_id int8, start_at timestamptz, end_at timestamptz, xp int)
language sql stable security definer set search_path = public
as $$
with raw as (
	select 'walk_in'::text as kind, w.id, w.court_id::int8 as court_id, w.started_at as start_at,
		-- A WALK-IN STOPPED EARLY STILL CARRIES ITS ORIGINAL (FUTURE) ends_at, SO manual_finished_at WINS
		coalesce(w.manual_finished_at, w.ends_at) as end_at
	from walk_ins w
	where (p_player is not null and w.player_id = p_player)
		or (p_player is null and w.device_id = p_device and w.player_id is null)
	union all
	select 'booking', b.id, b.court_id, b.start_at, b.end_at
	from bookings b
	where p_player is not null and b.player_id = p_player and b.status = 'confirmed'
),
-- PAST ONLY; 10 MIN OR LESS IS A MIS-TAP (10:30 MATCHES THE JS, WHICH ROUNDED TO WHOLE MINUTES)
counted as (
	select *, date_trunc('week', start_at at time zone 'Europe/Lisbon') as week
	from raw
	where end_at < now() and end_at - start_at >= interval '10 minutes 30 seconds'
),
-- A COURT'S BONUS GOES TO ITS FIRST GAME, A STREAK WEEK'S TO THE WEEK'S FIRST GAME
flagged as (
	select *,
		row_number() over (partition by court_id order by start_at, id) = 1 as new_court,
		row_number() over (partition by week order by start_at, id) = 1 as first_of_week
	from counted
)
select f.kind, f.court_id, f.start_at, f.end_at,
	500 * (1 + f.new_court::int
		+ (f.first_of_week and exists (select 1 from counted p where p.week = f.week - interval '7 days'))::int) as xp
from flagged f
order by f.start_at desc;
$$;

-- WHAT THE APP CALLS: A PLAYER ONLY EVER GETS THEIR OWN GAMES; A VISITOR (NO SESSION) GETS THEIR DEVICE'S UNCLAIMED WALK-INS,
-- WHICH walk_ins' OPEN RLS ALREADY EXPOSES ANYWAY
create or replace function public.my_games_xp(p_device uuid default null)
returns table (kind text, court_id int8, start_at timestamptz, end_at timestamptz, xp int)
language sql stable security definer set search_path = public
as $$
	select * from games_xp(auth.uid(), case when auth.uid() is null then p_device end);
$$;

-- THE TRADING CARD'S NUMBER: EVERY COUNTED GAME'S XP. THE +1000 PER PASS IS POSTPONED ("EM BREVE") — pass_awards KEEPS
-- RECORDING, SO ADDING `+ 1000 * (select count(*) from pass_awards where p_player is not null and player_id = p_player)`
-- BACK PAYS EVERY PASS EVER APPROVED
create or replace function public.player_xp(p_player uuid, p_device uuid)
returns int
language sql stable security definer set search_path = public
as $$
	select coalesce((select sum(xp) from games_xp(p_player, p_device)), 0)::int;
$$;

-- WHAT THE APP CALLS, SCOPED LIKE my_games_xp
create or replace function public.my_xp(p_device uuid default null)
returns int
language sql stable security definer set search_path = public
as $$
	select player_xp(auth.uid(), case when auth.uid() is null then p_device end);
$$;

-- games_xp AND player_xp TAKE ANY PLAYER, SO ONLY THE my_* WRAPPERS (AND LATER THE RANKING) MAY CALL THEM
revoke execute on function public.games_xp(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.player_xp(uuid, uuid) from public, anon, authenticated;
grant execute on function public.my_games_xp(uuid) to anon, authenticated;
grant execute on function public.my_xp(uuid) to anon, authenticated;
