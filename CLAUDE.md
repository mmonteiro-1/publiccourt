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

**courts** — `id, name, city, description, lat, lng, group_id, group_position, active, bookable, unavailable, missing_qr_hint`
- `bookable`: court requires membership + slot booking (vs walk-in)
- `group_id`: links to a `court_groups` record (nullable for standalone courts)
- `group_position`: order within a group
- `missing_qr_hint`: counter incremented when users report missing QR

**court_groups** — `id, owner_id, membership_duration_months, slot_duration_minutes, min_game_duration_minutes, price_per_slot_cents`
- Groups multiple courts under one owner with shared rules/membership

**court_opening_hours** — `group_id, day_of_week, open, close, closed, pause_start, pause_end`
- One row per day (0=Sun–6=Sat); `closed` disables the day entirely; `pause_*` is lunch break

**memberships** — `id, player_id, group_id, court_id, status, denied_reason, created_at, approved_at, expires_at`
- Scope: either `group_id` (group-wide) or `court_id` (single court), never both
- `status`: `pending` | `approved` | `denied`

**bookings** — `id, player_id, group_id, court_id, start_at, end_at`
- Only for bookable courts; player must have an active membership

**walk_ins** — `id, court_id, device_id, ends_at, started_at, manual_finished_at`
- For non-bookable courts; owned by `device_id` (localStorage), no auth required
- Active when `manual_finished_at` IS NULL and `ends_at` > now

**profiles** — `id, name`
- Created on first login/onboarding; `id` = Supabase auth user id

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
