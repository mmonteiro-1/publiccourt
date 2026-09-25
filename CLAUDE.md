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
js/weather.js         — Open-Meteo daily forecast → one icon per day (rain/sunny/part_cloudy/cloudy), 3h localStorage cache
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
- **scp:** shorthand for git status → commit → push
- **Dev server:** `npx http-server` on port 8080
- **Screenshots:** Skip Puppeteer/screenshot verification for mechanical CSS edits. Use it only when the visual outcome is genuinely uncertain (new layout, new component, tricky CSS interaction)
- **No over-engineering:** No abstractions beyond what the task needs. No error handling for impossible cases. No comments explaining what code does — only WHY when non-obvious
- **Player-facing copy:** always put messages shown to players in `MSG_*` constants at the top of the file (see `court-bookable.js`), never inline in templates. When the text needs dynamic parts, make the constant a small function (e.g. `MSG_SIBLINGS = courtLinks => \`...\``)

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
Deployed under `supabase/functions/`, run on Deno.

**Deploy command** (run from project root):
```
npx supabase link --project-ref xfshczzojvbkfxkmsvsn
npx supabase functions deploy notify-membership
```
`link` only needed once per machine. `supabase` CLI is not globally installed — always use `npx supabase`.

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
- **Email notifications currently broken:** Resend sandbox only sends to the Resend account owner's email — arbitrary player emails are rejected. Fix: add a verified domain in Resend, update `from` address in the edge function. `notify-membership` also has debug `console.log` statements that should be cleaned up when this is addressed.

## Conventions

- Single global CSS file (`css/styles.css`) — no scoped or component CSS
- Each HTML page loads its own JS file + shared utils (`utils.js`, `config.js`, etc.)
- Empty states use `setEmptyState(container, message)` from `utils.js` (pig mascot)
- Icons are inline SVGs loaded from `images/icon_*.svg` via `fetch` or `<img>` tags
- `device_id` in `localStorage` identifies the device for walk-in ownership
- Supabase anon key is intentionally public (RLS handles access control)

## High Level Thoughts

### Degrees of Complexity — platform features as add-ons

Not all owners need the same features. The platform is built in layers: the booking and registration foundation comes first and works standalone. Everything else — billing, cancellation rules, automated payments — is an add-on that activates per court.

The specific degrees aren't defined yet, but the principle is: each court has a complexity level that determines which features are active. A free court and a paid court share the same foundation and the same codebase.

### Degrees of Burocracia — registration requirements per court

Not all owners need the same information from a player. Some just need a name, others need full documentation. Each court has a burocracia level that determines which fields are required during player registration and what the owner sees in the approval dashboard.

The specific degrees aren't defined yet, but the two systems are independent — a court can be any combination of complexity and burocracia level.

When a court's burocracia level requires document verification, documents are never uploaded to the platform. The player delivers them in person to the owner, who verifies them offline. Campo Livre only stores the outcome: a **Verificado** tag on the player's profile, set manually by the owner. The platform is a record of trust, not a document vault.

## Open Questions

### Edge cases

**a) No-show** — Player doesn't show up — do they still pay?
→ Yes. The slot was held and the court lost the opportunity to give it to someone else. Booking confirmed = payment owed, regardless of presence.

**b) Player cancellation**
→ Free cancellation if cancelled more than 48h before the slot starts. Less than 48h = full charge, slot is freed but payment is still owed. Owner can always waive manually as an exception.

**c) Rain / force majeure** — Who cancels when it rains — player or owner?
→ Owner-initiated only. Player can't self-cancel and claim weather. Owner marks the slot as `cancelled_weather`, all affected players are automatically waived and unblocked. Owner should be able to do this proactively if the forecast is bad.

**d) Owner forgets to unblock**
→ Auto-unblock after 24h from `ends_at`, flagged as auto-released (not manually confirmed) so the owner can see it. Player can also tap "já paguei" to send a notification nudge to the owner — without being able to self-unblock.

### Things to decide before building

