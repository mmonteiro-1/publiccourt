# Campo Livre

PWA for finding and booking public tennis courts in Portugal (Aveiro region). No build system — vanilla HTML/CSS/JS + Supabase backend.

## Stack

- **Frontend:** Vanilla HTML + CSS + JS (no framework, no bundler)
- **Backend:** Supabase (`js/config.js` — shared `db` client used by every page)
- **Hosting:** Vercel (`vercel.json`)
- **PWA:** `manifest.json` + `service-worker.js`

## File Map

```
index.html / js/court-list.js     — court discovery list
court.html / js/court-stage.js    — court detail + walk-in flow
                js/court-walkin.js
                js/court-bookable.js  — bookable court flow (active)
owner.html / js/owner.js          — owner dashboard (members, rules, hours)
login.html / js/login.js
profile.html / js/profile.js
info.html

js/utils.js           — shared helpers: setEmptyState, formatTime, minutesLeft, getDeviceId, cityHtml
js/secondary-card.js  — secondary info card (rules, hours, city)
js/slot-picker.js     — booking slot selection UI
js/config.js          — Supabase credentials + db client
css/styles.css        — single global stylesheet
images/               — SVG icons (icon_*.svg) + flags + pig mascot
```

## Current Work

Branch: `bookable-mvp` — building the court booking flow for courts that require membership and slot reservations. Recent work: standardized copy on court-bookable, membership button with `icon_asking.svg`, owner rules view, empty state utilities.

## Working Style

- Break every non-trivial prompt into a todo list before starting — tackle one item at a time
- Don't build multiple things at once; confirm each step before moving to the next
- When ideating: propose ideas, then ask before writing them to CLAUDE.md — don't commit half-formed ideas to the knowledge

## Rules

- **Comments:** ALL CAPS always, every file, every comment type
- **Commits:** Don't commit after small edits. Batch changes; commit only when asked or at a natural milestone — ask before committing even then
- **Screenshots:** Skip Puppeteer/screenshot verification for mechanical CSS edits. Use it only when the visual outcome is genuinely uncertain (new layout, new component, tricky CSS interaction)
- **No over-engineering:** No abstractions beyond what the task needs. No error handling for impossible cases. No comments explaining what code does — only WHY when non-obvious

### CSS Rules
- No `line-height`
- No `letter-spacing`
- No hardcoded colors — CSS variables only
- Sizes must be multiples of 5 (px, rem, etc.)
- `font-size` in `em` only, never `px`
- No custom cursors or animations invisible on mobile
- `font-weight` limited to `400` or `700` only
- Minimise classes — reuse existing ones before creating new ones

## Database Schema (Supabase)

**courts** — `id int4, name text, city text, description text, lat float8, lng float8, group_id int4, group_position int4, active bool, bookable bool, unavailable bool, missing_qr_hint int4`
- `bookable`: requires membership + slot booking (vs walk-in)
- `group_id` → `court_groups.id` (nullable for standalone courts)
- RLS: SELECT open to all; UPDATE fully open (no condition) — intentional for `missing_qr_hint` increment

**court_groups** — `id int4, name text, owner_id uuid, membership_duration_months int4, slot_duration_minutes int4, min_game_duration_minutes int4, price_per_slot_cents int4`
- `owner_id` → `auth.users.id`
- RLS: SELECT open to all; UPDATE only where `owner_id = auth.uid()`

**court_opening_hours** — `id int8, group_id int4, day_of_week int4, closed bool, open time, close time, pause_start time, pause_end time`
- One row per day (0=Sun–6=Sat); `closed` disables the day; `open`/`close`/`pause_*` are `time` type
- RLS: SELECT open to all; ALL operations gated on owner via `group_id IN (SELECT id FROM court_groups WHERE owner_id = auth.uid())`

**memberships** — `id uuid, player_id uuid, group_id int4, court_id int4, status text, denied_reason text, created_at timestamptz, approved_at timestamptz, expires_at timestamptz`
- Scope: either `group_id` OR `court_id`, never both
- `status`: `pending` | `approved` | `denied`
- `player_id` → `auth.users.id`
- RLS: players read/write own (`auth.uid() = player_id`); owners read/update via court_groups join; players can only DELETE when `status = 'denied'`; owners DELETE via group ownership

**bookings** — `id uuid, group_id int4, player_id uuid, court_id int8, start_at timestamptz, end_at timestamptz, status text, created_at timestamptz`
- `player_id` → `auth.users.id`
- RLS: players read/insert/cancel own; approved members can read all bookings for their group's courts; cancel (UPDATE) only allowed when `start_at > now()`

**walk_ins** — `id uuid, court_id int4, device_id uuid, player_name text, started_at timestamptz, ends_at timestamptz, manual_finished_at timestamptz`
- No auth — fully open RLS (SELECT/INSERT/UPDATE/DELETE all `true`)
- Active when `manual_finished_at IS NULL AND ends_at > now()`
- `player_name` is collected at walk-in time (not from profiles)

**profiles** — `id uuid, name text, phone text, nif text, created_at timestamptz`
- `id` = `auth.users.id`; created on first onboarding
- `phone` and `nif` collected but not yet used in the UI
- RLS: players read/insert own; owners can read profiles of their approved members

## Backend Services

### Supabase Edge Functions
Deployed under `supabase/functions/`, run on Deno. Deployed via Supabase CLI.

**notify-membership** (`supabase/functions/notify-membership/index.ts`)
- Triggered by `owner.js` via `db.functions.invoke("notify-membership", { body: { membershipId } })` after approve or deny
- Uses **service role key** (not anon key) to read auth user email via `db.auth.admin.getUserById`
- Sends email via Resend, then returns `{ ok: true }`

**Required env vars** (set in Supabase dashboard → Edge Functions → Secrets):
- `RESEND_API_KEY` — Resend API key
- `SUPABASE_URL` — auto-provided by Supabase runtime
- `SUPABASE_SERVICE_ROLE_KEY` — auto-provided by Supabase runtime

### Resend
Used exclusively inside edge functions. Not called from the frontend.
- From address: `Campo Livre <onboarding@resend.dev>` (Resend sandbox domain — intentional, app has no public domain yet)
- Sends approval/denial emails in Portuguese to the player's auth email
- Email content: plain text only, no HTML
- More email flows are planned beyond membership notify (booking confirmation, etc.)
- **When a production domain is set up:** update the Resend from-address AND the Supabase auth redirect URLs (currently pointing to local IPs: `192.168.1.111:8080`, `192.168.10.112:3000`)

## Conventions

- Single global CSS file (`css/styles.css`) — no scoped or component CSS
- Each HTML page loads its own JS file + shared utils (`utils.js`, `config.js`, etc.)
- Empty states use `setEmptyState(container, message)` from `utils.js` (pig mascot)
- Icons are inline SVGs loaded from `images/icon_*.svg` via `fetch` or `<img>` tags
- `device_id` in `localStorage` identifies the device for walk-in ownership
- Supabase anon key is intentionally public (RLS handles access control)
