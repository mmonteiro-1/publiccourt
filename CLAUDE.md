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
admin.html / js/admin.js          — admin dashboard (members, rules, hours)
login.html / js/login.js
profile.html / js/profile.js     — post-login router, profile views (history, passes, info)
                js/player_progress.js — the profile's progress tab: stats (Estilo de jogo), diamonds, trading card (loaded before profile.js)
                js/ranking.js     — the profile's ranking tab: board, plaque updates, "Entende o ranking" (loaded before profile.js)
onboarding.html / js/onboarding.js — first-login slideshow for players with no `profiles` row; back to profile.html when done
info.html

js/utils.js           — shared helpers: setPigAppearance, gameLabel, formatTime, minutesLeft, getDeviceId, cityHtml
js/secondary-card.js  — secondary info card (rules, hours, city)
js/slot-picker.js     — booking slot selection UI
js/success.js         — every success screen: copy, SUCCESS presets, showSuccess() renderer (countdown + reload)
js/tear-reveal.js     — showTearReveal({ label, onDone }): full-screen tear-strip "parcel" over the page; drag to tear, box splits, page revealed — the wrapper for surprises
js/reveals.js         — surprises: REVEALS presets, showReveal() (scene layer + parcel), checkSurprises() run on load (court list, court page, profile)
js/pass-card.js       — passCard() + its copy and constants: the one pass ticket, shared by the profile and the pass-approved surprise
js/weather.js         — Open-Meteo daily forecast → one icon per day (rain/sunny/part_cloudy/cloudy), 3h localStorage cache
js/config.js          — Supabase credentials + db client
css/styles.css        — single global stylesheet
supabase/sql/         — the SQL behind the database functions (xp.sql, ranking.sql), run by hand in the SQL editor; the record of what's live
images/               — SVG icons (icon_*.svg) + flags + pig mascot
```

## Current Work

Branch: `bookable-mvp` — building the court booking flow for courts that require pass and slot reservations. Recent work: shared success screens (`success.js`), newcomer/returning login copy with post-login landing on the court list, visitor profile toggle, player activity stats with level titles and progress bars.

## Working Style

- Break every non-trivial prompt into a todo list before starting — tackle one item at a time
- Don't build multiple things at once; confirm each step before moving to the next
- When ideating: propose ideas, then ask before writing them to CLAUDE.md — don't commit half-formed ideas to the knowledge

## Rules

- **Comments:** ALL CAPS always, every file, every comment type
- **Commits:** Don't commit after small edits. Batch changes; commit only when asked or at a natural milestone — ask before committing even then
- **scp:** shorthand for git status → commit → push
- **Dev server:** `npx http-server` — port 3000 on the Macs (work `192.168.10.112`, home `192.168.1.112`), port 8080 on the home PC (`192.168.1.111`)
- **Screenshots:** Skip Puppeteer/screenshot verification for mechanical CSS edits. Use it only when the visual outcome is genuinely uncertain (new layout, new component, tricky CSS interaction)
- **No over-engineering:** No abstractions beyond what the task needs. No error handling for impossible cases. No comments explaining what code does — only WHY when non-obvious
- **Supabase renames:** There is one database shared by every branch and by production. Renaming a table or column while working on a branch breaks `main` the moment it's applied — the deployed code still queries the old name. Never rename in place. Add the new name alongside the old, update every branch, then drop the old one once nothing references it. The same applies to dropping columns and tightening RLS
- **Player-facing copy:** always put messages shown to players in `MSG_*` constants at the top of the file (see `court-bookable.js`), never inline in templates. When the text needs dynamic parts, make the constant a small function (e.g. `MSG_SIBLINGS = courtLinks => \`...\``). This is for phrases only — short labels like button text ("Reservar horário", "Cancelar") stay inline

### CSS Rules
- No `line-height`
- No `letter-spacing`
- No hardcoded colors — CSS variables only
- Sizes must be multiples of 5 (px, rem, etc.)
- `font-size` in `em` only, never `px`
- No custom cursors or animations invisible on mobile
- `font-weight` limited to `400` or `700` only
- Minimise classes — reuse existing ones before creating new ones

### Brutomorphism — the visual style

Our own mix of skeuomorphism and neo-brutalism: a real object's **shape and mechanics**, drawn with a **brutalist surface** — real things cut out of flat card. The ticket (notch, punched hole), the trading card, the tear-strip parcel and the pig hand lifting a prize are all brutomorphic; every new component should be too.

1. **Borrow the object's anatomy, not its texture:** notches, holes, ribbons, pins — yes. Paper grain, cork, gloss, wear — never
2. **One weight of truth:** 2px black outline on everything; a hard 4px black shadow on anything that sits on top
3. **Flat colour from tokens only**, no gradients — the realism comes from shape alone
4. **Mechanics are real:** a parcel tears, a card lifts, a pin holds a sheet. Interaction follows the object
5. **Exaggerate, don't detail:** a few chunky, recognisable features over many fine ones

## Glossary

One concept, one word per layer. **Code** is what identifiers, comments, docs and table names use; **Copy** is what players and admins read (PT-PT). A term missing here gets added before it's used in two places.

| Concept | Code | Copy | Meaning |
|---|---|---|---|
| Player | player | jogador | Anyone who plays, registered or not — the umbrella term |
| Visitor | visitor | — | A player without an account, identified only by `device_id` |
| Blank visitor | blank visitor | — | A visitor with no games yet |
| Seasoned visitor | seasoned visitor | — | A visitor with unclaimed walk-ins ("games on the belt") |
| Registered player | registered | — | A player with a `profiles` row. Not "logged": logging in is a session state, and a registered player who logs out is a visitor on that device |
| Pass | pass | passe | Permission to book a private court group; `pending` / `approved` / `denied`. The object — the card the player holds |
| Member | member | membro | A registered player with an approved pass ("pass holder" means the same). The status — "És membro deste campo", "Membro desde" |
| Admin | admin | administrador | Owns at least one court group. An account is a player or an admin, never both |
| Court | court | campo | One playable court (`courts`) |
| Court group | court group, group | — | Courts sharing one admin, one set of rules and one pass |
| Walk-in | walk-in | jogo público | A game on a public court, checked in on site |
| Booking | booking | reserva, jogo reservado | A reserved slot on a private court |
| Game | game | partida, jogo | Any walk-in or booking, as counted in history and stats. Copy uses both words |
| Slot | slot | horário | One `slot_duration_minutes` cell of the slot picker |
| XP | xp | XP | Lifetime points; never drops |
| Level | level | nível | XP level 1–10 (trading card) — the only level. Stats have titles, never levels |
| Stat | stat | Estilo de jogo (the section); Frequência, Consistência, Território | A 0–100 reading of how the player has played in the last 6 months. Gives no XP. Replaced "skill" (a skill is something you own, like XP) |
| Diamond | diamond | diamante | One of four lifetime feats (Centenário, Explorador, Inquebrável, Campeão), kept forever |
| Trading card | trading card | — | The character card on the progress view |
| Ticket | ticket | — | The generic card (`.ticket`, `.ticket-title`, `.ticket-line`, `.ticket-date`…) used for history, bookings, passes, stats and admin requests. Named for its look: notched divider, punched hole. Not a pass |
| Locked preview | locked, dummy | — | Example content for visitors and empty views; dummy dates are always 30/02 |
| Teaser | teaser | — | The line inside a visitor's trading card ("Já tens N XP à tua espera") |
| Claim | claim | — | Adopting a device's unclaimed walk-ins on login |
| Pig appearance | pig appearance | — | The pig with a message (`setPigAppearance`) |
| Parcel | parcel, tear strip | encomenda | The sealed full-screen overlay the player tears open (`showTearReveal`). Only ever wraps a surprise |
| Surprise | surprise | — | A rare, important moment (pass approved, level up…) played once: a parcel, then its scene. See "Surprises" |
| Scene | scene | — | What a surprise reveals: a full-screen layer of its own, independent of the page underneath (`REVEALS` presets) |
| Brutomorphism | brutomorphism, brutomorphic | — | The visual style: real objects' shape and mechanics with a flat brutalist surface. See "Brutomorphism" under Rules |
| Revealed | revealed | — | A surprise the player has torn open — a `revealed_surprises` row (`kind` + `ref`); it never plays again for that event |

**Migration (complete)** — code, copy and database now follow the glossary. How it was done, one phase at a time, each tested before the next:
1. ~~Glossary~~ (this section)
2. Code-only renames, no database: identifiers, `MSG_*` names and comments — membership → pass (done), owner → admin (done — `owner_id`, `owner.html` and `owner.js` wait for phases 4–5; the walk-in sense of "owner" became `isMine`), logged-in player → registered (done); "member" stays. Phase 2 complete. The `membership-*` card classes became `ticket-*` (done)
3. ~~Copy~~: "passe" for the object, "membro" for the status, "administrador" for the admin — every string reviewed (done; the emails say "passe" too, `notify-membership` redeployed from the dashboard)
4. ~~Database renames~~ (done — one transaction; policies also renamed from "Owners…" to "Admins…"; `notify-pass` deployed alongside the old function, then the code switched to it). Plan as run: renames with a safety net: `memberships` → `passes`, `court_groups.owner_id` → `admin_id`, `membership_duration_months` → `pass_duration_months`, each shipped with a compatibility view under the old name (`security_invoker`, so RLS still applies) so old and new code both work mid-switch; RLS policies and triggers re-checked; `notify-membership` redeployed as `notify-pass`. `main` only queries `courts` and `walk_ins`, so none of these tables can break production — the risk is breaking this branch and the live edge function mid-switch
5. ~~Page rename~~: `owner.html` / `owner.js` → `admin.html` / `admin.js` (done). `vercel.json` redirects `/owner` and `/owner.html` to `/admin` (permanent), so old links and bookmarks still work in production
6. ~~Clean-up~~: `memberships` view dropped, `notify-membership` deleted (dashboard and repo)

## Database Schema (Supabase)

**courts** — `id int4, name text, city text, description text, lat float8, lng float8, group_id int4, group_position int4, active bool, bookable bool, unavailable bool, missing_qr_hint int4`
- `bookable`: requires pass + slot booking (vs walk-in)
- `group_id` → `court_groups.id` (nullable for standalone courts)
- RLS: SELECT open to all; UPDATE fully open (no condition) — intentional for `missing_qr_hint` increment

**court_groups** — `id int4, name text, admin_id uuid, pass_duration_months int4, slot_duration_minutes int4, min_game_duration_minutes int4, price_per_slot_cents int4`
- `admin_id` → `auth.users.id`
- `name`: the place, spelled out ("Gafanha da Encarnação", "Praia da Torreira"), shown on pass cards; the court names are the fallback. Group 10 ("Grupo de teste": Calvão, Ervosas) is test-only, the one group with an admin
- RLS: SELECT open to all; UPDATE only where `admin_id = auth.uid()`, and only the four rule columns the dashboard edits (column grants in `supabase/sql/court_groups.sql`) — never `name` or `admin_id`

**court_opening_hours** — `id int8, group_id int4, day_of_week int4, closed bool, open time, close time, pause_start time, pause_end time`
- One row per day (0=Sun–6=Sat); `closed` disables the day; `open`/`close`/`pause_*` are `time` type
- RLS: SELECT open to all; ALL operations gated on admin via `group_id IN (SELECT id FROM court_groups WHERE admin_id = auth.uid())`

**passes** — `id uuid, player_id uuid, group_id int4, court_id int4, status text, denied_reason text, created_at timestamptz, approved_at timestamptz, expires_at timestamptz`
- Scope: either `group_id` OR `court_id`, never both
- `status`: `pending` | `approved` | `denied`
- `player_id` → `auth.users.id`
- RLS: players read own; admins read/update via court_groups join; admins DELETE via group ownership; players can DELETE when `status = 'denied'` (unused since re-requests revive the row)
  - **Players can never approve themselves.** "Players request own passes" (INSERT) only allows `status = 'pending'` with `approved_at`, `expires_at` and `denied_reason` all null. "Players re-request own passes" (UPDATE) only touches their own `pending` / `denied` row and only turns it back into that same fresh request. Both replaced policies that checked `auth.uid() = player_id` alone, which let a player insert or update their own row to `approved` from the console
