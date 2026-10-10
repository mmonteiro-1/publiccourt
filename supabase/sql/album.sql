-- THE ALBUM'S LEVEL CARDS: ONE ROW PER LEVEL A PLAYER HAS REACHED, WRITTEN ONCE AND NEVER CHANGED — "COLLECTED = YOURS
-- FOREVER", WHATEVER HAPPENS TO THE XP THRESHOLDS LATER. RUN IN THE SUPABASE SQL EDITOR; THIS FILE IS THE RECORD OF WHAT'S
-- LIVE, SO KEEP IT IN SYNC WHEN SOMETHING CHANGES

-- kind SAYS WHAT KIND OF CARD, ref WHICH ONE: level → THE LEVEL NUMBER. MORE KINDS LATER (A DIAMOND, A SEASON TITLE).
-- THE CROMO CARD HAS NO ROW: IT'S profiles.onboarded_at
create table if not exists public.collected_cards (
	player_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
	kind text not null,
	ref text not null,
	collected_at timestamptz not null,
	primary key (player_id, kind, ref)
);

-- PLAYERS READ THEIR OWN; NOBODY WRITES DIRECTLY — ONLY my_collected_cards (security definer) INSERTS
alter table public.collected_cards enable row level security;

drop policy if exists "Players read own collected cards" on public.collected_cards;
create policy "Players read own collected cards" on public.collected_cards
	for select using (auth.uid() = player_id);

-- WHAT THE PROFILE CALLS ON LOAD: FIRST ADDS A ROW FOR EVERY LEVEL REACHED WITHOUT ONE, THEN RETURNS THE PLAYER'S CARDS, OLDEST
-- FIRST. ONLY FOR PLAYERS WHO FINISHED THE ONBOARDING (THE ALBUM STARTS AT THE DEBUT); NOTHING FOR VISITORS.
-- A LEVEL IS REACHED AT THE END OF THE FIRST GAME WHERE THE RUNNING XP TOTAL CROSSES ITS START: games_xp GIVES EACH GAME ITS XP
-- FROM THE GAMES BEFORE IT ONLY, SO THE TOTAL IN TIME ORDER IS THE XP THE PLAYER HAD THEN. LEVEL n STARTS AT
-- 1500(n − 1) + 250n(n − 1) — XP_LEVEL_ENDS IN utils.js (2000, 4500 … 36000); KEEP THEM IN STEP. LEVEL 1 IS THE DEBUT.
-- A LEVEL REACHED BEFORE THE DEBUT (A VISITOR'S WALK-INS, CLAIMED ON LOGIN) IS COLLECTED AT THE DEBUT: THERE WAS NO
-- ALBUM BEFORE IT. RUN FOR AN EXISTING PLAYER, THE FIRST CALL IS THE BACKFILL — IT FILLS IN EVERY LEVEL THEIR HISTORY SHOWS
create or replace function public.my_collected_cards()
returns setof public.collected_cards
language plpgsql security definer set search_path = public
as $$
declare
	debut timestamptz;
begin
	select onboarded_at into debut from profiles where id = auth.uid();
	if debut is null then
		return;
	end if;

	insert into collected_cards (player_id, kind, ref, collected_at)
	select auth.uid(), 'level', level::text, greatest(reached_at, debut)
	from (
		select 1 as level, debut as reached_at
		union all
		select s.n, min(g.end_at)
		from generate_series(2, 10) as s (n)
		join (
			select end_at, sum(xp) over (order by start_at, end_at rows unbounded preceding) as total
			from games_xp(auth.uid(), null)
		) g on g.total >= 1500 * (s.n - 1) + 250 * s.n * (s.n - 1)
		group by s.n
	) levels
	on conflict do nothing;

	return query
		select * from collected_cards
		where player_id = auth.uid()
		-- length FIRST, SO LEVEL 10 COMES AFTER 9 WITHOUT CASTING ref (A DIAMOND'S ref WON'T BE A NUMBER)
		order by collected_at, kind, length(ref), ref;
end;
$$;

revoke execute on function public.my_collected_cards() from public, anon;
grant execute on function public.my_collected_cards() to authenticated;
