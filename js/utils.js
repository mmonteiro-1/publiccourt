// "FAZ LOGIN" IN THE VISITOR COPY IS A LINK TO login.html, SO THE ASK IS ONE TAP AWAY WHEREVER IT'S READ
const MSG_LOGIN_LINK = `<a href="login.html">Faz login</a>`;

// THE DEV SERVER (localhost OR THE LAN IP, FOR TESTING ON A PHONE). DEBUG SWITCHES (?surprise, ?board) ONLY WORK HERE, NEVER IN
// PRODUCTION OR ON VERCEL PREVIEWS
const IS_DEV = /^(localhost|127\.0\.0\.1|192\.168\.)/.test(location.hostname);

// PENDING AND REFUSED PASS REQUESTS DROP OUT OF VIEW — ADMIN AND PLAYER ALIKE — A MONTH AFTER THEY WERE MADE. HIDDEN ONLY:
// THE ROW STAYS IN THE DATABASE. COUNTED FROM created_at FOR BOTH, SINCE passes HAS NO COLUMN FOR WHEN A REQUEST WAS REFUSED
const REQUEST_EXPIRY_MONTHS = 1;

function requestExpiry(createdAt) {
	const d = new Date(createdAt);
	d.setMonth(d.getMonth() + REQUEST_EXPIRY_MONTHS);
	return d;
}

function requestExpired(createdAt) {
	return requestExpiry(createdAt) <= new Date();
}

// RENDER THE PIG WITH A MESSAGE INTO A CONTAINER — FOR EMPTY LISTS, BUT ALSO ANYWHERE THE PIG HAS SOMETHING
// TO SAY. pig IS AN images/ FILE NAME WITHOUT .svg (E.G. "pig_serving")
function setPigAppearance(container, message, pig = "pig_sitting") {
	container.innerHTML = `<div class="pig-appearance"><img src="images/${pig}.svg" alt=""><p>${message}</p></div>`;
}

// WEEKDAY LABELS INDEXED BY JS getDay() AND court_opening_hours.day_of_week (BOTH 0 = SUNDAY)
const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];

// FORMAT A TIMESTAMP AS HH:MM, SHARED BY EVERY PAGE
function formatTime(ts) {
	return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// "SAB, 26/09, 10:30-12:00" — SHARED BY THE ADMIN'S MEMBER AND BOOKING CARDS AND THE PLAYER HISTORY.
// TAKES TWO RAW TIMESTAMPS RATHER THAN A ROW BECAUSE bookings (start_at/end_at) AND
// walk_ins (started_at/ends_at) NAME THEIR COLUMNS DIFFERENTLY
function gameLabel(start, end) {
	const s = new Date(start);
	const e = new Date(end);
	const pad = n => String(n).padStart(2, "0");
	const time = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
	return `${WEEKDAYS[s.getDay()]}, ${pad(s.getDate())}/${pad(s.getMonth() + 1)}, ${time(s)}-${time(e)}`;
}

// MINUTES REMAINING UNTIL A RESERVATION ENDS, SHARED BY EVERY PAGE
function minutesLeft(endsAt) {
	const ms = new Date(endsAt) - Date.now();
	return Math.max(0, Math.ceil(ms / 60000));
}

// PERSISTENT DEVICE ID FOR TAILORING MESSAGES TO THE DEVICE THAT STARTED THE WALK-IN
function getDeviceId() {
	let id = localStorage.getItem("device_id");
	if (!id) {
		// crypto.randomUUID is unavailable on HTTP (non-localhost) in some browsers,
		// so fall back to a RFC 4122 v4 UUID built from Math.random().
		id = crypto.randomUUID?.() ?? ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
			(c ^ (Math.random() * 16 >> c / 4)).toString(16)
		);
		localStorage.setItem("device_id", id);
	}
	return id;
}

// CITY LABEL WITH AN OPTIONAL FLAG ICON PREPENDED, SHARED BY EVERY PAGE
function cityHtml(city) {
	const key = city && city.toLowerCase();
	const flag = key === "aveiro" ? `<img src="images/flag_aveiro.svg" class="city-flag" alt="">`
		: key === "vagos" ? `<img src="images/flag_vagos.svg" class="city-flag" alt="">`
		: key === "ílhavo" ? `<img src="images/flag_ilhavo.svg" class="city-flag" alt="">`
		: key === "oliv bairro" ? `<img src="images/flag_ilhavo.svg" class="city-flag" alt="">`
		: key === "anadia" ? `<img src="images/flag_ilhavo.svg" class="city-flag" alt="">`
		: key === "albergaria" ? `<img src="images/flag_albergaria.svg" class="city-flag" alt="">`
		: key === "murtosa" ? `<img src="images/flag_murtosa.svg" class="city-flag" alt="">`
		: key === "estarreja" ? `<img src="images/flag_estarreja.svg" class="city-flag" alt="">`
		: "";
	return `<p class="city">${flag}${city || ""}</p>`;
}

