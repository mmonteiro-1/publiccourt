// DOM REFERENCES AND URL PARAMS
const app = document.getElementById("app");
const params = new URLSearchParams(location.search);
const courtId = params.get("court");
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
	app.classList.toggle("available", !active);
	app.classList.toggle("inuse", !!active);

	const statusBadge = `<span class="badge">LIVRE</span>`;
	const occupiedBadges = active
		? `<div class="badge-group">
			<span class="badge">OCUPADO</span>
			<span class="badge">${minutesLeft(active.ends_at) > 0 ? `${minutesLeft(active.ends_at)}MIN REST` : "A TERMINAR"}</span>
		</div>`
		: statusBadge;

	const descriptionLine = court.description ? `<p class="card-sub">${court.description}</p>` : "";

	const bodyText = active
		? "Parece que este campo está ocupado no momento. Caso não esteja, podes começar um jogo novo"
		: "Para manter as coisas justas, não é possível iniciar um jogo sem que o jogador esteja no campo.";

	const actionLabel = active ? "Começar novo jogo" : "Estou no campo";

	const locationIcon = `<svg viewBox="0 0 15 15" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="6" r="2.5"/><path d="M7.5 14s-5-4-5-8a5 5 0 0 1 10 0c0 4-5 8-5 8z"/></svg>`;

	app.innerHTML = `
		<div class="card-header">
			<p class="city">${court.city || ""}</p>
			${occupiedBadges}
		</div>
		<p class="card-status">${court.name}</p>
		${descriptionLine}
		<div class="divider"></div>
		<p class="margin-bottom-20 card-sub">${bodyText}</p>
		<button class="finish-btn" id="here-btn">${locationIcon} ${actionLabel}</button>
		<button class="submit" id="back-btn">Voltar</button>
		<p class="card-sub margin-top-10" style="font-size:0.75em">Por favor permita que este navegador confirme a tua localização</p>
	`;

	const mapsUrl = court.lat && court.lng
		? `https://maps.google.com/?daddr=${court.lat},${court.lng}`
		: `https://maps.google.com/?q=${encodeURIComponent(court.name)}`;

	const navIcon = `<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="10,1 19,19 10,14 1,19"/></svg>`;

	document.getElementById("court-footer").innerHTML = `
		<a class="info-link" href="${mapsUrl}" target="_blank" rel="noopener">
			${navIcon}
			Navegar para o campo
		</a>
	`;

	document.getElementById("back-btn").addEventListener("click", () => { location.href = "index.html"; });
	document.getElementById("here-btn").addEventListener("click", () => verifyLocationAndProceed(court));
}

// RENDER A BLOCKING SCREEN WHEN LOCATION CAN'T BE VERIFIED
function renderLocationBlocked(court, message) {
	app.innerHTML = `
		<p class="court-label">${court.name}</p>
		<p class="card-status">Tas onde?</p>
		<p class="card-sub margin-top-10 margin-bottom-20">${message}</p>
		<button class="finish-btn" id="retry-btn">Tentar outra vez</button>
		<button class="submit" id="back-btn">Voltar</button>
	`;
	document.getElementById("retry-btn").addEventListener("click", () => verifyLocationAndProceed(court));
	document.getElementById("back-btn").addEventListener("click", () => { location.href = "index.html"; });
}

// RENDER AVAILABLE STATE WITH CHECK-IN FORM
function renderAvailable(court) {
	document.body.classList.remove("inuse");
	app.classList.add("available");
	app.classList.remove("inuse");

	const descriptionLine = court.description ? `<p class="card-sub">${court.description}</p>` : "";

	const runnerIcon = `<svg viewBox="0 0 15 20" width="15" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="2.5" r="2"/><path d="M5.5 10 8 6l3.5 2-2 3.5"/><path d="M3.5 20 6 15l3 2.5 2.5-5 2.5 7.5"/></svg>`;

	const backIcon = `<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="8.5"/><polyline points="11 7 8 10 11 13"/></svg>`;

	app.innerHTML = `
		<div class="card-header">
			<p class="city">${court.city || ""}</p>
			<span class="badge">LIVRE</span>
		</div>
		<p class="card-status">${court.name}</p>
		${descriptionLine}
		<div class="divider"></div>
		<p class="margin-bottom-20 card-sub">Informe aos outros jogadores quanto tempo pretendes usar o campo</p>
		<div class="duration-grid margin-bottom-10">
			<button class="dur-btn" data-mins="30">30MIN</button>
			<button class="dur-btn" data-mins="45">45MIN</button>
			<button class="dur-btn selected" data-mins="60">1H</button>
		</div>
		<button class="finish-btn" id="checkin-btn">${runnerIcon} Começar jogo</button>
	`;

	document.getElementById("court-footer").innerHTML = `
		<a class="info-link" id="back-link" href="#">
			${backIcon}
			Voltar
		</a>
	`;

	document.querySelectorAll(".dur-btn").forEach(btn => {
		btn.addEventListener("click", () => {
			document.querySelectorAll(".dur-btn").forEach(b => b.classList.remove("selected"));
			btn.classList.add("selected");
			selectedDuration = parseInt(btn.dataset.mins);
		});
	});

	document.getElementById("checkin-btn").addEventListener("click", () => checkIn(court));
	document.getElementById("back-link").addEventListener("click", e => {
		e.preventDefault();
		location.href = "index.html";
	});
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
		btn.textContent = "Começar jogo";
		alert("Algo correu mal. Tenta outra vez.");
		return;
	}

	document.body.classList.remove("inuse");
	document.body.classList.add("success");
	app.classList.remove("available", "inuse");
	document.getElementById("court-footer").innerHTML = "";

	app.innerHTML = `
		<div class="info-hero">
			<img src="css/pig.svg" class="info-pig" alt="">
		</div>
		<p class="bom-jogo">BOM<br>JOGO</p>
		<p class="info-sub1 margin-top-10">Os outros jogadores agradecem a tua consideração</p>
	`;
}

// VERIFY THE DEVICE IS ON-PREMISES, THEN SHOW THE CHECK-IN / FINISH FLOW
async function verifyLocationAndProceed(court) {
	app.innerHTML = `<p class="message">Checking your location...</p>`;

	let position;
	try {
		position = await getCurrentPosition();
	} catch (e) {
		renderLocationBlocked(court, "Ativa a localização no teu browser e tenta outra vez.");
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
		renderLocationBlocked(court, "Parece que não estás no campo, ou então a localização falhou. Tente ler o QR Code fixado na entrada do campo.");
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
