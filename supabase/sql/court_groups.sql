-- WHAT AN ADMIN MAY CHANGE ON THEIR GROUP. RUN IN THE SUPABASE SQL EDITOR; THIS FILE IS THE RECORD OF WHAT'S LIVE
-- RLS ALREADY LIMITS UPDATES TO THE GROUP'S OWN ADMIN; THESE GRANTS LIMIT WHICH COLUMNS. ONLY THE RULES THE DASHBOARD EDITS
-- (admin.js, .rule-input) — NEVER name (SET BY US IN SUPABASE) OR admin_id (WHICH WOULD HAND THE GROUP TO SOMEONE ELSE).
-- A COLUMN GRANT DOES NOTHING WHILE THE TABLE-WIDE ONE STANDS, SO THAT GOES FIRST. A NEW RULE COLUMN NEEDS ADDING HERE
revoke update on public.court_groups from anon, authenticated;
grant update (slot_duration_minutes, price_per_slot_cents, min_game_duration_minutes, pass_duration_months)
	on public.court_groups to authenticated;
