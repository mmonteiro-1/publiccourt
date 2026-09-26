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

// "SAB, 26/09, 10:30-12:00" — SHARED BY THE OWNER'S MEMBER AND BOOKING CARDS AND THE PLAYER HISTORY.
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

// PERSISTENT DEVICE ID FOR TAILORING MESSAGES TO THE RESERVATION OWNER
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
