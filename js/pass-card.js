// THE PASS TICKET, SHARED BY EVERY PAGE THAT SHOWS ONE: THE PROFILE'S PASSES VIEW AND THE PASS-APPROVED SURPRISE
// (reveals.js). ONE COPY OF THE MARKUP, SO A PASS LOOKS EXACTLY THE SAME WHEREVER IT APPEARS. LOAD BEFORE THE PAGE'S OWN SCRIPT

// PT-PT GROUPING ("26 500") KEEPS THE INFLATED NUMBERS READABLE
const MSG_XP = xp => `${xp.toLocaleString("pt-PT")} XP`;
const MSG_GAME_XP = xp => `+${MSG_XP(xp)}`;
const MSG_MEMBER_SINCE = date => `Membro desde ${date}`;
const MSG_NO_EXPIRY = "Sem data de expiração";
const MSG_NO_NEXT_GAME = "Sem jogos agendados";
// "NENHUMA" FOR ZERO: SPACE GROTESK'S ROUND 0 READ AS AN "o", AND IT HAS NO SLASHED ZERO
const MSG_BOOKING_COUNT = n => n === 0 ? "Nenhuma reserva" : `${n} ${n === 1 ? "reserva" : "reservas"}`;

// A PASS IS A BIGGER STEP THAN A GAME: IT MEANS THE PLAYER WAS VETTED AND APPROVED BY A COURT'S ADMIN. POSTPONED: THE DATABASE
// DOESN'T PAY IT YET (player_xp) — THE CARD AND THE RULES ROWS SHOW IT AS WHAT'S COMING
const XP_PER_PASS = 1000;

// WRAPPED SO THE HOLE ISN'T A DIRECT CHILD OF THE CARD, WHICH WOULD TURN IT INTO THE BADGE SLOT
const PADLOCK_HTML = `<div class="padlock"><div class="ticket-hole"></div><img src="images/icon_padlock_color_cut.svg" alt=""></div>`;


// soon PINS A YELLOW "EM BREVE" PILL TO THE CARD'S TOP LEFT (.ticket > .badge), CLEAR OF THE PADLOCK IN THE TOP RIGHT
function passCard({ name, since, expires, nextGame, bookings, locked, soon }) {
	return `
		<div class="ticket${locked ? " locked" : ""}">
			${locked ? PADLOCK_HTML : ""}
			${soon ? `<span class="badge">Em breve</span>` : ""}
			<div class="ticket-hole"></div>
			<p class="ticket-title">${name}</p>
			<div class="ticket-date-row" style="align-items: flex-end">
				<!-- THE ROW ZEROES ITS DATES' MARGINS, SO THE TWO LINES GET THEIR 5px HERE -->
				<div style="display: flex; flex-direction: column; gap: 5px">
					<p class="ticket-date">${MSG_MEMBER_SINCE(since)}</p>
					<p class="ticket-date">${expires ? `<img src="images/icon_timer.svg" class="link-icon" alt=""> ${expires}` : MSG_NO_EXPIRY}</p>
				</div>
				<span class="game-xp">${MSG_GAME_XP(XP_PER_PASS)}</span>
			</div>
			<div class="divider"></div>
			<div class="ticket-data">
				<p class="ticket-date"><img src="images/icon_calendar_tennis.svg" class="link-icon" alt="">${nextGame ?? MSG_NO_NEXT_GAME}</p>
				<p class="ticket-date"><img src="images/icon_history.svg" class="link-icon" alt="">${MSG_BOOKING_COUNT(bookings)}</p>
			</div>
		</div>
	`;
}