- **Request expiry:** a `pending` or `denied` row drops out of view — admin Pendentes tab, player passes (top of Meus jogos), court page — a month after its `created_at` (`REQUEST_EXPIRY_MONTHS` / `requestExpired` in `utils.js`, hardcoded). The row stays. Each request card shows its expiry date (trash icon)
- **Re-requesting revives the row** (`requestPass` in `court-bookable.js`): a refused request, or any pending/refused one past its month, is updated back to `pending` with a fresh `created_at` and the reason cleared — never deleted and re-inserted. The one-row-per-scope unique constraint holds, and an expired pending request (which a player couldn't delete) no longer blocks asking again. The previous refusal reason is overwritten

**bookings** — `id uuid, group_id int4, player_id uuid, court_id int8, start_at timestamptz, end_at timestamptz, status text, created_at timestamptz`
- `player_id` → `auth.users.id`
- RLS: players read/insert/cancel own; approved members can read all bookings for their group's courts; cancel (UPDATE) only allowed when `start_at > now()`

**walk_ins** — `id uuid, court_id int4, device_id uuid, player_id uuid, player_name text, started_at timestamptz, ends_at timestamptz, manual_finished_at timestamptz`
- No auth — fully open RLS (SELECT/INSERT/UPDATE/DELETE all `true`)
- Active when `manual_finished_at IS NULL AND ends_at > now()`
- `player_name` is only set for logged-in players (taken from their profile). Visitors are anonymous — we have no name to ask for, so it stays `null`
- `player_id` → `auth.users.id`, nullable. Set when a logged-in player starts a walk-in; anonymous walk-ins leave it `null` and are identified by `device_id` alone. On login the device's unclaimed walk-ins are adopted (`player_id = auth.uid()` where `device_id` matches and `player_id IS NULL`), so history survives the switch from visitor to account — per device only

**pass_awards** — `player_id uuid, group_id int4, court_id int4, awarded_at timestamptz`
- One row per pass ever approved, for XP (counted by the `player_xp` database function). Survives the pass being revoked, so XP never drops
- Filled only by the `award_pass` trigger (`security definer`) after insert or status update on `passes` when `status = 'approved'`; existing approved passes were backfilled
- Unique index `pass_awards_once` on `(player_id, coalesce(group_id, 0), coalesce(court_id, 0))` — one award per scope ever; the trigger's `on conflict do nothing` skips re-approvals
- RLS: players SELECT own only; nobody inserts, updates or deletes directly

**revealed_surprises** — `player_id uuid, kind text, ref text, revealed_at timestamptz`
- One row per surprise a player has torn open, of any kind (see "Surprises"). Primary key `(player_id, kind, ref)`; `player_id` defaults to `auth.uid()`
- `kind` says what happened, `ref` which one: `pass_approved` → the `passes.id`; `level_up` → the level number; `diamond` → which diamond
- Backfilled with every pass approved before the feature, so no existing member gets a parcel for an old pass
- RLS: players read and insert their own only. Faking a row only skips their own surprise

**ranking_views** — `player_id uuid, season_start date, board jsonb, seen_at timestamptz`
- The ranking board as each player last saw it, one row per season (primary key `(player_id, season_start)`), overwritten once an update has played. The next visit compares it with the live `season_ranking()` and animates the difference (plaques swapped, XP gained, players passed), so each change plays once, on any device. No row yet (first look this season) means nothing to animate
- `board` holds only what `season_ranking` already showed: place, "R. Barbosa" name, points, `is_me`, `ref` (`md5` of player + season — tells players apart across two looks without being an id, and changes every season)
- RLS: players read, insert and update their own only. SQL in `supabase/sql/ranking.sql`
- Debug: `?board=overtake` / `?board=gain` on `profile.html` replays an update with fake numbers and saves nothing

**profiles** — `id uuid, name text, phone text, nif text, hide_from_ranking bool, created_at timestamptz`
- `id` = `auth.users.id`; created on first onboarding
- `phone` and `nif` collected at onboarding, editable on the player profile, shown to admins on pending request cards
- RLS: players read/insert/update own; admins can read profiles of their approved members

## Backend Services

### Supabase Edge Functions
Deployed under `supabase/functions/`, run on Deno.

**Deploying:** easiest from the dashboard — Edge Functions → the function → Code tab → paste the whole file from the repo → Deploy (paste the full file so the live code matches the repo). The CLI also works, but needs `npx supabase login` once per machine (interactive, opens a browser):
```
npx supabase link --project-ref xfshczzojvbkfxkmsvsn
npx supabase functions deploy notify-pass
```
`supabase` CLI is not globally installed — always use `npx supabase`.

**notify-pass** (`supabase/functions/notify-pass/index.ts`)
- Triggered by `admin.js` via `db.functions.invoke("notify-pass", { body: { passId } })` after approve or deny
- Replaced `notify-membership` (same code, reading `passes` and taking `passId`), which was deleted in phase 6
- Uses **service role key** (not anon key) to read auth user email via `db.auth.admin.getUserById`
- Sends email via Resend, then returns `{ ok: true }`

**Required env vars** (set in Supabase dashboard → Edge Functions → Secrets):
- `RESEND_API_KEY` — Resend API key
- `SUPABASE_URL` — auto-provided by Supabase runtime
- `SUPABASE_SERVICE_ROLE_KEY` — auto-provided by Supabase runtime

### Usage metrics
- **`weekly_metrics`** (`supabase/sql/metrics.sql`), read in the SQL editor only (`select * from weekly_metrics`), never exposed to the API: per week, games, players, new players, returning players (the retention number), courts used (the count) and courts (their names, alphabetical). Walk-ins only, since registration isn't live yet. A player is an account, or a device for visitors — an upper bound
- **Not real play, excluded there:** the chart generator's device (`00000000-…`), the test games on courts 1, 2 and 8 before 22/09/2026, games of 10 min or less. Keep any new query on these rules, or read from the view
- **Vercel Web Analytics:** `/_vercel/insights/script.js` on every page (cookieless), switched on in the project. Ad blockers (uBlock Origin…) block it, so visits are a lower bound — mostly desktop; QR players on phones rarely run one. Page views on court pages versus walk-ins in `weekly_metrics` is the funnel. Needs Analytics switched on in the Vercel project; the script 404s on the local dev server, which is harmless

### Resend
Sends every email the app sends, on the domain **`campolivre.app`** (bought 10/2026 through Vercel, so its DNS lives in Vercel; verified in Resend, region Ireland `eu-west-1`). The domain only sends email — the site stays at `publiccourt.vercel.app`, which every printed QR code points to.
- **Auth emails (login codes):** Supabase sends them through Resend as custom SMTP — Supabase → Authentication → Emails → SMTP Settings: host `smtp.resend.com`, port 465, user `resend`, password a Resend API key, sender `Campo Livre <entrar@campolivre.app>`. Supabase's built-in email can't be used: it only delivers to the project team's addresses, ~2 an hour, and custom SMTP is what unlocks editing the templates
- **Templates** ("Magic Link" for returning players, "Confirm signup" for new emails): Portuguese, the code (`{{ .Token }}`) and no link; OTP length 6, expiry 10 min
- **Edge functions** (`notify-pass`) call Resend's API directly with the `RESEND_API_KEY` secret, from `Campo Livre <passes@campolivre.app>` (was the sandbox `onboarding@resend.dev`, which only reached the Resend account owner). Debug `console.log`s removed. Deploy by pasting the file in the dashboard
- Pass emails: approval/denial in Portuguese, plain text only. More flows planned (booking confirmation, etc.)
- **If the site ever moves to `campolivre.app`:** add it to Supabase's Site URL and Redirect URLs, and keep `publiccourt.vercel.app` working (or redirecting) for the QR codes

## Conventions

- Single global CSS file (`css/styles.css`) — no scoped or component CSS
- Each HTML page loads its own JS file + shared utils (`utils.js`, `config.js`, etc.)
- Every HTML page links `manifest.json` and `<meta name="theme-color">` in its `<head>`: iOS reads the manifest of the page the player is on when they tap "Add to Home Screen", and without it the app installs as a plain bookmark with the address bar
- **Pig appearances:** whenever the pig shows up with a message (empty lists, but also informing the player), use `setPigAppearance(container, message)` from `utils.js`. Defaults to `pig_sitting`; pass a third argument for another image, e.g. `setPigAppearance(el, MSG_X, "pig_serving")`
- **Success screens:** everything about them lives in `js/success.js` — the `MSG_*` copy, and one preset per screen in `SUCCESS` (pig, `header` as `.info-heading`, `sub1`/`sub2` as `.info-sub1`/`.info-sub2`, `seconds` before the reload, `animation` `"ball"` or omitted). Other files only inject the dynamic parts: `showSuccess(SUCCESS.booked(gameLabel(start, end)))`. A new screen means a new preset there, never an inline one. This overrides the "copy at the top of its own file" rule
- **One pig at a time:** the header's logo pig hides whenever another pig is visible (a `.pig-appearance` or a success screen's `.info-pig`). It's a single CSS `:has()` rule; appearances inside a `[hidden]` view don't count, so pages need no JS to keep it in sync
- Icons are inline SVGs loaded from `images/icon_*.svg` via `fetch` or `<img>` tags
- `device_id` in `localStorage` identifies the device for walk-in ownership
- Supabase anon key is intentionally public (RLS handles access control)
- Double-tap zoom is off app-wide via `touch-action: manipulation` on `html` (pinch zoom still works)
- **Zero counts are words:** Space Grotesk's round 0 reads as an "o" ("0 jogos" → "o jogos"), and the font has no slashed zero (`font-variant-numeric: slashed-zero` does nothing). Counts in copy say "Nenhuma partida" / "Nenhuma reserva" instead. Bare numbers (skill ratings) can't be fixed this way
- **"Faz login" is always a link** to `login.html` in visitor copy (`MSG_LOGIN_LINK` in `utils.js`; the passes explainer links its "login" too). `.card-sub` links are white app-wide (court page siblings), so `.page-profile .card-sub a` turns them black on the profile

## High Level Thoughts

### Degrees of Complexity — platform features as add-ons

Not all admins need the same features. The platform is built in layers: the booking and registration foundation comes first and works standalone. Everything else — billing, cancellation rules, automated payments — is an add-on that activates per court.

The specific degrees aren't defined yet, but the principle is: each court has a complexity level that determines which features are active. A free court and a paid court share the same foundation and the same codebase.

### Degrees of Burocracia — registration requirements per court

Not all admins need the same information from a player. Some just need a name, others need full documentation. Each court has a burocracia level that determines which fields are required during player registration and what the admin sees in the approval dashboard.

The specific degrees aren't defined yet, but the two systems are independent — a court can be any combination of complexity and burocracia level.

When a court's burocracia level requires document verification, documents are never uploaded to the platform. The player delivers them in person to the admin, who verifies them offline. Campo Livre only stores the outcome: a **Verificado** tag on the player's profile, set manually by the admin. The platform is a record of trust, not a document vault.

### Activity stats — a reason to use Campo Livre beyond booking

**First set implemented** (profile progress view, see Todo): games in the last 6 months (replaced hours in the last 30 days; the comparison with the previous period was dropped), weeks with a game, distinct courts played ("Território", replaced the favourite court card) — all three over the same rolling 6 months. Cities collected was dropped. A rolling window rather than a calendar period, so the total doesn't reset to zero on a fixed date. Now Estilo de jogo — see "The progress model" below. The rest below is still exploration.

The chosen levels are listed under "Player progress" below, since they're the first piece of that progress layer.

Walk-ins and bookings now give every player, visitor or logged in, a record of court, start time and duration. That's enough for personal activity stats: hours played per week or month, streaks, favourite courts, usual time of day. For a player who never books, this could be the main reason to open the app.

- **Data quality:** walk-in duration is whatever the player chose (45/60/90) unless they tap "Terminar jogo atual", and a booking doesn't prove anyone showed up (no-shows). Stats measure declared time on court, not time played.
- **Activity, never health (decided):** health data is a GDPR special category (Art. 9). It needs explicit consent, an impact assessment and stricter security, and EU courts read "concerning health" broadly, including indirect inferences. Minutes on court are ordinary personal data. What would tip it over: calories or other physiological estimates, heart rate, wearable or Apple Health / Google Fit integration, fitness scores, or anything implying a condition. Copy says "estatísticas de atividade", never "saúde". Anything beyond counting time on court needs a legal opinion first.
- **Behind the login wall:** stats are for logged-in players only, while the plain game history stays open to visitors. This is for engagement: stats become a reason to create an account for players who'd never book. It's also for accuracy: a visitor's record covers one device and vanishes when storage is cleared, whereas account data follows the player across devices (older device walk-ins are claimed on login). Stats built on the account are ones worth trusting.

**Metrics the current data supports** (court, start, duration, public/booked, court city):
- **Volume:** hours per week, month and year, with the change against the previous period ("+2h que o mês passado"); game count; average game length; personal records (longest game, best week)
- **Consistency:** weekly streak (weeks in a row with at least one game; daily streaks would punish normal tennis rhythms); active days per month; calendar heatmap
- **Habits:** favourite court, weekday and time of day (manhã / tarde / noite); public vs booked split
- **Exploration:** distinct courts played, and cities collected, where each new city unlocks its flag (`flag_*.svg` already exists). Playful, and it pushes players to try new courts, which helps the platform
- **Suggested first set:** hours this month with the change against last month, weekly streak, favourite court, cities collected. One number or badge each, covering volume, consistency, habit and exploration
- **Not available yet:** who you played with, match results, singles vs doubles. Needs new data, which the post-game card below could collect