// LEVEL n NEEDS 1500 + 500n XP (2000, 2500 … 6500), SO EACH IS A BIT HARDER. REACHING AN END IS A LEVEL-UP: 0–1999 IS LEVEL 1, 2000–4499 LEVEL 2
const XP_LEVEL_ENDS = [];
for (let n = 1, total = 0; n <= 10; n++) XP_LEVEL_ENDS.push(total += 1500 + 500 * n);

// THE XP LEVEL (1–10) AND HOW FAR INTO IT (0–100). RELATIVE: THE FILL ONLY COVERS THE CURRENT LEVEL, AND PAST THE LAST LEVEL
// IT STAYS FULL. SHARED BY THE TRADING CARD AND THE HEADER'S LEVEL RING
function xpLevel(xp) {
	const found = XP_LEVEL_ENDS.findIndex(end => xp < end);
	const index = found === -1 ? XP_LEVEL_ENDS.length - 1 : found;
	const from = index ? XP_LEVEL_ENDS[index - 1] : 0;
	return { level: index + 1, fill: Math.min((xp - from) / (XP_LEVEL_ENDS[index] - from), 1) * 100 };
}

// THE HEADER'S AVATAR BECOMES THE PLAYER'S LEVEL — A RING THAT FILLS THROUGH THE CURRENT LEVEL, THE NUMBER INSIDE — SO THE
// PROFILE ISN'T FORGOTTEN BEHIND A GENERIC ICON. ONLY ON THE PAGES WHOSE AVATAR LINKS TO THE PROFILE (COURT LIST, COURT PAGE),
// pathLength="100" LETS THE FILL BE A PLAIN PERCENTAGE. A VISITOR HAS NO ACCOUNT LEVEL, SO THEY GET THE LOOPING TEASER INSTEAD
async function showHeaderLevel() {
	const link = document.querySelector('a.header-profile[href="profile.html"]');
	if (!link) return;
	const { data: { session } } = await db.auth.getSession();
	if (!session) {
		link.innerHTML = VISITOR_RING_HTML;
		return;
	}
	const { data: xp } = await db.rpc("my_xp");
	const { level, fill } = xpLevel(xp ?? 0);
	// AT LEAST A 15deg SLIVER, SO A LEVEL JUST REACHED STILL SHOWS A RING STARTING (LIKE THE XP BAR'S MINIMUM FILL)
	const arc = Math.max(fill, 100 * 15 / 360);
	link.innerHTML = `
		<svg class="level-ring" viewBox="0 0 40 40" aria-hidden="true">
			<circle cx="20" cy="20" r="14"></circle>
			<circle cx="20" cy="20" r="17"></circle>
			<circle cx="20" cy="20" r="17" pathLength="100" stroke-dasharray="${arc} 100"></circle>
		</svg>
		<span>${level}</span>
	`;
}
// THE VISITOR'S RING: LEVEL 1, FOREVER FILLING TO 5 O'CLOCK (150deg) AND BACK — THE LOOP THE VISITOR'S XP BAR ONCE HAD. A LOOP
// MAY ONLY ANIMATE transform, SO THE FILL ISN'T GROWN: A BLACK 150deg ARC SITS STILL, AND A MASK HIDES IT — A HALF RING IN THE
// MASK THAT TURNS OFF IT CLOCKWISE (.level-ring-turn), ERASING LESS AND LESS. A MASK, NOT A COVER PAINTED THE TRACK'S COLOUR,
// SO THE TRACK UNDERNEATH CAN STAY TRANSLUCENT. THE MASK'S EDGE IS SQUARE, SO THE ROUND ENDS ARE TWO DOTS AS WIDE AS THE RING
// ON TOP: ONE FIXED AT THE START, ONE TURNING AT THE LEADING EDGE. 150 / 360 OF THE pathLength IS 41.67. THE MASK'S HALF RING
// IS 8 WIDE, A LITTLE WIDER THAN THE ARC, SO NO EDGE OF IT PEEKS OUT. <defs> GOES LAST SO THE DISC STAYS THE FIRST CHILD
const VISITOR_RING_HTML = `
	<svg class="level-ring visitor" viewBox="0 0 40 40" aria-hidden="true">
		<circle cx="20" cy="20" r="14"></circle>
		<circle cx="20" cy="20" r="17"></circle>
		<circle cx="20" cy="20" r="17" pathLength="100" stroke-dasharray="41.67 100" mask="url(#level-ring-uncover)"></circle>
		<circle class="level-ring-dot" cx="37" cy="20" r="3"></circle>
		<circle class="level-ring-dot level-ring-turn" cx="37" cy="20" r="3"></circle>
		<defs>
			<mask id="level-ring-uncover" maskUnits="userSpaceOnUse" x="0" y="0" width="40" height="40">
				<rect width="40" height="40" fill="white"></rect>
				<circle class="level-ring-turn" cx="20" cy="20" r="17" pathLength="100" stroke-dasharray="41.67 100" fill="none" stroke="black" stroke-width="8"></circle>
			</mask>
		</defs>
	</svg>
	<span>1</span>
`;
showHeaderLevel();

