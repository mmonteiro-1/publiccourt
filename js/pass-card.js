// THE PASS TICKET, SHARED BY EVERY PAGE THAT SHOWS ONE: THE PROFILE'S PASSES VIEW AND THE PASS-APPROVED SURPRISE
// (reveals.js). ONE COPY OF THE MARKUP, SO A PASS LOOKS EXACTLY THE SAME WHEREVER IT APPEARS. LOAD BEFORE THE PAGE'S OWN SCRIPT

// PT-PT GROUPING ("26 500") KEEPS THE INFLATED NUMBERS READABLE
const MSG_XP = xp => `${xp.toLocaleString("pt-PT")} XP`;
const MSG_GAME_XP = xp => `+${MSG_XP(xp)}`;
const MSG_MEMBER_SINCE = date => `Membro desde ${date}`;
const MSG_NO_EXPIRY = "Sem data de expiração";
const MSG_NO_NEXT_GAME = "Sem jogos agendados";
const MSG_BOOKING_COUNT = n => `${n} ${n === 1 ? "reserva" : "reservas"}`;

// A PASS IS A BIGGER STEP THAN A GAME: IT MEANS THE PLAYER WAS VETTED AND APPROVED BY A COURT'S ADMIN
const XP_PER_PASS = 3000;

// WRAPPED SO THE HOLE ISN'T A DIRECT CHILD OF THE CARD, WHICH WOULD TURN IT INTO THE LANYARD SLOT
const PADLOCK_HTML = `<div class="padlock"><div class="ticket-hole"></div><img src="images/icon_padlock_color_cut.svg" alt=""></div>`;

// LANYARD STRAP DIPPING INTO THE BADGE SLOT: THE FRONT STRAP, THEN THE FOLD (THE STRAP'S BACK, SEEN AS IT TURNS INTO
// THE SLOT), SHIFTED 4px/4px IN CSS. ITS DARK YELLOW IS HARDCODED ON PURPOSE — THERE'S NO VARIABLE FOR IT.
// INLINE, NOT AN <img>, SO CSS CAN FILL THE STRAP WITH THE COLOUR VARIABLES.
// THE VIEWBOX STARTS AT y -26.5 (= 10px AT THE RENDERED 65px WIDTH) SO THE STRAP RISES 10px ABOVE THE CARD; ITS TOP
// EDGE KEEPS THE SAME SLANT. THE STRAP IS WIDENED ~20px (53 UNITS) ON ITS LEFT ONLY, SO THE FOLD STILL MEETS THE RIGHT EDGE;
// BOTH PUSH THE LEFT CORNER OUTSIDE THE VIEWBOX (x -62.5), HENCE overflow: visible IN CSS.
// THE STRAP'S BOTTOM-LEFT CORNER AND THE FOLD'S TIP ARE ROUNDED ~5px (13 UNITS): EACH CURVE STARTS 13 UNITS BEFORE THE CORNER
// ALONG ONE EDGE AND ENDS 13 AFTER IT. THE STRAP'S BOTTOM-RIGHT STAYS SHARP
const BADGE_RIBBON_SVG = `<svg viewBox="0 -26.5 172 110.5" aria-hidden="true"><path d="M-62.5 -26.5H114.9L157 84H-9.8Q-23 84 -27.4 71.6Z"/><path d="M140 44H172L161.6 71.6Q157 84 151.8 71.9Z" fill="#b08900"/></svg>`;

function passCard({ name, since, expires, nextGame, bookings, locked }) {
	return `
		<div class="ticket${locked ? " locked" : ""}">
			${locked ? PADLOCK_HTML : ""}
			<div class="ticket-hole"></div>
			${BADGE_RIBBON_SVG}
			<p class="ticket-title">${name}</p>
			<div class="ticket-date-row">
				<p class="ticket-date">${MSG_MEMBER_SINCE(since)}</p>
				<span class="game-xp">${MSG_GAME_XP(XP_PER_PASS)}</span>
			</div>
			<div class="divider"></div>
			<div class="ticket-data">
				<p class="ticket-date">${expires ? `<img src="images/icon_trash.svg" class="link-icon" alt=""> ${expires}` : MSG_NO_EXPIRY}</p>
				<p class="ticket-date"><img src="images/icon_calendar_tennis.svg" class="link-icon" alt="">${nextGame ?? MSG_NO_NEXT_GAME}</p>
				<p class="ticket-date"><img src="images/icon_history.svg" class="link-icon" alt="">${MSG_BOOKING_COUNT(bookings)}</p>
			</div>
		</div>
	`;
}