### Player progress — "duolingoization"

Builds on activity stats. Short, interactive questions after each game collect the data we're missing, and answering becomes the engagement loop. Over time this builds up a sense of player progress.

- **Moment:** there are no push notifications, so the card appears on the next app open after a game ends. The pig asks ("Como correu a partida de sábado?"). The pig is our Duo owl, which gives the Rive animation todo a real purpose.
- **Questions:** one tap each, three at most, always skippable
  - "Jogaste os 60 min?" confirms the real duration and fixes the declared-duration data-quality problem
  - "Singulares ou pares?"
  - "Ganhaste / perdeste / só treino?"
  - Maybe a 1–5 "Como foi o jogo?". Never ask about fatigue, pain or injury, which drifts back into health data
- **Progress layer:** points per game and per answered card, levels, the weekly streak, city flags as badges. Skill levels, the streak and XP already exist on the progress view (see "Levels already implemented" and "XP" below); points for answered cards and badges don't
- **Rain freeze:** our take on Duolingo's streak freeze. We already fetch the forecast (`weather.js`), so a rainy week doesn't break the streak
- **Risks:**
  - Nagging: show the card once per game, then drop it. A card on every open trains people to stop opening the app
  - Honesty: self-reported results are fine for personal progress, but they rule out ranking by results. Activity can still be ranked (see "Leaderboards and social comparison")
  - Tone: too much confetti feels childish. The pig's cheeky voice ("batotas", "porreiríssimo") should carry it, not badges everywhere
- **Where to start:** only the post-game card (duration, singles/doubles, result) stored on the game row, with no points or levels. It pays off alone by making stats more accurate, and it shows whether players actually answer before a progression system is built on top. Since stats are behind the login wall, answering is also the natural moment to prompt visitors to make an account ("guarda o teu progresso")

**The progress model (built — see the "Simplify the progress model" todo).** The old model couldn't be explained: four skills shown four ways each (count, 1–4 skill level with title, segmented bar, 0–100 rating), three different time windows, and XP that "rode on" the skills without being paid by them. The rebuild keeps three separate things that never feed each other:

1. **XP** — the only progress. Games plus bonuses go into one lifetime pile that sets the level 1–10 (see "XP" below). It's the only bar on the profile
2. **Estilo de jogo** (`stats`) — the thermometer: three readings worked out from the player's games, describing how they play. They give no XP and take none. Not "skills": a skill is something you own, like XP; a stat is a measurement
3. **Diamonds** — the rarest feats, kept forever

Rejected along the way: the **bucket method** (every XP gain lands in a skill, the skills add up to the total) — it needs a rule for every gain, an exception for gains that are no habit (passes, championships), and a recalibrated `games_xp`. "Lean on a skill to level up" goes with it; player expression survives as identity (the titles), not strategy.

**Estilo de jogo** — one window for all three: the last 6 months, rolling (never tied to the ranking seasons, which reset on a fixed date). Each stat is a 0–100 rating (the count over its 100 mark, capped at 100), shown on its stat card as the name in the banner, then the score as a percentage ("54%", `MSG_STAT_RATING` — read better than "54/100"), then the count with the window, and as the bare number on the trading card (FIFA style — the common scale is what makes three different units comparable). No bars, no stars, no "nível", no titles.

| Stat | Measures | 100 = |
|---|---|---|
| Frequência | games | 40 games |
| Consistência | weeks with at least one game (not a streak) | 20 weeks |
| Território | different courts | 5 courts |

**Stat titles dropped** — nicknames per rating quarter (Frequência: Raquete de gaveta · Voltou da reforma · Cliente da casa · 24 sobre 7; Consistência: Só quer postar · Comprometido · Joga até na chuva · Força da natureza; Território: Gato de apartamento · Turista · Presidente da junta · Sem morada fixa). They carried the pig's voice, but even as a caption, then in the banner, they were one thing too many on a card that should read at a glance. Free to reuse elsewhere (diamonds, the trading card's characters).

Frequência (formerly "Momentum" — the plain word reads instantly), Consistência and Território are the three staples, each on its own axis (how much, how regular, where). Consistência counts weeks, not a streak: 20 games in 5 weeks and 20 games in 20 weeks get the same Frequência but very different Consistência, and one missed week doesn't wipe it out. The weekly streak lives on only as an XP bonus and as a diamond.

**Tarimba is dropped as a stat** — lifetime hours were "how much" again, moving with Frequência. Lifetime hours stay a stored metric (the ranking's tie-break) but aren't shown. Its titles (Ainda com etiqueta, Já tem calos, Mobília do clube, Património do ténis) are free to reuse.

**Diamonds** (`icon_diamond_color.svg`) — four lifetime feats, each earned once and kept forever, no XP of their own. Not full bars (too easy with these marks, and it tied diamonds to arbitrary maxes). Each first one is a surprise.

| Diamond | Feat |
|---|---|
| Centenário | 100 games |
| Explorador | 10 different courts |
| Inquebrável | a 26-week streak (every week for 6 months) |
| Campeão | 1st place in a season (needs `league_results`, "em breve" until then) |

**"Entende o progresso" copy (final):**
> Cada partida dá-te XP, e acumular XP faz-te subir do nível 1 ao 10. Estas são as formas de ganhar XP:
>
> Cada partida · +500 XP / Cada campo novo · +500 XP / Cada semana seguida a jogar · +500 XP / Obter passe · +1000 XP · em breve
>
> **Estilo de jogo:** mostra como tens jogado nos últimos 6 meses. Frequência, Consistência e Território (each with its icon) são medidos aqui. Cada um recebe uma nota de 0 a 100%.
>
> **Diamantes:** são as conquistas mais valiosas do Campo Livre: 100 partidas, ou 10 campos diferentes, ou jogar todas as semanas durante 6 meses, ou vencer uma época (linked to the Ranking tab).
>
> Partidas com menos de 10 min não são registadas.

**Next stat candidate — Desportivismo:** walk-ins closed by hand with "Terminar jogo atual" (`manual_finished_at`), counting only games over 10 min. Rewards freeing the court for the next player, which keeps the live status honest. Not built yet; it would have to stay on its own axis, like the three staples.

The 100 marks are a first guess, to be tuned once real play is known.

**XP** (computed in the database by `games_xp` / `player_xp`, read through `my_games_xp` / `my_xp`; drawn by `xpCard` in `player_progress.js`), shown on the **trading card** above the stat cards — its own `.trading-card*` classes (not `.ticket`), so it can evolve on its own: "Nível N" in the `.trading-card-level` banner, the pig for the current level as the player art (`.trading-card-art`, `XP_LEVEL_IMAGES`; width 90%, centred with 20px above and below, a plain image for now, not a pig appearance), the character name and flavour text (`XP_LEVEL_INFO`), the three stat ratings, then the XP bar. **Stat ratings** (`.trading-card-stats`, `statRating`): each stat against its 100 mark, 0–100, FIFA-card style — one scale for all three, so strengths read at a glance. Big number with the stat icon on the bottom-right corner; no diamonds here, only in the banner and on the stat cards. The stats can drop (the last 6 months), while the XP level is permanent; the stat cards below are the breakdown behind each number. The idea is a Magic / Pokémon style character card. XP only ever grows, so it comes from lifetime events, never from the stats' rolling values (Frequência's 6-month count can drop). Every increment is +500 XP (`XP_PER_INCREMENT`):
- each past game
- each distinct court played
- each week with a game right after another week with a game (a lone week is already paid by its games)

**Postponed, not paid today ("em breve"; see the "Pass postponed" todo):** **+1000 XP per pass** (`XP_PER_PASS`; was 3000 — postponed because no real private court has signed up yet, not over the value) — shown as "+1000 XP" on every pass card, the dummy one included, as a teaser of what's coming. A pass is a bigger step than a game: an admin vetted and approved the player. It's counted from `pass_awards`, never from `memberships`: revoking hard-deletes the pass row, and **XP never drops**. One award per scope, ever, so an admin revoking and re-approving can't farm it. The history cards no longer add up to the total for members — accepted, the difference is in the passes on top of Meus jogos.

**XP per game** (the `xp` column of `games_xp`): the same total split across games, oldest first, so each history card shows what it earned ("+1000 XP", right of the court-type row) and the cards add up to the trading card. A court's bonus goes to its first game there, a streak week's bonus to that week's first game — so a card shows +500, +1000 or +1500. `player_xp` is the sum of `games_xp` plus the passes, so the two can't drift apart. The dummy game isn't in the database, so its +1000 is fixed in JS (`DUMMY_GAME_XP`).

Numbers are inflated ×10 on purpose (big numbers, big fun) with the level ends ×10 too, so difficulty is unchanged. Shown with PT-PT grouping ("26 500").

Examples: once a week for 6 months on 2 courts ≈ 26 500 XP (level 8, the calibration target); twice a week on 3 courts ≈ 40 000 (level 10); once a month for a year on 1 court ≈ 6 500 (level 3).

Levels 1–10, each needing 500 XP more than the last (level n spans 1 500 + 500n XP, `XP_LEVEL_ENDS`). A first try at the equivalent of 4 000 + 1 000n put the once-a-week player at level 5 — too hard. Reaching a level's max XP is a level-up, so 4 500 XP is level 3 at 0%:

| Level | XP |
|---|---|
| 1 | 0–1 999 |
| 2 | 2 000–4 499 |
| 3 | 4 500–7 499 |
| 4 | 7 500–10 999 |
| 5 | 11 000–14 999 |
| 6 | 15 000–19 499 |
| 7 | 19 500–24 499 |
| 8 | 24 500–29 999 |
| 9 | 30 000–35 999 |
| 10 | 36 000+ (bar full at 42 500) |

The XP bar is the only bar on the profile, and it is relative: the fill only covers the current level. The player's total XP is written inside the bar; the level's max XP isn't shown. Past 42 500 the player stays level 10 with a full bar. Its own `.xp-bar` (yellow fill, the XP as one label).

**Character arc** — one pig character per XP level on the trading card (`XP_LEVEL_INFO` name + flavour text, `XP_LEVEL_IMAGES` art). Names and flavour texts are locked, pending the name and brand checks below. Each card is one joke: name, flavour text and (later) animation work together. First written in the `pig-animations` workspace, removed in ee12f7e; this is now the copy of record.

| Levels | Band | The joke | The motion |
|---|---|---|---|
| 1–4 | Clueless | Failure, confusion | Off-balance, wobbly holds, things go wrong |
| 5–6 | Keen amateur | A habit or an attitude | Eager, sloppy timing |
| 7–8 | Competent | A skill overdone | Strong, snappy |
| 9–10 | Pro | Swagger | Precise, confident holds, the cleanest loops |

| Lvl | Name | Flavour text | Animation seed |
|---|---|---|---|
| 1 | Raquete emprestada | Aparece para jogar com a raquete do primo e sapatilhas da Vans. Ainda tá a descobrir se é destro ou canhoto. | Passes the racket to his other hoof and stares at it, confused; shrugs; passes it back and settles in the start pose |
| 2 | Pega de frigideira | Segura a raquete como quem vai estrelar um ovo. Acerta na bola uma vez em cada cinco, e às vezes é com a cabeça. | Holds the racket flat like a frying pan, tosses the ball, swings, misses; the ball bonks the headband |
| 3 | Influenciador de campo | Se não há post, não há ténis. Os followers acreditam que tem patrocínio da Lacoste. | Holds a phone out, strikes a stiff "pro" pose with the racket, a flash, checks the phone, frowns, poses again |
| 4 | O Aquecedor | Faz quarenta minutos de aquecimento e joga dez. Diz que o segredo está na preparação. | Stiff windmill arms, side tilts, a tiny bounce on the spot — all very serious. Never touches the racket |
| 5 | Pavio curto | Acha que devia jogar como na televisão. Cada bola na rede é uma ofensa pessoal. | Swings with confidence, the ball clips the frame and flies straight up; he shakes a hoof in anger |
| 6 | Juiz de linha | Nenhuma bola do adversário cai dentro. Tem vista de águia, mas só para um dos lados. | Eyes track an invisible ball, then a hoof snaps out pointing — "fora!". A smug little nod |
| 7 | Cortador de fiambre | Desde que aprendeu o slice não bate outra coisa. Era perfeito para cortar jamón no Mercadona. | Crouches almost to the ground, the racket sweeping flat side to side like a deli slicer; the ball skims out low with backspin lines |
| 8 | Servidor público | Serve tão rápido que ninguém lhe devolve uma bola. Perde os jogos todos por duplas faltas. | A clean serve: toss, racket up, snap, follow-through; the ball leaves with speed lines |
| 9 | Supersticioso | Ajeita a fita, limpa os punhos e bate a bola sete vezes antes de cada serviço. Em equipa que ganha não se mexe. | A pro ritual: headband, wristband, crisp identical bounces, then the ready stance |
| 10 | Roger Manel Federer | Joga de olhos fechados e ainda dá conselhos a quem não pediu. Diz a lenda que já lhe pediram um autógrafo. | Twirls the racket, catches it without looking, stops the ball dead on the strings, winks |