- **Pending approval UX** — player is registered but not yet verified. They need a clear "aguarda aprovação" state so they don't think the app is broken.
- **Owner scope** — is it one owner per court, or one owner managing multiple courts? A municipal receptionist might manage 3 courts. Affects whether the owner entity sits above or alongside the court entity in the data model.
- **Pricing** — flat rate per hour, or variable by time of day / weekday vs weekend? If variable, need a pricing table per court, not just a single `price_per_hour` column.
- **MBWay number** — whose number does the player pay? The court's dedicated number or the receptionist's? Must be configurable per court in the owner dashboard.
- **Reference format** — sequential reservation IDs leak booking volume. Use a short opaque code instead: `CPL-4X7K`. Must fit MBWay's free-text character limit (~20 chars).

## Implementing the MVP

### Authentication

Supabase Auth is already included — magic link is a built-in provider, no extra infrastructure needed.

**What Supabase manages automatically:**
- `auth.users` — email, session tokens, last login. Not touched directly.

**What we create:**
- `profiles` table — extends `auth.users` with fields we own (name, and future registration fields)

**Roles:** one email = one role. An account is either a **player** or an **owner**, never both (an owner who also plays is too rare to design for). Owner = owns at least one `court_groups` row.

**Login flow:**
1. `login.html` — player submits email only (`signInWithOtp`, `emailRedirectTo: profile.html`). Already logged in → straight to `profile.html`
2. Magic link lands on `profile.html`, which is also the post-login router (`js/profile.js`):
   - **Owner** → `owner.html` (owners have no `profile.html`; their profile is a view inside the dashboard)
   - **No `profiles` row** → 3-step onboarding (name required; phone, NIF optional), then continues below
   - **Came from a court page** → back to that court (see "Return to court")
   - **Otherwise** → the player profile ("Olá, [name]", email, Sair)
3. `owner.html` bounces anyone who owns no group back to `profile.html`

**Return to court:** "Fazer login" on a court page stores that page in `localStorage.returnTo`; `profile.js` reads and clears it once the session exists (after onboarding for new players). One-shot, and only works if the magic link is opened in the **same browser** that requested it — a link opened on another device lands on the profile instead.

**Profile entry points:** skull icon (`icon_skull.svg`, placeholder) in the header — court list and court pages link to `profile.html` (logged-out visitors get sent on to login); in `owner.html` it opens the dashboard's own profile view (replaced the old gear tab in the nav).

**Redirect URL allowlist:** Supabase only returns magic links to URLs listed in Authentication → URL Configuration → Redirect URLs. Local IPs are there; Vercel URLs (production + preview wildcard) must be too, or links sent from the deploy fall back to the Site URL (a local IP).

### Sessions

Sessions are kept alive indefinitely for active users. Supabase auto-refreshes tokens in the background.

- Magic links only needed on first login, after explicit logout, or after session expiry
- Session expiry window is configurable (e.g. 30 or 90 days of inactivity)
- If an owner revokes a player's access, their session is invalidated server-side via the Supabase admin API
- New devices always require a new magic link — sessions don't transfer across devices

### Todo

- [x] Get the player to login and land on profile page
  - [ ] Differentiate first login (sign up — player chooses a name) from returning login (sign in — just requests a magic link)
- [x] Get the player to register to the owner (simple as possible)
  - [x] Create `memberships` table with `player_id`, `court_id` (nullable), `group_id` (nullable), `status`, `denied_reason`, `created_at`, `approved_at`
  - [x] Unique constraint per `(player_id, court_id)` and `(player_id, group_id)` to prevent duplicate requests
  - [x] Hard-delete rows (no soft-delete) so player can re-apply freely after deletion
  - [x] Court page shows "solicitation pending" state when membership row exists with status = pending
  - [x] A membership scoped to `group_id` covers all courts in that group; booking always references a specific `court_id`
- [x] Get the owner to login and land on dashboard (simple as possible)
- [x] Get the owner to see and validate the player registration
  - [x] Owner can approve or deny a membership request
  - [x] Denial must include a `denied_reason` field; player sees the reason on the court page with option to re-apply
  - [x] In-app notification: player sees approval/denial state on next court page visit
  - [x] Email notification: Supabase Edge Function triggered on membership status change
    - [x] Create Resend account and get API key
    - [x] Deploy Edge Function: receives membership id, fetches player email + status + denied_reason, sends email via Resend
