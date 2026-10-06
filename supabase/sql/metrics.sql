-- APP USAGE, ONE ROW PER WEEK (MONDAY, LISBON TIME), NEWEST FIRST. READ IN THE SUPABASE SQL EDITOR: select * from weekly_metrics;
-- RUN IN THE SUPABASE SQL EDITOR; THIS FILE IS THE RECORD OF WHAT'S LIVE
-- A PLAYER IS A REGISTERED ACCOUNT OR, FOR A VISITOR, A DEVICE — SO A VISITOR ON TWO PHONES COUNTS TWICE (AN UPPER BOUND).
-- WALK-INS ONLY: BOOKINGS NEED REGISTRATION, WHICH ISN'T LIVE YET
create or replace view public.weekly_metrics
with (security_invoker = true)
as
with real_games as (
	select coalesce(player_id::text, device_id::text) as player, court_id,
		date_trunc('week', started_at at time zone 'Europe/Lisbon')::date as week
	from walk_ins
	-- NOT REAL PLAY: THE CHART GENERATOR'S DEVICE, THE TEST GAMES ON COURTS 1, 2 AND 8 BEFORE GOING LIVE, AND MIS-TAPS
	-- (10 MIN OR LESS, THE SAME CUT AS games_xp)
	where device_id::text not like '00000000%'
		and not (court_id in (1, 2, 8) and started_at < timestamptz '2026-09-22 00:00 Europe/Lisbon')
		and coalesce(manual_finished_at, ends_at) - started_at >= interval '10 minutes 30 seconds'
		and started_at < now()
),
first_weeks as (
	select player, min(week) as first_week from real_games group by player
)
select g.week,
	count(*) as games,
	count(distinct g.player) as players,
	count(distinct g.player) filter (where f.first_week = g.week) as new_players,
	-- PLAYED IN AN EARLIER WEEK TOO: THE RETENTION NUMBER
	count(distinct g.player) filter (where f.first_week < g.week) as returning_players,
	count(distinct g.court_id) as courts_used,
	-- LAST, SO create or replace CAN ADD IT TO THE LIVE VIEW (IT ONLY APPENDS COLUMNS)
	string_agg(distinct c.name, ', ' order by c.name) as courts
from real_games g
join first_weeks f using (player)
join courts c on c.id = g.court_id
group by g.week
order by g.week desc;

-- FOR THE DASHBOARD ONLY: THE API (anon / authenticated) MUST NOT EXPOSE USAGE NUMBERS
revoke all on public.weekly_metrics from anon, authenticated;
