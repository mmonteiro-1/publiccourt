-- THE SEASON RANKING. RUN IN THE SUPABASE SQL EDITOR; THIS FILE IS THE RECORD OF WHAT'S LIVE

-- OPT-OUT, NOT OPT-IN: EVERY REGISTERED PLAYER IS RANKED UNLESS THEY HIDE THEMSELVES FROM DADOS.
-- THE EXISTING "PLAYERS UPDATE OWN" POLICY ON profiles ALREADY LETS THEM SAVE IT
alter table public.profiles add column if not exists hide_from_ranking boolean not null default false;

-- SEASONS FOLLOW THE OUTDOOR TENNIS YEAR, IN LISBON TIME: ÉPOCA DE VERÃO (APR–SEP) AND ÉPOCA DE INVERNO (OCT–MAR, SO IT
-- STARTS IN ONE YEAR AND ENDS IN THE NEXT). FIXED, NOT ROLLING, SO A SEASON ENDS AND HAS A WINNER
create or replace function public.season_start(p_at timestamptz default now())
returns date
language sql stable
as $$
	select case
		when extract(month from d) between 4 and 9 then make_date(extract(year from d)::int, 4, 1)
		when extract(month from d) >= 10 then make_date(extract(year from d)::int, 10, 1)
		else make_date(extract(year from d)::int - 1, 10, 1)
	end
	from (select (p_at at time zone 'Europe/Lisbon')::date as d) t;
$$;

-- THE SEASON TABLE (THE CURRENT ONE, OR THE ONE STARTING ON p_start). SEASON POINTS ARE THE SLICE OF XP EARNED INSIDE THE
-- SEASON — THE SAME games_xp AND pass_awards AS THE TRADING CARD, ONLY FILTERED BY DATE — SO IN A PLAYER'S FIRST SEASON THE
-- TWO NUMBERS ARE EQUAL. ONLY AGGREGATES LEAVE: A "R. BARBOSA" NAME, THE POINTS AND THE PLACE, NEVER IDS, COURTS OR TIMES.
-- is_me LETS THE APP FIND THE PLAYER WITHOUT SEEING ANYONE'S ID. ref TELLS PLAYERS APART ACROSS TWO LOOKS AT THE BOARD (WHO
-- PASSED WHOM) WITHOUT BEING AN ID: A HASH OF THE PLAYER AND THE SEASON, SO IT CHANGES EVERY SEASON AND CAN'T BE TRACED BACK.
-- DROPPED FIRST BECAUSE ADDING ref CHANGES WHAT IT RETURNS, WHICH create or replace CAN'T DO
drop function if exists public.season_ranking(date);
create function public.season_ranking(p_start date default null)
returns table (place int, name text, points int, is_me boolean, ref text)
language sql stable security definer set search_path = public
as $$
with season as (
	select s as start_on,
		(s::timestamp at time zone 'Europe/Lisbon') as from_at,
		((s + interval '6 months')::timestamp at time zone 'Europe/Lisbon') as to_at
	from (select coalesce(p_start, season_start(now())) as s) t
),
-- EVERY REGISTERED PLAYER, OPT-OUT RATHER THAN OPT-IN; ADMINS DON'T PLAY HERE
players as (
	select p.id, trim(p.name) as name
	from profiles p
	where not p.hide_from_ranking
		and not exists (select 1 from court_groups g where g.admin_id = p.id)
),
-- TARIMBA (LIFETIME WHOLE HOURS, AS THE SKILL CARD SHOWS IT) ONLY BREAKS TIES; IT ISN'T RETURNED
scored as (
	select pl.id, pl.name, s.start_on,
		coalesce(sum(g.xp) filter (where g.start_at >= s.from_at and g.start_at < s.to_at), 0)
			+ 3000 * (select count(*) from pass_awards a where a.player_id = pl.id and a.awarded_at >= s.from_at and a.awarded_at < s.to_at)
			as points,
		floor(coalesce(extract(epoch from sum(g.end_at - g.start_at)), 0) / 3600) as tarimba
	from players pl
	cross join season s
	left join lateral games_xp(pl.id, null) g on true
	group by pl.id, pl.name, s.start_on, s.from_at, s.to_at
)
-- EQUAL POINTS AND EQUAL TARIMBA SHARE THE PLACE (1, 2, 2, 4). A ONE-WORD NAME IS SHOWN AS IT IS
select rank() over (order by points desc, tarimba desc)::int as place,
	case when name !~ '\s' then name
		else upper(left(name, 1)) || '. ' || regexp_replace(name, '^.*\s', '') end as name,
	points::int,
	id = auth.uid() as is_me,
	md5(id::text || start_on::text) as ref
from scored
order by place, name;
$$;

revoke execute on function public.season_ranking(date) from public, anon;
grant execute on function public.season_ranking(date) to authenticated;

-- THE BOARD AS EACH PLAYER LAST SAW IT, ONE ROW PER SEASON, OVERWRITTEN AFTER EVERY UPDATE HAS PLAYED. THE NEXT VISIT COMPARES
-- IT WITH THE LIVE RANKING AND ANIMATES THE DIFFERENCE (XP GAINED, PLAYERS PASSED), SO EACH CHANGE PLAYS ONCE — ON ANY DEVICE.
-- board HOLDS ONLY WHAT season_ranking ALREADY SHOWED THEM: PLACES, "R. BARBOSA" NAMES, POINTS, refs
create table if not exists public.ranking_views (
	player_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	season_start date not null,
	board jsonb not null,
	seen_at timestamptz not null default now(),
	primary key (player_id, season_start)
);

alter table public.ranking_views enable row level security;

drop policy if exists "Players read own ranking views" on public.ranking_views;
create policy "Players read own ranking views" on public.ranking_views
	for select to authenticated using (player_id = auth.uid());

drop policy if exists "Players save own ranking views" on public.ranking_views;
create policy "Players save own ranking views" on public.ranking_views
	for insert to authenticated with check (player_id = auth.uid());

drop policy if exists "Players update own ranking views" on public.ranking_views;
create policy "Players update own ranking views" on public.ranking_views
	for update to authenticated using (player_id = auth.uid()) with check (player_id = auth.uid());