// THE BUTTON PRESS, APP-WIDE (CALLED BELOW; EVERY PAGE LOADS THIS FILE): .pressed ON A BUTTON WITH A SHADOW, HELD AT LEAST
// PRESS_MIN_MS — :active ALONE FLASHES BY UNSEEN ON A QUICK PHONE TAP — THEN .released FOR THE SPRING BACK, CLEARED WHEN IT ENDS
// SO THE NEXT PRESS CAN PLAY IT AGAIN. THE CSS DOES THE MOVING. HAPTICS (iOS'S SWITCH TRICK, DEAD ON iOS 26) AND CLICK SOUNDS
// WERE TRIED AND DROPPED (10/2026)
const PRESS_MIN_MS = 100;

// THE SPRING BACK ON ITS OWN: ALSO PLAYED BY A SHALLOW ANSWER THE MOMENT IT'S PICKED (onboarding.js), RISING FROM FLAT INTO A
// SOLID BUTTON. RESTARTED IF IT'S ALREADY PLAYING (offsetWidth FORCES THE RESTART)
function springButton(btn) {
	btn.classList.remove("pressed", "released");
	void btn.offsetWidth;
	btn.classList.add("released");
	btn.addEventListener("animationend", () => btn.classList.remove("released"), { once: true });
}

// RESOLVES ONCE THE BUTTON'S SPRING HAS SHOWN, SO THE TAP'S HANDLER (HELD BACK BY enableButtonFeedback) DOESN'T WIPE IT AT ONCE.
// NOT THE WHOLE SPRING: SPRING_SEEN_MS AFTER IT STARTS, PAST THE RISE (40% OF 0.3s) — THE SETTLE ISN'T WORTH THE WAIT.
// AT ONCE IF NOTHING IS PLAYING (REDUCED MOTION, WHERE THERE'S NO SPRING TO WAIT FOR)
const SPRING_SEEN_MS = 170;

function afterSpring(btn) {
	if (!btn.matches(".pressed, .released") || matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();
	return new Promise(resolve => {
		// STILL PRESSED: THE SPRING HASN'T STARTED YET (THE PRESS IS HELD PRESS_MIN_MS)
		if (btn.classList.contains("released")) setTimeout(resolve, SPRING_SEEN_MS);
		else btn.addEventListener("animationstart", () => setTimeout(resolve, SPRING_SEEN_MS), { once: true });
		// SAFETY NET: IF THE SPRING NEVER STARTS, THE PAGE STILL MOVES ON
		setTimeout(resolve, 1000);
	});
}

// EVERY BUTTON THAT ISN'T AN ACTION BUTTON (WHITE, OUTLINED, WITH A SHADOW): NO PRESS, NO SPRING. A NEW BUTTON STYLE THAT ISN'T
// AN ACTION GOES HERE. AN UNPICKED DURATION IS FLAT, A PICKED ONE LOOKS LIKE AN ACTION; THE ORANGE ONES ARE DESTRUCTIVE CONFIRMS
const NOT_ACTION_BUTTONS = [
	".button-shallow", ".view-toggle-btn", ".dur-btn:not(.selected)", ".admin-nav-btn", ".filter-tag",
	".secondary-close", ".confirm-deny-btn", ".ticket-actions button:not(.approve-btn)",
].join(", ");

function enableButtonFeedback() {
	document.addEventListener("pointerdown", event => {
		const btn = event.target.closest("button");
		if (!btn || btn.disabled || btn.matches(NOT_ACTION_BUTTONS)) return;
		const downAt = Date.now();
		btn.classList.remove("released");
		btn.classList.add("pressed");
		const release = () => {
			setTimeout(() => springButton(btn), Math.max(0, PRESS_MIN_MS - (Date.now() - downAt)));
			document.removeEventListener("pointerup", release);
			document.removeEventListener("pointercancel", release);
		};
		document.addEventListener("pointerup", release);
		document.addEventListener("pointercancel", release);
	});

	// MOST TAPS CHANGE THE SCREEN OR RELOAD THE PAGE AT ONCE, WIPING THE SPRING BEFORE IT SHOWS. SO THE CLICK OF A SPRINGING BUTTON
	// IS HELD BACK HERE — CAPTURE PHASE, BEFORE ANY PAGE'S OWN HANDLER — AND REPLAYED ONCE THE SPRING HAS SHOWN. EVERY HANDLER IN
	// THE APP RUNS AFTER THE BOUNCE WITHOUT KNOWING. A CLICK WITH NO PRESS (KEYBOARD, A SCRIPT) GOES THROUGH AT ONCE
	const replaying = new WeakSet();
	document.addEventListener("click", event => {
		const btn = event.target.closest("button");
		// FOLDER TABS STAY ON SCREEN WHEN TAPPED (ONLY THE PANE BELOW CHANGES), SO THEIR SPRING SHOWS ANYWAY: NO HOLD, NO DELAY
		if (!btn || replaying.has(btn) || btn.matches(".folder-tab") || !btn.matches(".pressed, .released")) return;
		event.stopImmediatePropagation();
		event.preventDefault();
		afterSpring(btn).then(() => {
			replaying.add(btn);
			btn.click();
			replaying.delete(btn);
		});
	}, true);
}

enableButtonFeedback();