- [x] Get the owner to see the full membership list
  - [x] List all approved memberships with player names and approval dates
  - [x] Owner can revoke access from this view (hard-delete `memberships` row)
  - [ ] Email notification to player when revoked — send before deleting the row so we still have their email
  - [ ] Allow owner to set membership duration per member on approval (override the group default)
  - [ ] In-app notification card for membership status changes (accept, deny, revoke) — dedicated card UI, not just inline state on court page
- [ ] Support multiple owners per court group (receptionists)
  - [ ] Create `court_group_members (group_id UUID, user_id UUID)` table
  - [ ] Migrate existing `court_groups.owner_id` rows into `court_group_members`
  - [ ] Update RLS policies to check membership in `court_group_members` instead of `owner_id`
  - [ ] New receptionists added manually via Supabase dashboard (no invite flow for now)
- [ ] More court rules
  - [ ] Max active bookings per player
  - [ ] Advance booking window (how many days ahead a player can book)
  - [ ] Cancellation deadline (hours before slot for free cancellation)
- [ ] Get the owner to set court availability
  - [ ] Needs a `slots` or `availability` table scoped to `court_groups.id` or `courts.id`
- [x] Get the player to see the availability calendar and book a game
  - [x] `bookings` table: `id, group_id, player_id, court_id, start_at, end_at, status, created_at`
  - [x] Player must have an approved `memberships` row for the court's `group_id` to be allowed to book