- **Visitors are level 1 (decided):** the visitor's locked card shows Raquete emprestada, the same character as a real level-1 player — `XP_VISITOR_INFO`'s separate character and "Apanha-bolas" both go
- **Level 1 wears trainers** instead of hooves (the "sapatilhas da Vans"): generic, no logo — for the drawings
- **Real names — kept (decided 10/2026):** level 10 "Roger Manel Federer" (a real athlete) and the brands in levels 1, 3 and 7 (Vans, Lacoste, Mercadona) ship as written, without a legal check. Known risk: a famous person's name in a commercial product is protected as a personality right (Código Civil art. 72+) and can read as endorsement. If anyone objects, level 10 falls back to "Lenda do bairro"
- **Props and effects** for the drawings: a phone and a camera flash (3), backspin lines (7), speed lines (8)

### Leaderboards and social comparison

Being built — XP in the database, the opt-out, `season_ranking` and the ranking tab exist (see the Leaderboards todo); end of season doesn't yet. XP and the skill levels give every player a number, and numbers can be ranked. Comparing yourself with others is the strongest motivator in Duolingo (its leagues) and Strava (segment rankings), and it gives solo progress a reason to come back.

**Decided:**
- **Rank activity, never results:** XP, games, streak and Território all come from recorded games, so they can be ranked. Self-reported wins and losses can't be (see "Honesty" under Player progress). The leaderboard measures who plays the most, not who plays the best, and the copy should say so. One exception: the visitor's teaser board ("Os melhores jogadores de cada época…", `MSG_VISITOR_RANKING`) — it's a pitch to make an account, not a description of the ranking
- **Six-month seasons, not weeks:** players don't play often enough for a weekly table to mean anything. Fixed seasons, two a year, following the outdoor tennis year: **Época de Verão** (Apr–Sep) and **Época de Inverno** (Oct–Mar, labelled across two years: "Inverno 26/27"), in Lisbon time (`season_start` in `supabase/sql/ranking.sql`), rather than a rolling 6 months: a season *ends*, so it has a winner and results to keep. Aligned with Frequência (formerly Momentum), which already counts the last 6 months
- **What's ranked: XP earned in the season** — every increment the trading card counts, earned inside the season: +500 per game, per court never played before, per streak week, and +1000 per pass approved in the season (postponed). Season points are always a slice of XP, never a separate scale
- **Ties:** equal points share the place ("1, 2, 2, 4"); then lifetime **Tarimba** (hours on court) breaks the tie, rewarding loyalty
- **One league for everyone** — no court-group, court or city leagues yet; the player base is too small to split. Visitors aren't ranked (they have no account — one more reason to log in); admins are left out
- **No opt-in; an opt-out instead.** Every registered player is ranked, with a Participar / Recusar toggle in Dados (`profiles.hide_from_ranking`) and a line in the privacy policy (the app has none yet)
- **Names are always "R. Barbosa"** — the first initial and the surname, the only form ever shown, never the full name. Privacy by default, with nothing for the player to configure. Only the name and the score: never the courts, days or times someone plays, which would expose their routine (same concern as matchmaking). A public ranking with names is personal data in the open, so get a quick legal check before launch (see "Activity, never health")
- **Season results are kept** (a `league_results` table: the final table, saved when a season ends). They become lasting titles on the profile ("Campeão · Verão 2027", "Top 3") and a surprise: the end-of-season parcel, the pig hand lifting the player's final place
- **Show the neighbourhood, not the whole table (postponed — every player is shown for now, while there are few; trim once the table outgrows the sign):** the top three for the aspiration, then the player with whoever is just above and just below ("Estás em 7.º — 1 jogo para passares o R. Barbosa", the "1 jogo" worked out from the gap). Being told you're 43rd of 50 demotivates; a concrete next step doesn't. Players with 0 points are still listed ("0 XP", ordered by Tarimba); a player at 0 gets "Ainda não jogaste nesta época…" instead of a place
- **Tone:** the pig's cheeky voice teases instead of shaming ("Passaram-te. Vais deixar?"). Nobody at the bottom gets a mocking title, same rule as the level titles

