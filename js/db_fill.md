# Faux reservation seeding (Supabase)

## Status

- [x] Step 1 — `seed_faux_reservations()` created
- [x] Step 2 — court IDs collected: `1–8, 10–31` (no court 9)
- [x] Step 3 — 14-day backfill run for all courts above
- [x] Step 4 — `daily_reservation_topup()` created (same court list)
- [x] Step 5 — `daily-reservation-topup` cron job scheduled (00:05 daily)

Purpose: the hourly occupancy chart on the court page (`loadHourlyChart()` in
[court.js](court.js)) falls back to `Math.random()` placeholder values when a
court has no real reservation history yet. This doc describes how to replace
that placeholder with real rows in the `reservations` table, so the chart
renders from actual (faux but structurally realistic) data instead.

All faux rows use a fixed, non-real `device_id` so they can always be found
and removed independently of genuine player check-ins:

```
00000000-0000-0000-0000-000000000001
```

## How the chart reads this data

- `loadHourlyChart()` queries `reservations` for a given `court_id` where
  `started_at >= now - DAYS` (`DAYS = 15`, see [court.js:479](court.js#L479)).
- It buckets fractional hour-overlap into weekday vs. weekend accumulators,
  then divides by the number of weekday/weekend days in the window to get a
  0–1 occupancy rate per hour (10h–19h).
- If the query returns zero rows, it falls back to random placeholder values
  (`if (!hasData)` block). Seeding real rows removes the need for that
  fallback on a given court.

## Critical safety rule: never seed "today"

`fetchActiveReservation()` (used to show a court as occupied/available)
filters on `ends_at > now`. Any seeded row whose `ends_at` lands in the
future will make the court appear **occupied** and block real players from
checking in until that faux time passes.

**Rule: only ever insert faux reservations for a date that has already fully
elapsed** (yesterday or earlier, never today or later). Every script below
follows this rule — do not modify them to include `CURRENT_DATE` (day 0).

## Step 1 — one-time setup: create the seeding function

Run once in the Supabase SQL Editor. Generates two sessions for a given
court + date, following a weekday/weekend peak-hour pattern (weekday:
afternoon peak ~16–19h; weekend: morning peak ~10–12h + afternoon peak
~15–18h), with some randomness for variety. Skips a date that's already been
seeded for that court, so it's safe to re-run.

```sql
CREATE OR REPLACE FUNCTION seed_faux_reservations(
  p_court_id  INT,
  p_date      DATE,
  p_device_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'
) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  v_dow    INT := EXTRACT(DOW FROM p_date)::INT;  -- 0=Sun, 6=Sat
  v_start1 NUMERIC; v_dur1 NUMERIC;
  v_start2 NUMERIC; v_dur2 NUMERIC;
BEGIN
  IF EXISTS (
    SELECT 1 FROM reservations
    WHERE court_id = p_court_id AND device_id = p_device_id
      AND started_at::date = p_date
  ) THEN
    RETURN; -- already seeded, don't duplicate
  END IF;

  IF v_dow IN (0, 6) THEN
    -- weekend: morning peak + afternoon peak
    v_start1 := 10 + random() * 1.5; v_dur1 := 1 + random();
    v_start2 := 15 + random() * 2;   v_dur2 := 1 + random();
  ELSE
    -- weekday: afternoon peak + occasional off-peak session
    v_start1 := 16 + random() * 2;   v_dur1 := 1 + random();
    v_start2 := 10 + random() * 3;   v_dur2 := 0.5 + random() * 0.5;
  END IF;

  INSERT INTO reservations (court_id, started_at, ends_at, device_id) VALUES
    (p_court_id, p_date + make_interval(mins => round(v_start1*60)::int),
                 p_date + make_interval(mins => round((v_start1+v_dur1)*60)::int), p_device_id),
    (p_court_id, p_date + make_interval(mins => round(v_start2*60)::int),
                 p_date + make_interval(mins => round((v_start2+v_dur2)*60)::int), p_device_id);
END;
$$;
```

## Step 2 — find your court IDs

```sql
SELECT id, name FROM courts ORDER BY id;
```

Copy the list of IDs you want to seed. You'll paste this list into both the
one-time backfill (step 3) and the daily top-up function (step 4).

## Step 3 — one-time backfill (last 14 full days)

Run once. Populates day −14 through day −1 for every court in the list —
**never day 0 (today)**. Combined with the `DAYS = 15` window in
[court.js:479](court.js#L479), this leaves today with (correctly) zero data
and 14 days of history behind it.

```sql
DO $$
DECLARE
  cids INT[] := ARRAY[1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31];
  cid INT; i INT;
BEGIN
  FOREACH cid IN ARRAY cids LOOP
    FOR i IN 1..14 LOOP
      PERFORM seed_faux_reservations(cid, CURRENT_DATE - i);
    END LOOP;
  END LOOP;
END $$;
```

## Step 4 — daily top-up + prune function

Because the chart's window is a rolling 15 days, seeded data ages out and
needs to be refreshed daily, or the chart reverts to the random placeholder
once the 14-day backfill scrolls out of range. This function:

1. **Prunes** faux rows about to fall outside the 15-day window (keeps the
   `reservations` table from growing forever).
2. **Adds** one new day of faux data — always for **yesterday**
   (`CURRENT_DATE - 1`), which by the time this runs is safely in the past,
   so it can never trigger the "court is occupied" bug described above.

```sql
CREATE OR REPLACE FUNCTION daily_reservation_topup() RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  faux_device UUID := '00000000-0000-0000-0000-000000000001';
  -- court 9 intentionally excluded (does not exist)
  -- ← remove an ID here to stop seeding that court going forward.
  --   existing faux rows for it are NOT deleted immediately — they
  --   just age out naturally via the prune step above, or you can
  --   delete them immediately (see "Removing a court" below).
  cids INT[] := ARRAY[1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31];
  cid INT;
BEGIN
  DELETE FROM reservations
  WHERE device_id = faux_device
    AND started_at < now() - interval '15 days';

  FOREACH cid IN ARRAY cids LOOP
    PERFORM seed_faux_reservations(cid, CURRENT_DATE - 1, faux_device);
  END LOOP;
END;
$$;
```

Re-run this `CREATE OR REPLACE FUNCTION` any time you edit the `cids` array
(e.g. adding a new court, or removing one) — no need to touch the cron
schedule itself, since it calls the function by name.

## Step 5 — schedule the daily top-up

Requires the `pg_cron` extension. In the Supabase dashboard: **Database →
Extensions**, enable `pg_cron` if not already on. Then either use
**Database → Cron Jobs** in the dashboard UI, or run:

```sql
SELECT cron.schedule(
  'daily-reservation-topup',
  '5 0 * * *',   -- 00:05 daily, in the Postgres server's timezone (usually UTC)
  $$ SELECT daily_reservation_topup(); $$
);
```

To check it's registered or to remove/replace it later:

```sql
SELECT * FROM cron.job;                    -- list scheduled jobs
SELECT cron.unschedule('daily-reservation-topup'); -- remove it
```

## Removing a court from seeding

1. Edit the `cids` array in `daily_reservation_topup()` (step 4) and
   `CREATE OR REPLACE` it again — stops *future* seeding for that court.
2. To delete that court's existing faux data immediately (e.g. real usage
   has started there and you don't want faux rows mixed in):

```sql
DELETE FROM reservations
WHERE court_id = <id>
  AND device_id = '00000000-0000-0000-0000-000000000001';
```

## Wiping all faux data (full rollback)

```sql
DELETE FROM reservations
WHERE device_id = '00000000-0000-0000-0000-000000000001';

SELECT cron.unschedule('daily-reservation-topup');
DROP FUNCTION IF EXISTS daily_reservation_topup();
DROP FUNCTION IF EXISTS seed_faux_reservations(INT, DATE, UUID);
```

After this, any court with no real reservations reverts to the
`Math.random()` placeholder in `loadHourlyChart()` until real check-ins
accumulate or this is re-run.

## Known caveat: timezone drift

`seed_faux_reservations()` builds timestamps as `p_date + interval`, which
uses the Postgres server's timezone (usually UTC). The chart reads hour-of-day
client-side via JS `Date.getHours()`, in the visitor's local timezone.
Portugal is UTC+0 (WET) or UTC+1 (WEST) depending on daylight saving, so peak
hours in the chart may appear shifted by up to an hour around DST transitions
(late March / late October). Not a functional bug — worth a visual sanity
check on the chart after seeding, especially near those dates.