- [x] Get the player to cancel a booking
  - [x] Update `bookings` row status to `cancelled` (two-step Cancelar/Voltar confirm, mirrors owner's revoke flow)
  - [ ] Cancellation rules apply (free >48h before, full charge <48h)
- [ ] Figure out the rescheduling/cancelling process for bad weather — who triggers it, whether players get offered a new slot or just a waiver, and how it ties to the forecast icons (starting point: edge case (c) under Open Questions)
- [ ] Add success pig views after booking and after cancelling a booking
- [ ] Player profile page (`profile.html`)
  - [x] Magic link returns the player to the court they started login from (`localStorage.returnTo`)
  - [x] Header skull icon links to the profile (player) / opens the dashboard profile view (owner, replaces the gear nav tab)
  - [ ] Add the Vercel production + preview URLs to Supabase's auth Redirect URLs
  - [ ] Test the loop for a new user (onboarding → back to court) and a returning user (straight back to court)
    - [x] Returning user lands back on the court
    - [ ] New user stayed on the profile after onboarding — confirm whether login started from a court page and the link opened in the same browser
  - [ ] Check what happens when a new user leaves mid-onboarding (e.g. via "Voltar"): no `profiles` row exists yet, so they're logged in but nameless — court pages fall back to "jogador", and booking/membership requests may go through without a name for the owner
  - [ ] View and edit personal info (name, phone, NIF)
  - [ ] "Teus jogos passados": booking history (`bookings` by `player_id = auth.uid()`) plus walk-in history
    - [ ] Save the logged-in player's id on new walk-ins (new `walk_ins.player_id` column) — a player can be both booking and walk-in, so history follows the account; older walk-ins stay device-only
  - [ ] Upcoming game alerts (billing alerts once billing exists)
  - [ ] Replace the placeholder skull icon
- [ ] Get the owner to see the player booking and modify it
  - [x] Owner queries `bookings` for courts in their `court_groups` (bookings tab, default view)
  - [x] Owner sees the exact same availability calendar as the player (read-only picker in each court-rules-card, player names on occupied slots)
  - [x] Owner can cancel a booking (Cancelar/Voltar confirm on the bookings card)
  - [x] Owner picker shows the whole group: "HH:MM (1/2)" = courts taken / active courts, orange as soon as any court is booked, every booked player's short name beneath
  - [x] Tapping a booked slot in the owner picker jumps to that booking's card (first booking only when several share the slot)
  - [ ] Owner can add a booking on behalf of a player, or edit one
- [x] Player picker stays single-court; greeting points to the group's other courts ("Se não encontrares horário aqui, também podes reservar no …", `MSG_SIBLINGS`)
- [x] Group stats for the owner, shown just above the slot picker in each court-rules-card (calculated in JS from the owner's bookings, whole group not per court)
  - [x] This month: bookings, unique players, newcomers, estimated revenue, cancellations
  - [ ] Move to a Postgres RPC if a group's booking history gets large enough to slow the dashboard
- [ ] Booking gaps (found after the booking back-and-forth)
  - [ ] Enforce booking rules server-side — only JS checks opening hours, slot alignment, pause and min duration; verify the insert RLS actually requires an approved membership (later)
  - [x] Expired membership (`expires_at` passed) blocks booking — player's info and membership row stay, only booking is impeded (`MSG_EXPIRED`; a game booked before expiry stays visible and cancellable)
  - [x] Revoking a member cancels all their upcoming bookings (cancelled before the membership is deleted; games already underway are left alone)
  - [ ] Flag existing bookings that no longer fit after the owner changes opening hours, pause or slot length (later)
  - [ ] Notify the player when the owner cancels their booking; booking confirmation email (later — Resend sandbox still blocks player emails)
  - [ ] Booking history view — past games for the owner (and eventually played / no-show / paid status)
- [ ] Polish pig mascot with Rive animations
  - [ ] Animate existing pig SVG in Rive editor (idle loop + reaction states)
  - [ ] Export `.riv` and integrate via `@rive-app/canvas` runtime
  - [ ] Replace static pig in `setEmptyState` with animated Rive canvas

## Booking Flow — Implementation Plan

### Phase 1: Owner UI
- [x] Opening hours per day (open/close toggle + times)
- [x] Pause fields in Campo tab: Seg–Sex and Sab–Dom (two grouped time-range inputs, writes to `pause_start`/`pause_end` on all relevant day rows)

### Phase 2: Database
- [x] Create `bookings` table: `id, group_id, player_id, court_id, start_at, end_at, status, created_at`
- [x] Rename `reservations` → `walk_ins` across all files
- [x] Exclusion constraint (`btree_gist` + `tstzrange`) — blocks overlapping bookings at DB level atomically
- [x] DB trigger `enforce_one_active_booking_per_group` — one confirmed future booking per player per group at a time
- [x] RLS: approved members of the group can read all bookings for that court

### Phase 3: js/slot-picker.js
- [x] Day strip — today + next 6 days; closed days muted/untappable
- [x] Slot grid generator — from `open`/`close` + `slot_duration_minutes`, 4-column layout
- [x] Slot states: past (muted) · occupied/orange · lunch/hatched · available/green · mine/white
- [x] Selection logic — contiguous, auto-fill between taps, blocked by occupied/lunch/past
- [x] Min game duration validation — "Confirmar reserva" disabled when selection < min duration
- [x] "Confirmar reserva" → insert into `bookings`; reloads the page on success
- [x] Lock picker after successful booking — no further slot picking; mine slot stays visible
- [x] Selection summary during picking: "Teu jogo: HH:MM às HH:MM (X min)" (live, before confirm)

### Phase 4: Integration
- [x] Wire `renderSlotPicker` from slot-picker.js into court-bookable.js approved branch
- [x] Load existing bookings for 7-day window — occupied slots visible to all group members
- [x] One active booking per group (JS layer) — if player already has a future booking, picker is blocked and booking details are shown instead
- [ ] Owner booking management — same slot grid with full control: view all, add on behalf of a player, edit, remove

### Design Decisions
- **Single-court player picker, group-wide owner picker:** the same `renderSlotPicker` serves both.
  - **Player** sees one court only — the court page they're on. A booking always belongs to one court, so a game can never need a court change mid-way (a group-wide player picker would need a "one court free for the whole range" check plus court auto-assignment — rejected as too complex). Other courts in the group are only mentioned in the greeting, with links; no availability check behind it.
  - **Owner** sees the whole group in one grid (`readOnly`), because rules, membership, pricing and the one-booking limit are all per group. Each booked slot shows `HH:MM (taken/courtCount)` and all booked players; any booking makes it orange.
- **Slot selection:** slot-based; cells show start times; end time = last slot + `slot_duration_minutes`
- **Contiguous only:** auto-fill slots between first and second tap; tapping past a blocker is ignored
- **Single slot:** valid; tap same slot twice = 1-slot booking
- **Reset:** any tap while a full range is selected resets and starts from that slot
- **Pause:** stored per-day in `court_opening_hours.pause_start/pause_end`; edited in owner UI as two grouped fields: weekdays (1–5) and weekend (0, 6)
- **Min game duration:** enforced at confirm only — not during selection; message: "O tempo mínimo de reserva para este campo é de Xh."
- **Closed days:** muted in day strip, tapping does nothing
