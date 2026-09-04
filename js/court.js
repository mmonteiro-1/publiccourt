// DOM REFERENCES AND URL PARAMS
const app = document.getElementById("app");
const params = new URLSearchParams(location.search);
const courtId = parseInt(params.get("court"));
let selectedDuration = 60;

// HOW CLOSE (METERS) A DEVICE MUST BE TO THE COURT TO CHECK IN OR FINISH A GAME
const MAX_DISTANCE_METERS = 500;
// EXTRA SLACK ADDED FOR LOW-CONFIDENCE GPS READINGS, CAPPED SO THE CHECK STAYS MEANINGFUL
const MAX_ACCURACY_ALLOWANCE = 500;

// DISTANCE BETWEEN TWO COORDINATES IN METERS
function distanceMeters(lat1, lon1, lat2, lon2) {
	const R = 6371000;
	const toRad = d => d * Math.PI / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a = Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// RESOLVE THE DEVICE'S CURRENT COORDINATES
function getCurrentPosition() {
	return new Promise((resolve, reject) => {
		if (!navigator.geolocation) {
			reject(new Error("Geolocation not supported"));
			return;
		}
		navigator.geolocation.getCurrentPosition(resolve, reject, {
			enableHighAccuracy: true,
			timeout: 10000,
			maximumAge: 0,
		});
	});
}

// FETCH THE COURT'S CURRENT ACTIVE RESERVATION, IF ANY
async function fetchActiveReservation() {
	const now = new Date().toISOString();
	const { data: rows } = await db
		.from("reservations")
		.select("*")
		.eq("court_id", courtId)
		.is("manual_finished_at", null)
		.gt("ends_at", now)
		.order("ends_at", { ascending: false })
		.limit(1);

	return rows && rows.length > 0 ? rows[0] : null;
}

// RENDER THE STATUS PREVIEW SHOWN BEFORE ANY LOCATION CHECK
function renderPreview(court, active) {
	document.body.classList.toggle("inuse", !!active);
	const statusBadge = active
		? `<span class="badge inuse">In use</span>`
		: `<span class="badge available">Available</span>`;

	const timeBadges = active
		? `<div class="badge-row">
         <span class="badge time">${minutesLeft(active.ends_at) > 0 ? `${minutesLeft(active.ends_at)}min left` : "Ending"}</span>
       </div>`
		: "";

	const descriptionLine = court.description ? `<p class="card-sub">${court.description}</p>` : "";

	app.innerHTML = `
    <div class="card-header">
      <p class="city">${court.city || ""}</p>
      ${statusBadge}
    </div>
    ${timeBadges}
    <p class="card-status">${court.name}</p>
    ${descriptionLine}
    <div class="divider"></div>
    <p class="card-sub margin-bottom-25">To keep things fair for everyone, you can only reserve a court while you're physically there.</p>
    <button class="finish-btn" id="back-btn">Go back</button>
    <button class="submit" id="here-btn">I'm at the court</button>
    <p class="card-sub margin-top-10">Please allow this browser to access your location.</p>
  `;

	document.getElementById("back-btn").addEventListener("click", () => {
		location.href = "index.html";
	});
	document.getElementById("here-btn").addEventListener("click", () => verifyLocationAndProceed(court));
}

// RENDER A BLOCKING SCREEN WHEN LOCATION CAN'T BE VERIFIED
function renderLocationBlocked(court, message) {
	app.innerHTML = `
    <p class="court-label">${court.name}</p>
    <p class="card-status">Location required</p>
    <p class="card-sub">${message}</p>
    <button class="submit" id="retry-btn">Try again</button>
  `;
	document.getElementById("retry-btn").addEventListener("click", () => verifyLocationAndProceed(court));
}

// RENDER AVAILABLE STATE WITH CHECK-IN FORM
function renderAvailable(court) {
	document.body.classList.remove("inuse");
	app.innerHTML = `
    <div class="card-header">
      <p class="court-label">${court.name}</p>
      <span class="badge available">Available</span>
    </div>
    <p class="card-status">Ready to play</p>
    <p class="card-sub">Let other players know how long you intend to use the court</p>
    <div class="divider"></div>
    <div class="field">
      <label>How long?</label>
      <div class="duration-grid">
        <button class="dur-btn" data-mins="30">30m</button>
        <button class="dur-btn" data-mins="45">45m</button>
        <button class="dur-btn selected" data-mins="60">1h</button>
      </div>
    </div>
    <button class="submit" id="checkin-btn">Start playing</button>
  `;

	document.querySelectorAll(".dur-btn").forEach(btn => {
		btn.addEventListener("click", () => {
			document.querySelectorAll(".dur-btn").forEach(b => b.classList.remove("selected"));
			btn.classList.add("selected");
			selectedDuration = parseInt(btn.dataset.mins);
		});
	});

	document.getElementById("checkin-btn").addEventListener("click", () => checkIn(court));
}

// RENDER IN-USE STATE WITH LIVE COUNTDOWN
function renderInUse(court, reservation) {
	document.body.classList.add("inuse");
	const endsAt = new Date(reservation.ends_at).getTime();

	function formatCountdown() {
		const remaining = Math.max(0, endsAt - Date.now());
		const totalSecs = Math.floor(remaining / 1000);
		const h = Math.floor(totalSecs / 3600);
		const m = Math.floor((totalSecs % 3600) / 60);
		const s = totalSecs % 60;
		return h > 0
			? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
			: `${m}:${String(s).padStart(2, "0")}`;
	}

	app.innerHTML = `
    <div class="card-header">
      <p class="court-label">${court.name}</p>
      <span class="badge inuse">In use</span>
    </div>
    <p class="card-status inuse" id="countdown">${formatCountdown()}</p>
    <p class="card-sub">Court is occupied until ${formatTime(reservation.ends_at)}. If its empty, please finish this session and start a new one.</p>
    <button class="finish-btn margin-top-25" id="finish-btn">Finish this game</button>
  `;

	const timer = setInterval(() => {
		const el = document.getElementById("countdown");
		if (!el) { clearInterval(timer); return; }
		el.textContent = formatCountdown();
		if (Date.now() >= endsAt) clearInterval(timer);
	}, 1000);

	document.getElementById("finish-btn").addEventListener("click", () => {
		clearInterval(timer);
		finishGame(court, reservation.id);
	});
}

// RE-FETCH THE RESERVATION STATUS AND RE-RENDER, WITHOUT REPEATING THE LOCATION CHECK
async function refreshStatus(court) {
	const active = await fetchActiveReservation();
	active ? renderInUse(court, active) : renderAvailable(court);
}

// END THE CURRENT RESERVATION EARLY
async function finishGame(court, reservationId) {
	if (!confirm("Finish this game and free up the court?")) return;

	const btn = document.getElementById("finish-btn");
	btn.disabled = true;
	btn.textContent = "Finishing...";

	const { error } = await db.from("reservations")
		.update({ manual_finished_at: new Date().toISOString() })
		.eq("id", reservationId);

	if (error) {
		btn.disabled = false;
		btn.textContent = "Finish the game";
		alert("Something went wrong. Please try again.");
		return;
	}

	refreshStatus(court);
}

// SUBMIT CHECK-IN TO SUPABASE
async function checkIn(court) {
	const btn = document.getElementById("checkin-btn");
	btn.disabled = true;
	btn.textContent = "Checking in...";

	const endsAt = new Date(Date.now() + selectedDuration * 60 * 1000).toISOString();

	const { error } = await db.from("reservations").insert({
		court_id: courtId,
		ends_at: endsAt,
	});

	if (error) {
		btn.disabled = false;
		btn.textContent = "Start playing";
		alert("Something went wrong. Please try again.");
		return;
	}

	app.innerHTML = `<p class="card-status margin-bottom-30">Have fun!</p><p class="card-status">and thank you for considering other players.</p>`;
	setTimeout(() => refreshStatus(court), 10000);
}

// VERIFY THE DEVICE IS ON-PREMISES, THEN SHOW THE CHECK-IN / FINISH FLOW
async function verifyLocationAndProceed(court) {
	app.innerHTML = `<p class="message">Checking your location...</p>`;

	let position;
	try {
		position = await getCurrentPosition();
	} catch (e) {
		renderLocationBlocked(court, "Enable location access in your browser to check in or finish a game, then try again.");
		return;
	}

	const distance = distanceMeters(
		position.coords.latitude, position.coords.longitude,
		court.lat, court.lng
	);
	// GIVE SLACK FOR LOW-CONFIDENCE READINGS (E.G. DESKTOP WIFI-BASED LOCATION), CAPPED SO THE CHECK STAYS MEANINGFUL
	const allowance = Math.min(position.coords.accuracy || 0, MAX_ACCURACY_ALLOWANCE);
	const threshold = MAX_DISTANCE_METERS + allowance;

	if (distance > threshold) {
		renderLocationBlocked(court, "It seems that you're not at the court. Reservations can only be made on the premises.");
		return;
	}

	refreshStatus(court);
}

// LOAD COURT STATUS AND SHOW THE PREVIEW SCREEN
async function load() {
	if (!courtId) {
		app.innerHTML = `<p class="message error">No court specified.<br>Add ?court=1 to the URL.</p>`;
		return;
	}

	const { data: court, error: courtErr } = await db
		.from("courts").select("name, city, description, lat, lng").eq("id", courtId).single();

	if (courtErr || !court) {
		app.innerHTML = `<p class="message error">Court not found.</p>`;
		return;
	}

	const active = await fetchActiveReservation();
	renderPreview(court, active);
}

load();