**How it would work:**
- **Computed in the database, not the browser:** today every stat is computed in JS from the player's own rows, and RLS rightly blocks reading other players' games. Built as `season_ranking()` (`supabase/sql/ranking.sql`): it returns only the place, the "R. Barbosa" name, the season points, `is_me` and an opaque `ref`, for players who haven't opted out — never ids or raw rows. Tarimba only breaks ties and is never returned
- **XP lives in the database (done):** `games_xp` / `player_xp` (`supabase/sql/xp.sql`) compute it, and the trading card, the history and the ranking all read them, so the XP rules exist once
- **Cheating is the real risk:** a walk-in is only a declared game, and a ranking makes faking one tempting. `games_xp` already ignores games of 10 min or less and counts bookings only once past and confirmed. Guards tried and dropped for now (players won't care much yet): at most 2 games per player per day, and ignoring walk-ins that overlap another game of the same player — they'd apply to XP too, since the ranking and the trading card share one function. Walk-ins already need the location step, and bookings are backed by the admin
- **Admin angle:** an admin could see the most active players at their courts and reward them (a free game, a "sócio do mês" badge) — a candidate add-on under Degrees of Complexity

#### The board — a brutomorphic golf-tournament sign

Built in the ranking tab (`loadRanking` in `ranking.js`, `.scoreboard` in `styles.css`), basics only. See "Brutomorphism" under Rules.

- **One big sign:** green (Wimbledon), the season name on a darkened header ("Época de Inverno"; the dates live in "Entende o ranking"), columns Pos · Jogador · XP. The top is an arched cap with sharp corners (a wide `clip-path` ellipse, outlined by two layers), the foot square, no drop shadow; it stands between two green poles capped with spheres, self-shaded only. At least 10 rows, padded with blank ones. Every digit and every name is its own **plaque** sunk into the board (inset shadow), sitting in its own **slot** — a dark hole that shows once the plaque is pulled out. Place padded to 2 plaques, XP to 4 (more if a number needs them). One CSS grid, so the columns line up
- **The player's row is all white** — place, name and XP plaques. A jump in places is a blank row of plaques, like the empty lines on a real board
- **Rows are fixed, plaques move:** the place digits belong to the row (row 2 always says 2) and never animate. Only names and XP change
- **Swapping a plaque** (`plaque-out` / `plaque-in`, chained in JS because one keyframe can't change the text halfway): someone behind the board pulls the right side back first (a hinge on the left edge: 10° for names, 25° with a closer perspective for the narrow digits, `--hinge`), slides it right out of the slot, relabels it, and slides it back. `transform` only; off under reduced motion
- **An update** (`updateRows`): every shown row is handed its final content and only the plaques that differ move. **Names first, as a swap:** the player's plaque is pulled first, then the other; with both slots empty they're exchanged (the white follows the player's name); the player's goes back in first, then the other. **Then the numbers:** both rows at once, each left to right, 1s per digit. Moving the name before its number means each row's digits change once, straight to their final value — an overtake from 5650 to 6000 past a 5890 is 2 names and 5 digits
- **The line under the board** — the board's punchline in the pig's voice, `.info-sub1` (big, bold), 20px under the sign (it sat above in small description type and got lost; the visitor's login nudge, `MSG_VISITOR_RANKING`, stays above as a description like every pane's) — tells the news straight away, without waiting for the plaques: `MSG_RANKING_OVERTAKE` ("Máquina! Ganhaste 350 XP e agora vês R. Barbosa pelo retrovisor."), `MSG_RANKING_GAINED` or `MSG_RANKING_DROPPED` ("Tragédia anunciada: caíste de posição. Não deixes ficar barato."), then where the player stands now (`rankingLine`: "2 jogitos e deixas R. Barbosa para trás.", first, tied, zero, or the opt-out line linking to Dados)
- **Only good news animates:** a player who dropped a place gets the new board straight away, and it's saved so the drop never replays
- **Each change plays once, on any device:** `ranking_views` keeps the board as the player last saw it this season. The next visit compares it with the live ranking and animates the difference, then saves the new board — only after it has played (or straight away after a drop), so a board never opened still plays next time. A first look this season just shows. Who passed whom is told apart by `ref`, never the display name
- **"Entende o ranking"** under the board is the admin's collapsible rules card, closed by default: every way to earn points (`XP_RULES`, the same list as Entende o progresso — display only, keep in step with `games_xp`), the season reset, both seasons' dates, and the opt-out with a link to Dados

**Testing the dummy overtake** (fake numbers, nothing saved):
1. Be logged in as a player set to **Participar** in Dados, with at least one other ranked player (alone, you're 1st and there's nobody to pass)
2. Open `profile.html?board=overtake` (e.g. `http://localhost:8080/profile.html?board=overtake`)
3. Open the **Ranking** tab — the update only starts once the board is on screen. You're put 3rd with 5650 under a 5890: after 1s the two names swap, then both rows' numbers change, and the line reads "Máquina! … pelo retrovisor."
4. `?board=gain` instead plays a gain without moving (5650 → 5800, "Ganhaste 150 XP desde a última vez."). Reload to replay

**Feeds matchmaking later** (see "Player matchmaking"): ranking neighbours play about as much as each other — a natural "people like you" — and Consistência / Território say who plays regularly and who likes new courts. But activity isn't skill: a keen beginner and a rare expert can have the same XP, so matchmaking still needs a skill signal (self-declared level, post-game results). Where and when people play is the most useful match signal and the most private, so matching happens on the server and only ever says "found someone", never the other player's routine. Keeping the XP in the database and the season snapshots is what makes this possible later.

#### Seasons and events — boosting the ranking

Events give a season a rhythm: something new to chase within the six months, and a reason for a lapsed player to come back.

- **Season points, separate from XP:** XP only ever grows and drives the character level, so it stays untouched. A season has its own points, which start at zero and are ranked for that season only. A game earns both: the usual XP plus the season points, with any event bonus applied to the season points alone. The character level never inflates from a double-points weekend
- **Winter needn't be a dead season — but no flat winter boost (decided):** each season is its own table, so a multiplier on every winter game changes nobody's place; it would only inflate the trading card in winter, or break "season points = a slice of XP". It would also push players onto wet, slippery courts. Keep winter alive with the rain freeze (a rainy week doesn't break the streak), one-off events (double-points weekend, explorer week) and the off-peak booking bonus instead. If weather ever enters the points, only as a bonus on rainy-day games applied to XP and season points alike, which needs past weather stored in the database
- **Event ideas:**
  - Double points weekend: the simplest boost, and an easy way to test whether events move play at all
  - Local calendar: Santos Populares in June, the Aveiro summer, school holidays. Portuguese moments suit the pig's voice
  - Explorer week: bonus points for a court you've never played (feeds Território and pushes players to new courts)
  - Off-peak bonus: extra points for booking empty weekday slots. This is the admin's angle, since it fills hours that would otherwise sit empty
  - Admin events: an admin runs their own event for their group (a "torneio de verão", a points bonus on a new court). A candidate add-on under Degrees of Complexity
- **End-of-season rewards:** cosmetic only — the titles above, or a special pig outfit for the top players (ties in with the per-level pig drawings) — never booking perks, so the ranking can't turn into a paywall or a fight over slots
- **Risks:**
  - Bonuses make cheating pay more. An event bonus should only apply to games that are hard to fake (bookings, or walk-ins confirmed by the post-game card)
  - Too many events at once: one at a time, so each still feels special
  - Complexity: events are a multiplier on top of the season points, with a scope and a date range. One small table (`events`: scope, starts_at, ends_at, multiplier, rule), not new logic per event
- **First step:** after the first season runs plainly, a single double-points weekend — enough to see whether players notice before building an event calendar

### Surprises — tear-strip reveals for important moments

Decided, being built. The tear strip (`tear-reveal.js`) is a promise that something special is inside. If it revealed whatever page happened to be underneath — a random court page, a pass sitting on the profile — the promise falls flat and players learn to ignore it. So a parcel always reveals a **scene** made for that moment, never the page.

- **A scene is its own layer**, between the page and the parcel. Tearing reveals the scene; the page stays hidden behind it. So the check can run on any page (court list, court page, profile) with no redirects
- **One preset per kind of surprise** in a new `js/reveals.js`, like `SUCCESS` in `success.js`: `showReveal(REVEALS.passApproved({ … }))`. A new important event means a new preset and scene, never an inline one
- **Every scene ends in one next step** (e.g. "Reserva o teu primeiro jogo" to the group's court). A surprise that ends in a dead end wastes the moment. Always (decided)
- **Detected on the next app open**, not in real time: one small query per page load. There are no push notifications, and players rarely watch at the moment an admin acts. Realtime (Supabase websocket) can come later on top if instant ever matters
- **Played once per event:** marked revealed only after the strip is torn, so a parcel left unopened waits for the next visit. Recorded generically in `revealed_surprises` (`kind` + `ref`), not per feature — level ups and diamonds have no database row, they're computed in JS. For a pass the `ref` is the `passes.id`, not the group, so a pass revoked and later re-approved is a new row and plays again
- **Keep it rare**, or it stops being special. Deserve a parcel: pass approved, level up, a diamond, end of a season (later). Don't: booking confirmed, walk-in started — those have their success screens
- **Tone:** the pig's voice carries it; no confetti (see "Tone" under Player progress)
- **Motion:** plain CSS 3D, cheap on phones; a simpler version for players who ask their phone for reduced motion

**First scene — pass approved: the pig lifts the prize.** A pig hand rises from the bottom of the screen and lifts the pass up like a champion lifting a medal, with excitement. It's Campo Livre's own voice — the cheeky pig, excited *for* the player — where a turning card was a generic effect. The same hand can lift every future prize (a level badge, a diamond, a season trophy), so one drawing becomes the signature of all surprises, and it's the natural first job for the Rive todo. Later: holding it by the lanyard like a medal ribbon, the badge swinging below the fist (left out for now, too complex); +1000 XP count-up and a level-up line; one pig line.

**Built so far:** "O teu passe foi aprovado" high on the screen, then a "Reserva o teu primeiro jogo" button (`icon_court`) to the group's first active court (no button if it has none), then the pass lifted by the pig hand (`images/pig_hand.svg`, `.prize-arm`) below them, and "Pra já não" as a fixed `.info-link` without its pink bar, so the hand shows behind it. A preset gives its `text` and `prize` separately and `showReveal` lays them out, so every scene keeps that order; the scene starts from the top rather than centring, leaving the lower screen for the prize and hand.

**The prize lift** (`.prize-lift` / `.prize-bob` / `.prize-arm` in `styles.css`, markup in `REVEALS.passApproved`):
- Beats, timed from the burst (`onBurst` in `tear-reveal.js`, the instant the box bursts — not `onDone`, which waits for the peanuts to fade): 0.25s wait → a rise from just below the screen (`--lift-from`, measured in `showReveal` on the prize itself: its top edge starts on the screen's bottom edge and enters the moment it moves — a fixed 100vh wasted the start below the screen) that takes 0.4s and stops right at its spot (ease-out, no overshoot, no spring back; an earlier 30px overshoot and settle was dropped). The idle starts the moment it arrives (0.65s), on its own layer and properties: heavy breathing (a quick 3px inhale up, a slower exhale down, every 1.4s, on `translate`) plus a slow rock (±0.5deg every 4.5s, on `rotate`, pivoting on an imaginary elbow 300px below the card, so it swings sideways and tilts at once). Separate properties so the two don't fight; the two lengths never line up the same way twice, so it reads as alive. The lift itself is vertical only — sideways shakes during it were tried and dropped
- Two layers because each animates `transform`: `.prize-lift` runs the one-off lift, `.prize-bob` inside it the breathing. Only `transform` animates, so it runs on the GPU
- Held below the screen until the box bursts (`.opened` on the scene), so the lift plays while the player is looking. Already in place and still under `prefers-reduced-motion: reduce`
- The arm overlaps the card's bottom edge in front of it, as if gripping, and runs off the bottom of the screen — the scene clips instead of scrolling (`overflow: hidden`), and the scene's button sits above the arm (`z-index`) so the arm can't take its taps
- **Drawing the pig hand:** SVG in the pig's style (same pink, black outline); the forearm entering from the bottom edge with a closed fist at the top; ideally two layers — the back of the fist behind the prize and the fingers in front, so it reads as gripping rather than stuck on; fist about a third of the card's width (card max 400px, so ~120–140px across)
- **Tried and dropped: a 3D turning card** (plain CSS `rotateY`, thickness, two faces). It worked and was cheap, but read as a bit cheesy

### Court suggestions in the passes view

Future exploration, not planned yet. The player's passes view is a natural place to suggest and advertise courts, with prices and promos. The player is already thinking about which courts they belong to, so "courts you could join" reads as help rather than an ad.

- **The empty state becomes the pitch:** the pass section's "em breve" line (`MSG_PASSES_SOON`) is already an invitation, so suggestions sit right under the pig. Players with passes see them below their own cards.
- **Walk-in history is the targeting signal:** we know where and when a player uses public courts ("Sábados de manhã em Aveiro. O campo X, a 2 km, tem slots ao sábado por €Y"). It's a direct funnel from free walk-ins to paid bookings, the thing admins care about.
- **Prices exist, promos don't:** `court_groups.price_per_slot_cents` can go on the card today. Promos ("primeiro jogo grátis", discounts for new members) would be a new admin feature, and a candidate add-on under Degrees of Complexity.
- **Possible revenue:** admins could pay for placement. Sponsored suggestions must be clearly labelled "patrocinado", both for trust and because EU consumer law requires ads to be identifiable. Keep sponsored and organic suggestions visibly separate.
- **Limit the clutter:** one or two suggestions at most, always below the player's own cards, and never in the history view.

### Player matchmaking

Future exploration, not planned yet. Finding someone to play with is the main barrier in tennis, and Campo Livre already knows who plays where and when. Possibly the strongest reason of all to use the app.

- **Signals we have:** courts, days, times, frequency, city. **Missing: skill level.** Start with a self-declared level (iniciante / intermédio / avançado); the player progress card's win/loss answers could refine it later.
- **Flows, lightest to heaviest:**
  - Open spot on a booking: "falta 1 para pares", and other members can join
  - Live walk-in signal: "estou no campo, alguém quer jogar?", which fits the app's existing real-time status
  - "Procuro parceiro" post for a court, day and time
  - Suggestions: "jogadores com o teu nível que jogam aqui aos sábados"
- **Fills a data gap:** "who you played with" is missing from activity stats and player progress, and matchmaking records it naturally.
- **Account required:** anonymous players can't be matched, which is another reason to log in.
- **Safety and privacy are the real cost:**
  - A player's routine (where and when they play) is sensitive, so matchmaking is strictly opt-in.
  - First names only. Never expose the phone number stored in `profiles`.
  - Contact happens in the app.
  - Needs blocking and reporting, which is a moderation burden. Minors complicate everything.
- **Chicken and egg:** matching needs density. Start inside one court group's member base, where players already share a court and an admin who vouches for them. That solves density and trust together.
- **First step:** an opt-in "falta 1" spot on a booking, visible only to that group's members. Least moderation, most existing trust.

## Open Questions

### Edge cases

**a) No-show** — Player doesn't show up — do they still pay?
→ Yes. The slot was held and the court lost the opportunity to give it to someone else. Booking confirmed = payment owed, regardless of presence.

**b) Player cancellation**
→ Free cancellation if cancelled more than 48h before the slot starts. Less than 48h = full charge, slot is freed but payment is still owed. Admin can always waive manually as an exception.

**c) Rain / force majeure** — Who cancels when it rains — player or admin?
→ Admin-initiated only. Player can't self-cancel and claim weather. Admin marks the slot as `cancelled_weather`, all affected players are automatically waived and unblocked. Admin should be able to do this proactively if the forecast is bad.

**d) Admin forgets to unblock**
→ Auto-unblock after 24h from `ends_at`, flagged as auto-released (not manually confirmed) so the admin can see it. Player can also tap "já paguei" to send a notification nudge to the admin — without being able to self-unblock.

### Things to decide before building

- **Pending approval UX** — player is registered but not yet verified. They need a clear "aguarda aprovação" state so they don't think the app is broken.
- **Admin scope** — is it one admin per court, or one admin managing multiple courts? A municipal receptionist might manage 3 courts. Affects whether the admin entity sits above or alongside the court entity in the data model.
- **Pricing** — flat rate per hour, or variable by time of day / weekday vs weekend? If variable, need a pricing table per court, not just a single `price_per_hour` column.
- **MBWay number** — whose number does the player pay? The court's dedicated number or the receptionist's? Must be configurable per court in the admin dashboard.
- **Reference format** — sequential reservation IDs leak booking volume. Use a short opaque code instead: `CPL-4X7K`. Must fit MBWay's free-text character limit (~20 chars).

## Implementing the MVP

### Authentication

Supabase Auth is already included — email OTP is a built-in provider, no extra infrastructure needed.

**Login is a code, not a magic link (10/2026).** The email carries a 6-digit code the player types on `login.html`, so the session lands exactly where they asked for it. A link opened in whatever browser the mail app picks — on iOS never the installed PWA, which keeps its own storage apart from Safari's — so installed-app players could never log in. The Supabase email templates **"Magic Link"** and **"Confirm signup"** (Authentication → Emails; brand-new emails get "Confirm signup") must show `{{ .Token }}` and no link, in Portuguese.

**What Supabase manages automatically:**
- `auth.users` — email, session tokens, last login. Not touched directly.

**What we create:**
- `profiles` table — extends `auth.users` with fields we own (name, and future registration fields)

**Audience terms:** see the Glossary (visitor, registered player, member, admin).

**Roles:** one email = one role. An account is either a **player** or an **admin**, never both (an admin who also plays is too rare to design for). Admin = owns at least one `court_groups` row.

**Login flow:**
1. `login.html` — player submits their email (`signInWithOtp`), then types the code from the email on the same screen (`verifyOtp`, type `email`); "Pedir novo código" resends it. Already logged in → straight to `profile.html`
2. Once the code is accepted, `login.js` sets a one-shot `localStorage.justLoggedIn` and goes to `profile.html`, which is also the post-login router (`js/profile.js`):
   - **Admin** → `admin.html` (admins have no `profile.html`; their profile is a view inside the dashboard)
   - **No `profiles` row** → `onboarding.html` (`js/onboarding.js`): 3-step onboarding (name required; phone, NIF optional), then back to `profile.html`, which continues below
   - **Came from a court page** → back to that court (see "Return to court")
   - **Otherwise, just logged in** (`justLoggedIn`) → the court list. The flag is set only after a real login, so it never lingers
   - **Otherwise** (avatar visit) → the player profile
3. `admin.html` bounces anyone who owns no group back to `profile.html`

**Return to court:** "Fazer login" on a court page stores that page in `localStorage.returnTo`; `profile.js` reads and clears it once the session exists (after onboarding for new players). One-shot. Known gap: a player who taps "Fazer login" and backs out keeps a stale `returnTo` until their next login.

**Profile entry points:** avatar icon (`icon_avatar.svg`) in the header — court list and court pages link to `profile.html`; in `admin.html` it opens the dashboard's own profile view (replaced the old gear tab in the nav).

**Visitors on `profile.html`:** a logged-out visitor is no longer redirected to login. `showVisitor()` renders the same four-view toggle as a registered player's profile: history shows their walk-ins (matched on `device_id`, unclaimed only — see below) plus a "Fazer login" button, and the stats, passes and personal info views hold only that button, because someone who only plays walk-ins still has a history worth seeing and no reason to make an account. An explicit **Terminar sessão** still goes to `login.html` — that's a deliberate exit, not a browse.

**Unclaimed walk-ins only:** the visitor query also requires `player_id IS NULL`, so it shows exactly what `claimDeviceWalkIns` hands over on login. A player who logs out sees an empty visitor history (their games belong to the account) — accepted, a player has no business using the app logged out. It also keeps a borrowed phone from exposing the previous player's routine.

**Visitor teaser (decided, being built):** every view shows the same content as a logged-in profile, with locked static dummy data where the visitor has none. The visitor's real walk-ins are never fed into the dummy progress; they only drive the teaser line.

| View | Visitor with walk-ins | Blank visitor | Player with no games |
|---|---|---|---|
| **Progress** | Dummy cards, "Já tens N XP à tua espera…" under the XP bar | Dummy cards, "O teu primeiro jogo vai valer logo 1000 XP." under the XP bar | Unchanged |
| **History** | Their real games with XP + "Fazer login" | 1 locked dummy card (+1000 XP), no button | 1 locked dummy card, no pig |
| **Passes / Dados** | Locked dummy | Locked dummy | Unchanged |

- **With walk-ins, loss aversion:** the XP is theirs already, and logging in is what saves it. "N" is the summed `games_xp` of their unclaimed walk-ins, exactly what the account receives on login
- **Blank, a concrete next step:** they have nothing to lose yet, and an empty account gains nothing. 1000 XP is exact: a first game always earns +500 for the game and +500 for the new court
- **No buttons on the previews:** the progress view has none, and the blank history has none either — an "Encontrar campo" under the dummy card made the card itself look clickable. The only button is "Fazer login" under a visitor's real history
- **The history proves the number:** each card shows the XP it earned, so the teaser total can be traced game by game. The single dummy card shows +1000, matching the blank visitor's promise
- **The dummy progress is the dummy first game** (the same "Minha primeira partida" as the history card), so the XP is 1000 and every level is 1, for every visitor. On top of it, `loadProgress`'s teaser mode pins the trading card's ratings and the stat cards' numbers at 0 — an empty starting point. The trading card shows the level-1 character, Raquete emprestada, like a real level-1 player's (the character arc decided visitors are level 1); the teaser sits inside it, under the XP bar
- **The XP bar is static** — a looping fill (`fill-grow`) was tried and removed. It had taught one rule that still holds: animating `width` forced a layout on every frame, and animating `--fill` needs `@property` and jumped. **Rule for any looping or long animation: only `transform` and `opacity`**

**Redirect URL allowlist:** no longer used by login (codes don't redirect) — kept for any future email link. Supabase only returns links to URLs listed in Authentication → URL Configuration → Redirect URLs; anything else falls back to the Site URL. Site URL is `https://publiccourt.vercel.app`. The list (`*` matches anything except `.` and `/`):

```
http://localhost:3000/**
http://192.168.*.*:3000/**
http://localhost:8080/**
http://192.168.*.*:8080/**
https://publiccourt.vercel.app/**
https://publiccourt-*-public-court.vercel.app/**
```

The LAN patterns survive a new IP on either network; the last line covers every branch preview (e.g. `publiccourt-git-bookable-mvp-public-court.vercel.app`).

**Testing a logged-in walk-in locally — one origin:** geolocation needs a secure context, so the walk-in check-in only works on `localhost`, never on `192.168.x.x` over HTTP. Sessions and `device_id` are per-origin, so log in on the same address you check in on — a session on the LAN IP isn't seen on `localhost` (`player_id` stays null, and the "is this my game?" check fails). With codes this is just "type the code on the address you're testing"; use the LAN IP only for a real phone, where the location step won't work anyway.

### Sessions

Sessions are kept alive indefinitely for active users. Supabase auto-refreshes tokens in the background.

- A login code is only needed on first login, after explicit logout, or after session expiry
- Session expiry window is configurable (e.g. 30 or 90 days of inactivity)
- If an admin revokes a player's access, their session is invalidated server-side via the Supabase admin API
- New devices (and the installed app vs the browser) always need their own login code — sessions don't transfer

### Todo

- [ ] **Ship `bookable-mvp` to `main` (week of 2026-10-06).** From the readiness review (public court pages, account flows, deploy). The walk-in flow — the live feature — matches `main`. Passes and bookings ship as "em breve" teasers; the test group (10) is reachable only by manual URL, accepted
  - **Must fix before shipping**
    - [x] Merge `main` into the branch. Conflicts: `js/court.js` (stays deleted — split into `court-stage.js` / `court-walkin.js`…) and `js/court-list.js` (keep the branch's; `main`'s fix was the `reservations` → `walk_ins` rename, already done here)
    - [x] Port `main`'s location-permission hint (commit 62a517f, "Se o telefone não pede permissão, o bloqueio pode estar em 2 sítios…", iOS and Android, 0.7em) into `court-walkin.js`, which still has the old "Se negaste a localização…"
    - [x] Service worker: `SHELL` still pre-caches the deleted `/js/court.js`, so `cache.addAll` fails and the worker never installs. Drop it (or list the new court scripts) and bump `CACHE` to `campo-livre-v9`
    - [x] `.vercelignore`: without it the deploy serves `CLAUDE.md` (schema, RLS notes, project ref), `flows.md`, `js/db_fill.md` and `supabase/` as public URLs
    - [x] `success.js`: `MSG_BOOKING_CANCELLED` was the placeholder "Tu finish" — now "Cancelaste o jogo marcado para …", mirroring `MSG_BOOKED`
    - [x] Login from the installed PWA on iOS: the magic link opened in Safari, never the app. Login is now a code typed on `login.html` (`verifyOtp`) — see "Login is a code" under Authentication
    - [x] Custom SMTP for Supabase Auth — it also unlocks editing the email templates, which the login code needs. **Tried Gmail (10/2026), dead end:** app passwords weren't available on the new account even with 2-Step Verification and a phone. A free `@gmail.com` sender through Brevo or similar fails Gmail's 2024 sender authentication and lands in spam. `vercel.app` can't send email (no DNS access). So: buy a domain
    - [x] Bought `campolivre.app` (Vercel, €9.99) — see "Resend" under Backend Services. Buy a domain (~€10–20/yr, Vercel → Domains, so its DNS lives in Vercel), verify it in Resend (paste its DNS records into Vercel), create a Resend API key, and set the SMTP to Resend. Supabase's built-in email is a test service: a few emails per hour, and it may only deliver to the project team's addresses — public registration breaks on it. Needs a domain verified in Resend (DNS records), then Supabase → Authentication → SMTP Settings: host `smtp.resend.com`, port 465, user `resend`, password a Resend API key, sender on the verified domain (e.g. `Campo Livre <entrar@…>`). Then raise the auth email rate limit (Authentication → Rate Limits). The same verified domain unblocks `notify-pass` (its `from` is still the sandbox `onboarding@resend.dev`, see "Email notifications currently broken")
    - [ ] Supabase URLs to the real ones: Authentication → URL Configuration → Site URL to the production address (`https://publiccourt.vercel.app`, or the custom domain if one comes with the Resend domain), and the Redirect URLs to match (keep `localhost` / LAN for development). Login no longer redirects, but the Site URL still appears in auth emails and any future link
    - [ ] `info.html`: describe what ships — login by code, the profile (progress, ranking, Meus jogos), the visitor history, passes as "em breve" — today it only covers the walk-in app. And the contact email: still the duck.com alias (`early-serve-duffel@duck.com`); move it to an address on `campolivre.app` (e.g. `contacto@`), which needs receiving set up — Resend only sends, so add email forwarding for the domain (e.g. ImprovMX or Cloudflare Email Routing, free) to your inbox
    - [ ] Rethink the visitor bait on court pages: "Anda cá ver o teu progresso" is a one-line card, too small to pull anyone in. Show the reward instead of describing it: a mini trading card (the pig art, "Nível 1 · Raquete emprestada", the yellow XP bar with "1 500 XP à tua espera", "Faz login para não perderes"; a blank visitor sees 0 XP and "O teu primeiro jogo vale 1000 XP"), still closable. Pair it with the success screens' "+XP" line (see "Success screens show what the game earned"), where the XP is most real. Mock it first to judge the size. Also: it can stack with the install nudge — show one at a time
  - **Character arc for levels 1–10** (trading card)
    - [x] Names and flavour texts: all ten in `XP_LEVEL_INFO` from the "Character arc" under Player progress; visitors show level 1, Raquete emprestada (`XP_VISITOR_INFO` and "Apanha-bolas" gone)
    - [x] Real names (level 10, brands in 1, 3, 7): kept as written, no legal check — decided 10/2026, fallback for 10 "Lenda do bairro" if anyone objects
    - [ ] Pig images per level: `XP_LEVEL_IMAGES` uses 3 placeholders for 10 levels — fine for shipping, drawings later. The newer `pig_master.svg` (the base drawing) is on the PC — bring it in; the one in git (ee12f7e^) is an older version
  - **Check in the dashboards**
    - [x] Supabase has every SQL file live (checked 10/2026 with one query: functions, ranking_views, hide_from_ranking, weekly_metrics + courts, pass XP off, name locked): `xp.sql`, `ranking.sql` (incl. `profiles.hide_from_ranking`), `court_groups.sql`, `metrics.sql`
    - [x] Email templates "Magic Link" and "Confirm signup" (brand-new emails get the second): show `{{ .Token }}`, no link, in Portuguese — login breaks without the code in the email
    - [x] Vercel Analytics is switched on (ad blockers hide some visits — see "Usage metrics")
  - **Should fix (can follow right after)**
    - [x] Debug switches (`?surprise`, `debugSurprise()`, `?board=`) work only on the dev server (`IS_DEV` in `utils.js`: localhost or a 192.168 LAN IP), never in production or on Vercel previews
    - [ ] Stale `localStorage` flag: (`justLoggedIn` fixed — now set only after the code is accepted) `returnTo` (set by "Fazer login" on a court) can return a much later login to an old court
    - [ ] Leaving onboarding halfway: logged in with no `profiles` row — "jogador" on court pages, `player_name` null on walk-ins, out of the ranking, and `hasLoggedIn` already set so the next login says "Bom tê-lo de volta"
    - [ ] `notify-pass`: sender now `passes@campolivre.app` and the debug logs are gone (redeploy from the dashboard). Still open: it doesn't check who calls it — low impact while passes are postponed
  - **Can wait**
    - [ ] Nudge close controls are `<div>`s, not buttons (keyboard / screen readers can't close them)
    - [ ] The header pig's eye animation no longer replays on load (the inline-SVG swap from `main` is gone)
    - [ ] `court-stage.js` imports `court-bookable.js`, `slot-picker.js` and `weather.js` statically: a load error in any blanks the walk-in page. A lazy `import()` in the bookable branch would decouple them
    - [ ] Lost back icon on the check-in screen's "Voltar"; a name with `"` breaks going back in onboarding; a page can hang on "A carregar..." if `access_token` comes without a session
    - [ ] Already on `main`: a court with no walk-ins in 15 days shows a made-up occupancy chart; `court.html` with no `?court=` shows English debug text
- [x] Get the player to login and land on profile page
  - [x] Differentiate first login (sign up — player chooses a name) from returning login (sign in — just requests a magic link) — no `profiles` row routes to onboarding; `login.html` shows newcomer or returning copy based on a per-device `localStorage.hasLoggedIn` flag set by `profile.js`
    - [x] Newcomers get `pig_reaching` ("Bora usar o Campo Livre a sério?"), the account pitch and a "login is optional for public courts" note; returning players get a single line
    - [x] "Voltar" back link on `login.html`; a failed send keeps the form and restores the button
  - [x] After a magic link, land on the court list (not the profile), unless login started from a court page or it's a first login (onboarding)
- [x] Get the player to register to the admin (simple as possible)
  - [x] Create `memberships` table with `player_id`, `court_id` (nullable), `group_id` (nullable), `status`, `denied_reason`, `created_at`, `approved_at`
  - [x] Unique constraint per `(player_id, court_id)` and `(player_id, group_id)` to prevent duplicate requests
  - [x] ~~Hard-delete rows (no soft-delete) so player can re-apply freely~~ — superseded: a player's re-request now revives the row (see "Re-requesting revives the row" under `passes`); only an admin's revoke still hard-deletes
  - [x] Court page shows "solicitation pending" state when pass row exists with status = pending
  - [x] A pass scoped to `group_id` covers all courts in that group; booking always references a specific `court_id`
- [x] Get the admin to login and land on dashboard (simple as possible)
- [x] Get the admin to see and validate the player registration
  - [x] Admin can approve or deny a pass request
  - [x] Denial must include a `denied_reason` field; player sees the reason on the court page with option to re-apply
  - [x] In-app notification: player sees approval/denial state on next court page visit
  - [x] Email notification: Supabase Edge Function triggered on pass status change
    - [x] Create Resend account and get API key
    - [x] Deploy Edge Function: receives pass id, fetches player email + status + denied_reason, sends email via Resend
- [x] Get the admin to see the full pass list
  - [x] List all approved passes with player names and approval dates
  - [x] Admin can revoke access from this view (hard-delete `memberships` row)
  - [ ] Email notification to player when revoked — send before deleting the row so we still have their email
  - [ ] Allow admin to set pass duration per member on approval (override the group default)
  - [ ] In-app notification card for pass status changes (accept, deny, revoke) — dedicated card UI, not just inline state on court page. Accept is covered by the pass-approved surprise; deny by the orange refused card on top of Meus jogos. Revoke is still silent: the row is deleted, so the pass just disappears
  - [x] Tear-strip reveal (tear-to-open) for important notifications: the notification arrives sealed like an Amazon-style parcel, and as the player drags up they pull the tear strip away to open it (the tear follows the finger; releasing early snaps it back) — built as `tear-reveal.js`, now the wrapper for surprises
  - [ ] Surprises (see "Surprises — tear-strip reveals for important moments" under High Level Thoughts)
    - [x] SQL: generic `revealed_surprises` table, backfilled with every pass approved before the feature
    - [x] Label on the parcel: always the same, "Recebeste encomenda. Tu sabes o que fazer." (the `tear-reveal.js` default) for every surprise — the parcel never hints at what's inside
    - [x] Next step on the pass-approved scene: "Reserva o teu primeiro jogo" (`icon_court`) right under the heading, 10px below it, with the prize 30px below the button
    - [x] ~~Pass-approved scene as a static mockup first~~ — superseded: built live instead, tuned with `?surprise`. Still to add from that list: XP count-up, level-up line, pig line (the stage, spotlight and turning pass were dropped for the pig hand)
      - [x] ~~Simplest 3D card~~ — built, then dropped as a bit cheesy
      - [x] Prize lift with a placeholder arm: lift, excited shakes, idle bob (see "The prize lift")
      - [x] Draw the pig hand (see "Drawing the pig hand") and swap it in for `.prize-arm` — `images/pig_hand.svg`, two groups on one artboard: `#hand` (forearm, cuff, palm, fingers) drawn behind the prize and `#thumb` in front, each as its own `<svg><use href="images/pig_hand.svg#…">` with the same viewBox and `.prize-arm` box, so they stack exactly. Page order is the layering (hand, prize, thumb), no `z-index`. `<use>` ignores ancestors' transforms, so each group carries the whole transform itself (the export's two wrappers folded into one) — keep that when re-exporting. The prize sits 40px deeper into the grip — done by lifting the hand (`calc(-11% - 40px)` on `.prize-arm`), not by nudging the card down, which moved the whole prize lower on screen — and is solid white (`.prize-bob > .ticket { background: var(--white) }`) — the ticket's `--muted` let the hand behind it show through
    - [x] `js/reveals.js`: `REVEALS` presets + `showReveal()` renderer (scene layer, then the parcel on top). Proof of concept: the scene is the pass ticket exactly as the profile draws it (`passCard`, moved to `js/pass-card.js`), "Reserva o teu primeiro jogo" to the group's first court, and "Pra já não"
    - [x] Check on open: court list, court page and profile compare the player's approved passes with their `pass_approved` rows in `revealed_surprises`; tearing inserts the row
    - [ ] Level-up and diamond surprises need a baseline: the first time their check runs, record the player's current level and diamonds silently, so nobody gets a parcel for something done months ago
    - [x] Reduced-motion version of the scene — the prize sits already in place, still, under `prefers-reduced-motion: reduce`
    - [ ] Next surprises, one at a time: level up, a diamond; later end of a season
- [ ] After shipping `bookable-mvp`, in a quiet week: move the site to `campolivre.app`. Vercel → project → Settings → Domains → add `campolivre.app` (DNS already in Vercel; `.app` forces HTTPS, which Vercel serves). Then redirect `publiccourt.vercel.app` to it — path and query are kept, so every printed QR code (`court?court=…`) still lands on its court. Update Supabase's Site URL and Redirect URLs, `manifest.json` if needed. Cost: storage is per address, so visitors arrive fresh (their `device_id` and unclaimed walk-ins stay on the old address) and logged-in players log in once more; installed apps keep working through the redirect
- [ ] After shipping `bookable-mvp`: tease the slot picker while bookings are "em breve". Never on a court page — no fake court on the list, and no real court advertising bookings it doesn't have. Options weighed: a read-only demo grid (`renderSlotPicker` `readOnly`, dummy hours and bookings) in a collapsible card by the dummy pass — dropped as too hidden; the info page as "Como funciona" — more discoverable, further from the pass. Until then the dummy pass's "próximo jogo" line is the only booking hint
- [ ] Support multiple admins per court group (receptionists)
  - [ ] Create `court_group_members (group_id UUID, user_id UUID)` table
  - [ ] Migrate existing `court_groups.admin_id` rows into `court_group_members`
  - [ ] Update RLS policies to check membership in `court_group_members` instead of `admin_id`
  - [ ] New receptionists added manually via Supabase dashboard (no invite flow for now)
- [ ] More court rules
  - [ ] Max active bookings per player
  - [ ] Advance booking window (how many days ahead a player can book)
  - [ ] Cancellation deadline (hours before slot for free cancellation)
- [x] Get the admin to set court availability — covered by opening hours, pauses and slot length (`court_opening_hours` + `court_groups`); no separate `slots` table needed
- [x] Get the player to see the availability calendar and book a game
  - [x] `bookings` table: `id, group_id, player_id, court_id, start_at, end_at, status, created_at`
  - [x] Player must have an approved `memberships` row for the court's `group_id` to be allowed to book
- [x] Get the player to cancel a booking
  - [x] Update `bookings` row status to `cancelled` (two-step Cancelar/Voltar confirm, mirrors admin's revoke flow)
  - [ ] Cancellation rules apply (free >48h before, full charge <48h)
- [ ] Figure out the rescheduling/cancelling process for bad weather — who triggers it, whether players get offered a new slot or just a waiver, and how it ties to the forecast icons (starting point: edge case (c) under Open Questions)
- [x] Add success pig views after booking and after cancelling a booking
  - [x] After booking: "Jogo reservado" (`SUCCESS.booked`), then reload
  - [x] After cancelling a booking: "Jogo cancelado" (`SUCCESS.bookingCancelled`), sad tone, `pig_sitting`, no ball
  - [x] Move the walk-in "Bom jogo" and "Obrigado" screens in `court-walkin.js` onto `showSuccess()` — all four screens now come from `SUCCESS` presets in `success.js`
  - [ ] Success screen when an admin cancels a booking from the dashboard
  - [x] Hide the header's avatar (user) icon on success screens — `body:has(.info-pig) .header-profile`, `visibility: hidden` so it can't be tapped either
- [ ] Player profile page (`profile.html`)
  - [x] Magic link returns the player to the court they started login from (`localStorage.returnTo`)
  - [x] Header avatar icon links to the profile (player) / opens the dashboard profile view (admin, replaces the gear nav tab)
  - [x] Add the Vercel production + preview URLs to Supabase's auth Redirect URLs (see "Redirect URL allowlist")
  - [ ] Test the loop for a new user (onboarding → back to court) and a returning user (straight back to court)
    - [x] Returning user lands back on the court
    - [ ] New user after onboarding: back to the court if login started there, otherwise the court list (was: stayed on the profile — retest with the `justLoggedIn` change, same browser)
  - [ ] Check what happens when a new user leaves mid-onboarding (e.g. via "Voltar"): no `profiles` row exists yet, so they're logged in but nameless — court pages fall back to "jogador", and booking/pass requests may go through without a name for the admin
  - [x] View and edit personal info (name, phone, NIF) — email shown read-only; save disabled until something changes, name required
    - [x] Confirm `profiles` has an UPDATE policy for the player's own row — saving works
  - [x] "Teus jogos passados": booking history (`bookings` by `player_id = auth.uid()`) plus walk-in history
    - [x] Add nullable `walk_ins.player_id` column
    - [x] Write `player_id` (and `player_name` from the profile) on new walk-ins when a session exists
    - [x] Claim the device's anonymous walk-ins on login (`device_id` match, `player_id IS NULL`) — runs on every `profile.html` load, no-op once nothing is unclaimed
    - [x] History is shown to visitors too — no login required. Visitor query is by `device_id` (unclaimed only), logged-in query is by `player_id`. Walk-ins from a device the player never logs in on stay anonymous
    - [x] Games of 10 min or less are hidden (mis-taps, walk-ins ended right away) — only hidden, still in the database
    - [ ] Test: a walk-in started while logged in fills `player_id`
    - [x] Tested: logging in claims the device's older anonymous walk-ins
  - [x] Profile split into toggle views: progress (`icon_medal`, first and the default for players and visitors — the visitor teaser will fill theirs), history, passes (`icon_id`), personal info (`icon_gear`)
  - [x] Progress view (players only; visitors get the login button), being turned into RPG-like mechanics: games in the last 6 months, weekly streak, distinct courts played. Computed in JS from the same fetch as the history, so games of 10 min or less are excluded
    - [x] Metric name above the level title: "Momentum" (hours; common in PT-PT sports talk — "Balanço" alone reads as "summary", "Forma" drifts towards health), "Consistência" (streak) and "Território" (distinct courts). The metric name is `.skill-title`, a white banner across the top of the card; the level title is `.stat-level` (1em, 700)
    - [x] Level titles instead of plain labels — see the tables under "Levels already implemented"
    - [x] Território (first named "Movimento", renamed because it read as physical agility rather than variety of courts) replaced the favourite court card ("Segunda casa")
    - [x] Progress bars on all three skills, 0 to max (20 games / 8 weeks / 4 courts) in four equal segments with the level title inside each
    - [x] Segment titles are black on the empty track and white over the fill: the labels are rendered twice (`barHtml` in `player_progress.js`), with the white copy on top clipped to the fill width via `clip-path` and a `--fill` variable. The XP bar keeps both copies black, which reads better on its yellow fill
    - [x] ~~Stars next to the level title~~ — removed; the level title and the bar are enough
    - [x] XP bar above the skill cards: +500 XP per game / new court / streak week, levels 1–10 (see "XP")
    - [x] Character card art linked to the XP level: `XP_LEVEL_IMAGES` in `player_progress.js`, one entry per level (index 0 = level 1). Placeholders for now: `pig_sitting` (1–3), `pig_reaching` (4–6), `pig_serving` (7–10)
    - [ ] Draw progressively more "pro" pig images per level (gear, outfit, pose) and swap them into `XP_LEVEL_IMAGES`
    - [ ] Tune the level thresholds (stat 100 marks and XP) once real play is known
    - [x] "Entende o progresso": the same collapsible card as "Entende o ranking" (both drawn by `appendRulesCard` in `player_progress.js`), under the progress view — the XP intro, one row per XP increment (`XP_RULES`, shared with Entende o ranking — display only, keep in step with `games_xp`), then Estilo de jogo and diamonds (copy in "The progress model")
    - [ ] Simplify the progress model (see "The progress model" under Player progress) — one step at a time, each confirmed before the next
      - [x] "Entende o progresso": the final copy, rows without skill names; the pass row carries a `.badge` "Em breve"
      - [x] Stats: drop Tarimba; Consistência becomes weeks with a game in the last 6 months; Território counts the last 6 months; 100 marks 40 / 20 / 5 (`STAT_GAMES` / `STAT_WEEKS` / `STAT_TERRITORY`: `max` + `titles`, title by the rating's quarter)
      - [x] Stat cards: the name in the banner (`.stat-name`, one line), the score as a percentage (`MSG_STAT_RATING`, "54%"), then the count on one line with the window ("22 partidas nos últimos 6 meses", `MSG_STAT_HINT`, on every card — the window matters); no bars, stars or segment labels (the XP bar is the only bar)
      - [x] Bar CSS cleanup: `.level-bar`, the white-clipped label copy, the segment dividers and `barHtml` are gone; the XP bar is plain `.xp-bar`
      - [x] Trading card: three ratings instead of four
      - [x] Diamonds: the lifetime feats instead of full bars (`DIAMOND_GAMES` / `DIAMOND_COURTS` / `DIAMOND_STREAK`), each on its stat's card. Campeão waits for `league_results`
      - [x] The visitor teaser's dummy first game: check the trading card and stat cards still read as an empty starting point
      - [x] Rename skill → stat in code and CSS: `statRating`, `statTitle`, `STAT_GAMES` / `STAT_WEEKS` / `STAT_TERRITORY`, `.stat-name` (the banner), `.stat-title` (the caption), `.trading-card-stats` / `.trading-card-stat`
      - [ ] Pass postponed — nobody earns XP for something marked coming soon
        - [x] "Obter passe" row with an "Em breve" badge, in Entende o progresso and Entende o ranking
        - [x] Pass XP off: `player_xp` (xp.sql) and `season_ranking` (ranking.sql) no longer add `pass_awards`; the pass cards still show "+1000 XP" as a teaser, unpaid. `pass_awards` keeps recording, so turning it back on pays every pass ever approved
        - [x] Run the new `player_xp` and `season_ranking` in the Supabase SQL editor
        - [x] Pass-approved surprise stays as it is: with no real private court signed up, no pass gets approved, so it never plays
      - [ ] "Vencer uma época" diamond is "em breve" too: season winners aren't recorded until `league_results` exists (see "End of season")
    - [ ] Visitor teaser (see "Visitor teaser" under Authentication)
      - [x] Visitor history shows unclaimed walk-ins only (`player_id IS NULL`)
      - [x] XP gained on each history card, players and visitors (`games_xp`)
      - [x] Progress: dummy trading card + skill cards from the dummy first game, teaser inside the trading card
      - [x] Passes: dummy pass ("Meu primeiro passe", 30/02) with the padlock, and the passes explainer above it
      - [ ] Dados: locked dummy version for visitors
      - [ ] Padlocks on the progress cards? Their `overflow: hidden` and top banners clip and cover the history card's padlock
      - [x] History: 1 locked dummy card ("Minha primeira partida", +1000 XP) for blank visitors and players with no games, replacing the pig, with "Teu histórico de jogos ficará guardado aqui." above it. `.locked` card with a `.padlock` in the top-right corner: the round `.ticket-hole` plus `icon_padlock_color_cut.svg`, whose shackle is already cut where it runs behind the card — so it only works at its exact hand-tuned position
  - [x] Passes view (since 10/2026 no longer a tab: the pass section sits on top of Meus jogos (the games tab, formerly "Histórico"), a divider above the games (tab icon `icon_ball`) — passes are postponed, so it's a teaser; the four tabs fit small phones): the player's approved passes, shown as the admin's member card with the group name in place of the player name and no revoke link
    - [x] Fix the player member card — title falls back to the group's court names, courts line removed, expiry uses `icon_timer.svg` (was `icon_trash.svg`), stacked under "Membro desde" with the "+1000 XP" on the right, bottom-aligned
    - [x] Give every court group a name, so passes stop reading as "Court X, Court Y" — filled in Supabase (10/2026); empty group 13 deleted. Names are set by us in Supabase, not by the admin (decided)
    - [x] Show pending and refused requests there too, not only approved passes (one list, no toggle — a player never has many; pending first, then passes, then refusals; `requestCard` in `profile.js`, the same ticket and badge slot as a pass): pending as a card marked "aguarda aprovação" (ties into the pending approval UX under Open Questions), refused with its reason and a way to ask again
    - [x] Registered players with no pass: the locked dummy pass ticket (`dummyPassCard`) instead of the lone pig, under `MSG_PASSES_SOON` ("Em breve poderás solicitar um passe junto dos administradores de um campo para poderes reservar horários e jogar em campos privados sem burocracia.", ") — the same line for visitors, and the dummy pass carries an "Em breve" pill after its name (`passCard`'s `soon`). Replaced `MSG_NO_PASSES` and `MSG_VISITOR_PASSES` while passes are postponed
      - [ ] A follow-up action once passes are live: the "em breve" line promises nothing tappable for now, which is honest while postponed. Something that leads to a private court where they can ask for a pass. Keep it off the dummy ticket, which must not look clickable (see "No buttons on the previews")
  - [ ] Upcoming game alerts (billing alerts once billing exists)
  - [x] Replace the placeholder skull icon (`icon_avatar.svg`)
  - [ ] Keep the profile from being forgotten behind the avatar icon — surface it where the player already is, and say when something changed. Visitors are the bigger problem: a registered player already knows the profile exists, a visitor doesn't, and it's what turns them into an account. Both sets below stay — visitors first
    - **Visitors**
    - [ ] Right after a walk-in: "Bom jogo" and "Obrigado" tell a visitor what's waiting — "+1000 XP à tua espera. Faz login para não os perderes." (the profile teaser's loss aversion, at the moment they've just played; a line, not a button — the screens reload on a countdown)
    - [x] The level-1 ring loop is the grab (decided): every visitor, seasoned or blank, sees the same level-1 ring filling to 5 o'clock and back — never their real unclaimed progress. Tapping it lands on their profile, where the teaser explains it
    - [ ] A dot on the visitor's ring while they have unclaimed XP — a standing "something is yours here"
    - [x] A card on every court page, below the court details (`#visitor-nudge`, `showVisitorNudge` in `court-stage.js`): a seasoned visitor reads "Tens 1 500 XP à tua espera. Anda cá ver", a blank one "Anda cá ver o teu progresso", both linking to the profile. Wears the install nudge's look; closing it snoozes that version for 10 days on the device (`snoozeNudge`), and the install nudge now snoozes the same way
    - **Registered players**
    - [ ] Success screens show what the game earned: "+500 XP · faltam 1500 para o nível 4" on "Bom jogo", "Obrigado" and "Jogo reservado" (a line, not a button — the screens reload on a countdown)
    - [ ] The avatar shows the level instead of a generic head: a small level badge or an XP ring that fills with play, plus a dot when something is unseen (level up, new diamond, refused pass)
      - [x] Level ring: on the court list and court page, a logged-in player's avatar becomes a ring that fills black over a muted-black track through the current level (15° minimum, round caps), the level number inside (`showHeaderLevel` / `xpLevel` in `utils.js`, `.level-ring`). A visitor gets level 1 with the old XP-bar loop: filling to 5 o'clock (150°) and back forever, done as a rotating cover with two dots for the round ends, so it stays `transform`-only
      - [ ] The unseen dot (ranking changed, refused pass; later level up, new diamond)
    - [ ] Streak nudge as a second card underneath the court card, only when the streak is at risk (late in the week, no game yet): "Consistência: 3 semanas seguidas — joga esta semana para não perderes", tapping through to the progress view. Wait for the rain freeze, or a rainy week feels unfair
    - [ ] Level-up and diamond surprises end on "Ver progresso" (see the surprises todo)
- [ ] The install nudge's "Saiba como" (`court.html`, links to `info.html#panel-download`) takes the player away from the court page — show the how-to without leaving it
- [ ] Get the admin to see the player booking and modify it
  - [x] Admin queries `bookings` for courts in their `court_groups` (bookings tab, default view)
  - [x] Admin sees the exact same availability calendar as the player (read-only picker in each card-collapsible, player names on occupied slots)
  - [x] Admin can cancel a booking (Cancelar/Voltar confirm on the bookings card)
  - [x] Admin picker shows the whole group: "HH:MM (1/2)" = courts taken / active courts, orange as soon as any court is booked, every booked player's short name beneath
  - [x] Tapping a booked slot in the admin picker jumps to that booking's card (first booking only when several share the slot)
  - [ ] Admin can add a booking on behalf of a player, or edit one
- [x] Player picker stays single-court; greeting points to the group's other courts ("Se não encontrares horário aqui, também podes reservar no …", `MSG_SIBLINGS`)
- [x] Group stats for the admin, shown just above the slot picker in each card-collapsible (calculated in JS from the admin's bookings, whole group not per court)
  - [x] This month: bookings, unique players, newcomers, estimated revenue, cancellations
  - [ ] Move to a Postgres RPC if a group's booking history gets large enough to slow the dashboard
- [ ] Booking gaps (found after the booking back-and-forth)
  - [ ] Enforce booking rules server-side — only JS checks opening hours, slot alignment, pause and min duration; verify the insert RLS actually requires an approved pass (later)
  - [x] Expired pass (`expires_at` passed) blocks booking — player's info and pass row stay, only booking is impeded (`MSG_EXPIRED`; a game booked before expiry stays visible and cancellable)
  - [x] Revoking a member cancels all their upcoming bookings (cancelled before the pass is deleted; games already underway are left alone)
  - [ ] Flag existing bookings that no longer fit after the admin changes opening hours, pause or slot length (later)
  - [ ] Notify the player when the admin cancels their booking; booking confirmation email (later — Resend sandbox still blocks player emails)
  - [x] Booking history view — past games for the admin (upcoming/past toggle on the bookings tab)
    - [ ] Played / no-show / paid status on past games
- [ ] Fix the closed-day message in the slot picker, "Hoje não há ténis cá, o campo está encerrado." (`slot-picker.js`). It's inline copy instead of a `MSG_*` constant, and plain text instead of a pig appearance. "Hoje" is right: closed days can't be tapped in the day strip, so it only ever shows when today is closed
- [ ] Test what each page shows after an action (approve, deny, revoke, cancel, book…) — the page often just sits blank
  - Likely cause: admin.js removes the acted-on card with `card.remove()`, so removing the last one leaves an empty list with no pig appearance. Approving also doesn't move the player into the members tab (or deny into anything) until a reload
  - Fix options: re-render the view from the patched `adminData` cache (keeps the pig appearance and cross-tab consistency), or just reload the page after the action
- [ ] Leaderboards (see "Leaderboards and social comparison")
  - [x] XP computed in the database (`supabase/sql/xp.sql`); the profile reads it through `my_games_xp` / `my_xp`
  - [x] Opt-out: `profiles.hide_from_ranking`, a Participar / Recusar toggle in Dados
    - [ ] Style the toggle better (now the court list's `.view-toggle` with text buttons, `.profile-form .view-toggle-btn`)
  - [x] Ranking function: `season_ranking` in `supabase/sql/ranking.sql` — season points, "R. Barbosa" names, shared places, Tarimba tie-break, `is_me` instead of ids
  - [x] Ranking tab: second of five profile tabs (`icon_ranking`, `loadRanking`), drawn as a brutomorphic golf-tournament sign (`.scoreboard`, one `.plaque` per digit and name) — see "The board" under Leaderboards
    - [x] Plaque swaps and board updates: names first, then digits; only what changed moves (`updateRows`)
    - [x] Each change plays once, on any device (`ranking_views`); a dropped place shows straight away, no animation
    - [x] Pig-voice lines for gains, overtakes, drops, chasing, first, zero and opt-out (`MSG_RANKING_*`)
    - [x] "Entende o ranking" as the admin's collapsible rules card
    - [ ] Customise the ranking's look per season: Época de Verão vs Época de Inverno
  - [x] Leaderboard teaser: the visitor's ranking tab shows the standard board with nine example players (`DUMMY_RANKING`) and the visitor as "O. Teu Nome", always 6th with the example first game's 1000 XP (`visitorRanking`) — every row shown, nothing saved. Their plaques slide into empty slots every time the tab opens. The line: "Os melhores jogadores de cada época aparecem aqui. Faz login para participar. O teu primeiro jogo vale logo 1000 XP."
  - [ ] Rain freeze (see "Rain freeze" under Player progress): a rainy week doesn't break the streak — Consistência, and the +500 streak-week XP in `games_xp`. Needs past weather stored in the database (`weather.js` only fetches forecasts, in the browser), so the SQL can tell which weeks were rainy
  - [ ] End of season: `league_results` snapshot + surprise
    - [ ] Hall of fame, champions only (decided): each season's 1st place (`league_results`) gets their name in a hall of fame on the ranking tab, plus a diamond kept forever — the first diamond earned through the ranking rather than a full skill bar, so it adds to the trading card's count — and a card on their progress tab: "Campeão · Verão 2027"
  - [ ] Privacy policy — the app has none yet; needed before a public ranking with names launches
- [ ] Polish pig mascot with Rive animations
  - [ ] Animate existing pig SVG in Rive editor (idle loop + reaction states)
  - [ ] Export `.riv` and integrate via `@rive-app/canvas` runtime
  - [ ] Replace static pig in `setPigAppearance` with animated Rive canvas

## Booking Flow — Implementation Plan

### Phase 1: Admin UI
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
- [x] Min game duration validation — "Reservar horário" disabled when selection < min duration
- [x] "Reservar horário" → insert into `bookings`; shows the "Jogo reservado" success screen, then reloads
- [x] Lock picker after successful booking — no further slot picking; mine slot stays visible
- [x] Selection summary during picking: "Teu jogo: HH:MM às HH:MM (X min)" (live, before confirm)

### Phase 4: Integration
- [x] Wire `renderSlotPicker` from slot-picker.js into court-bookable.js approved branch
- [x] Load existing bookings for 7-day window — occupied slots visible to all group members
- [x] One active booking per group (JS layer) — if player already has a future booking, picker is blocked and booking details are shown instead
- Admin booking management is tracked under "Get the admin to see the player booking and modify it" in the Todo

### Design Decisions
- **Single-court player picker, group-wide admin picker:** the same `renderSlotPicker` serves both.
  - **Player** sees one court only — the court page they're on. A booking always belongs to one court, so a game can never need a court change mid-way (a group-wide player picker would need a "one court free for the whole range" check plus court auto-assignment — rejected as too complex). Other courts in the group are only mentioned in the greeting, with links; no availability check behind it.
  - **Admin** sees the whole group in one grid (`readOnly`), because rules, pass, pricing and the one-booking limit are all per group. Each booked slot shows `HH:MM (taken/courtCount)` and all booked players; any booking makes it orange.
- **Slot selection:** slot-based; cells show start times; end time = last slot + `slot_duration_minutes`
- **Contiguous only:** auto-fill slots between first and second tap; tapping past a blocker is ignored
- **Single slot:** valid; tap same slot twice = 1-slot booking
- **Reset:** any tap while a full range is selected resets and starts from that slot
- **Pause:** stored per-day in `court_opening_hours.pause_start/pause_end`; edited in admin UI as two grouped fields: weekdays (1–5) and weekend (0, 6)
- **Min game duration:** enforced at confirm only — not during selection; message: "O tempo mínimo de reserva para este campo é de Xh."
- **Closed days:** muted in day strip, tapping does nothing
