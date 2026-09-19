// DOM REFERENCES AND URL PARAMS
const app = document.getElementById("app");
const params = new URLSearchParams(location.search);
const courtId = params.get("court");
let selectedDuration = 45;

// CUSTOM ISO DIAGRAM IMAGES FOR SPECIFIC COURTS (keyed by court id as string)
// Each entry: { src, height? } — height overrides the default IMG_H (80px)
const COURT_CUSTOM_IMAGES = {
	"5": { src: "/images/court_iso_costa1.svg", height: 120 },
	"6": { src: "/images/court_iso_costa2.svg", height: 120 },
};

// MARK BROWSER-ONLY VISITORS SO CSS CAN SHOW AN INSTALL NUDGE ANIMATION
const isPWA = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
if (!isPWA) document.body.classList.add("non-pwa");

// HOW CLOSE (METERS) A DEVICE MUST BE TO THE COURT TO CHECK IN OR FINISH A GAME
const MAX_DISTANCE_METERS = 500;
// EXTRA SLACK ADDED FOR LOW-CONFIDENCE GPS READINGS, CAPPED SO THE CHECK STAYS MEANINGFUL
const MAX_ACCURACY_ALLOWANCE = 500;
const MSG_LOCATION_FAILED = "Parece que não estás no campo, ou então a localização falhou. Tenta ler o QR Code fixado na entrada do campo.";

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
		// Descending + limit 1: if two overlapping reservations somehow exist, pick the one ending latest.
		.order("ends_at", { ascending: false })
		.limit(1);

	return rows && rows.length > 0 ? rows[0] : null;
}

// RENDER THE STATUS PREVIEW SHOWN BEFORE ANY LOCATION CHECK
function renderPreview(court, active) {
	document.body.classList.toggle("inuse", !!active);
	app.classList.toggle("available", !active);
	app.classList.toggle("inuse", !!active);
	const nudge = document.getElementById("install-nudge");
	if (nudge) {
		nudge.classList.toggle("available", !active);
		nudge.classList.toggle("inuse", !!active);
	}

	const statusBadge = `<span class="badge">LIVRE</span>`;
	const occupiedBadges = active
		? `<div class="badge-group">
			<span class="badge">OCUPADO</span>
			<span class="badge">${minutesLeft(active.ends_at) > 0 ? `<img src="/images/icon_timer.svg" class="badge-icon">${minutesLeft(active.ends_at)}MIN` : "A TERMINAR"}</span>
		</div>`
		: statusBadge;

	const descriptionLine = `<a class="card-sub deck-flip-link" data-action="flip-deck" href="#">${court.description || "Mais sobre este campo"}<img src="images/icon_info.svg" class="link-icon" alt=""></a>`;

	const isOwner = active && active.device_id === getDeviceId();
	const bodyText = active
		? isOwner
			? "Podes sempre avisar que o teu jogo vai demorar mais um bocadinho. E caso pares mais cedo, podes avisar que o teu jogo terminou."
			: "Parece que este campo está ocupado de momento. Caso esteja livre, <b>e se estiveres à beira do campo</b> podes terminar o jogo atual"
		: "Para minimizar os batotas, não é possível iniciar um jogo sem que o jogador esteja à beira do campo.";

	const actionLabel = active ? "Terminar jogo atual" : "Estou no campo";

	const locationIcon = active
		? `<img src="images/icon_death.svg" class="link-icon" alt="">`
		: `<img src="images/icon_flag.svg" class="link-icon" alt="">`;

	app.innerHTML = `
		<div class="card-header">
			${cityHtml(court.city)}
			${occupiedBadges}
		</div>
		<p class="card-status">${court.name}</p>
		${descriptionLine}
		<div class="divider"></div>
		<p class="margin-bottom-20 card-sub">${bodyText}</p>
		${isOwner ? `
		<div class="extend-row">
			<button class="finish-btn extend-btn" data-mins="15" ${localStorage.getItem("extended_" + active.id) ? "disabled" : ""}>+ 15MIN</button>
			<button class="finish-btn extend-btn" data-mins="30" ${localStorage.getItem("extended_" + active.id) ? "disabled" : ""}>+ 30MIN</button>
			<button class="finish-btn extend-btn" data-mins="60" ${localStorage.getItem("extended_" + active.id) ? "disabled" : ""}>+ 60MIN</button>
		</div>` : ""}
		<button class="finish-btn" id="here-btn">${locationIcon} ${actionLabel}</button>
		<button class="submit" id="back-btn">Voltar</button>
		${!isOwner ? `<p class="card-sub margin-top-10" style="font-size:0.75em">Por favor permite que este browser confirme a tua localização</p>` : ""}
	`;

	const mapsUrl = court.lat && court.lng
		? `https://maps.google.com/?daddr=${court.lat},${court.lng}`
		: `https://maps.google.com/?q=${encodeURIComponent(court.name)}`;

	const navIcon = `<img src="images/icon_car.svg" class="link-icon" alt="">`;

	document.getElementById("court-footer").innerHTML = `
		<a class="info-link" href="${mapsUrl}" target="_blank" rel="noopener">
			${navIcon}
			Enviar coordenadas ao GPS
		</a>
	`;

	document.getElementById("back-btn").addEventListener("click", () => { location.href = "index.html"; });
	document.getElementById("here-btn").addEventListener("click", () => {
		if (active && isOwner) {
			finishOwnGame(court, active.id);
		} else {
			verifyLocationAndProceed(court);
		}
	});

	if (isOwner) {
		document.querySelectorAll(".extend-btn").forEach(btn => {
			btn.addEventListener("click", () => extendGame(court, active, parseInt(btn.dataset.mins)));
		});
	}
}

// RENDER A BLOCKING SCREEN WHEN LOCATION CAN'T BE VERIFIED
function renderLocationBlocked(court, message) {
	const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
	const isAndroid = /android/i.test(navigator.userAgent);
	const locationHint = isIOS
		? "Se o telefone não pede permissão, o bloqueio pode estar em 2 sítios: 1) Definições → Safari → Localização. 2) Definições → Privacidade → Serviços de Localização → Websites do Safari."
	: isAndroid
		? "Se o telefone não pede permissão, o bloqueio pode estar em 2 sítios: 1) Definições → Aplicações → Chrome → Permissões → Localização. 2) Chrome → ⋮ → Definições → Definições de sites → Localização."
	: "";

	app.innerHTML = `
		<p class="court-label">${court.name}</p>
		<p class="card-status">Tás onde?</p>
		<p class="card-sub margin-top-10 margin-bottom-20">${message}</p>
		<button class="finish-btn" id="retry-btn"><img src="images/icon_location_exclamation.svg" class="link-icon" alt=""> Tentar outra vez</button>
		<button class="finish-btn" id="hint-btn"><img src="images/icon_siren.svg" class="link-icon" alt=""> Não há QR Code na entrada</button>
		<button class="submit" id="back-btn">Voltar</button>
		${locationHint ? `<p class="card-sub margin-top-10" style="font-size: 0.7em">${locationHint}</p>` : ""}
	`;
	document.getElementById("retry-btn").addEventListener("click", () => verifyLocationAndProceed(court));
	document.getElementById("back-btn").addEventListener("click", () => { location.href = "index.html"; });

	const hintBtn = document.getElementById("hint-btn");
	hintBtn.addEventListener("click", async () => {
		hintBtn.disabled = true;
		const { data } = await db.from("courts").select("missing_qr_hint").eq("id", courtId).single();
		await db.from("courts").update({ missing_qr_hint: (data?.missing_qr_hint || 0) + 1 }).eq("id", courtId);
		hintBtn.innerHTML = "Obrigado por avisar";
	});
}

// RENDER AVAILABLE STATE WITH CHECK-IN FORM
function renderAvailable(court) {
	document.body.classList.remove("inuse");
	app.classList.add("available");
	app.classList.remove("inuse");

	const descriptionLine = `<a class="card-sub deck-flip-link" data-action="flip-deck" href="#">${court.description || "Mais sobre este campo"}<img src="images/icon_info.svg" class="link-icon" alt=""></a>`;

	const runnerIcon = `<img src="images/icon_run.svg" class="link-icon" alt="">`;

	const backIcon = `<img src="images/icon_back.svg" class="link-icon" alt="">`;

	app.innerHTML = `
		<div class="card-header">
			${cityHtml(court.city)}
			<span class="badge">LIVRE</span>
		</div>
		<p class="card-status">${court.name}</p>
		${descriptionLine}
		<div class="divider"></div>
		<p class="margin-bottom-20 card-sub">Informa os outros jogadores quanto tempo pretendes usar o campo</p>
		<div class="duration-grid margin-bottom-10">
			<button class="dur-btn selected" data-mins="45">45MIN</button>
			<button class="dur-btn" data-mins="60">60MIN</button>
			<button class="dur-btn" data-mins="90">90MIN</button>
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

// EXTEND THE ACTIVE RESERVATION BY N MINUTES (OWNER ONLY, NO LOCATION CHECK)
async function extendGame(court, active, minutes) {
	const btns = document.querySelectorAll(".extend-btn");
	const clicked = [...btns].find(b => parseInt(b.dataset.mins) === minutes);
	const originalLabel = clicked.innerHTML;

	clicked.innerHTML = `<img src="images/icon_like.svg" class="link-icon" alt="">`;

	const newEndsAt = new Date(new Date(active.ends_at).getTime() + minutes * 60 * 1000).toISOString();

	const { error } = await db.from("reservations")
		.update({ ends_at: newEndsAt })
		.eq("id", active.id);

	if (error) {
		btns.forEach(b => b.disabled = false);
		clicked.innerHTML = originalLabel;
		return;
	}

	localStorage.setItem("extended_" + active.id, "1");

	const timeBadge = app.querySelector(".badge-group .badge:last-child");
	if (timeBadge) {
		const currentMins = minutesLeft(active.ends_at);
		const finalMins = minutesLeft(newEndsAt);
		const timerIcon = `<img src="/images/icon_timer.svg" class="badge-icon">`;
		timeBadge.innerHTML = currentMins > 0
			? `${timerIcon}${currentMins} + ${minutes}MIN`
			: `${timerIcon}${minutes}MIN`;
		setTimeout(() => {
			timeBadge.innerHTML = finalMins > 0
				? `${timerIcon}${finalMins}MIN`
				: "A TERMINAR";
		}, 3000);
	}

	setTimeout(() => {
		clicked.innerHTML = originalLabel;
		btns.forEach(b => b.disabled = true);
	}, 3000);
}

// END A RESERVATION AND SHOW THE THANK-YOU SCREEN (OWNER FINISHING THEIR OWN GAME)
async function finishOwnGame(court, reservationId) {
	const btn = document.getElementById("here-btn");
	btn.disabled = true;

	const { error } = await db.from("reservations")
		.update({ manual_finished_at: new Date().toISOString() })
		.eq("id", reservationId);

	if (error) {
		btn.disabled = false;
		return;
	}

	document.body.classList.remove("inuse");
	document.body.classList.add("success");
	document.querySelector(".deck")?.classList.remove("flipped");
	app.classList.remove("available", "inuse");
	document.getElementById("court-footer").innerHTML = "";

	app.innerHTML = `
		<div class="info-hero">
			<img src="images/pig_sitting.svg" class="info-pig" alt="">
		</div>
		<p class="bom-jogo">OBRIGADO</p>
		<p class="info-sub1 margin-top-10" style="font-size:1.5em">Por avisar que o campo ficou livre.</p>
	`;
	const bg1 = document.createElement('div');
	bg1.className = 'success-bg';
	document.body.appendChild(bg1);

	const countdownEl = document.createElement("div");
	countdownEl.className = "bom-jogo-countdown";
	let secs = 6;
	countdownEl.textContent = secs;
	document.body.appendChild(countdownEl);

	const ticker = setInterval(() => {
		secs--;
		countdownEl.textContent = secs;
	}, 1000);

	// Reload instead of redirect so the page re-fetches live status after the finish.
	// clearInterval first to avoid a tick firing after the page unloads.
	setTimeout(() => {
		clearInterval(ticker);
		location.reload();
	}, 7000);
}

// END SOMEONE ELSE'S RESERVATION (CALLED AFTER LOCATION IS VERIFIED)
async function finishGame(reservationId) {
	const { error } = await db.from("reservations")
		.update({ manual_finished_at: new Date().toISOString() })
		.eq("id", reservationId);

	if (error) alert("Algo correu mal. Tenta outra vez.");
}

// SUBMIT CHECK-IN TO SUPABASE
async function checkIn(court) {
	const btn = document.getElementById("checkin-btn");
	btn.disabled = true;
	btn.textContent = "A iniciar...";

	const endsAt = new Date(Date.now() + selectedDuration * 60 * 1000).toISOString();

	const { error } = await db.from("reservations").insert({
		court_id: courtId,
		ends_at: endsAt,
		device_id: getDeviceId(),
	});

	if (error) {
		btn.disabled = false;
		btn.textContent = "Começar jogo";
		alert("Algo correu mal. Tenta outra vez.");
		return;
	}

	document.body.classList.remove("inuse");
	document.body.classList.add("success");
	document.querySelector(".deck")?.classList.remove("flipped");
	app.classList.remove("available", "inuse");
	document.getElementById("court-footer").innerHTML = "";

	app.innerHTML = `
		<div class="info-hero">
			<img src="images/pig_sitting.svg" class="info-pig" alt="">
		</div>
		<p class="bom-jogo">BOM JOGO</p>
		<p class="info-sub1 margin-top-10" style="font-size:1.5em">Obrigado por avisar os outros jogadores.</p>
		<p class="info-sub1 margin-top-10" style="color: #ffffff8f; font-weight: 400">Se quiseres ser porreiríssimo, coloca também um timer de ${selectedDuration}min a contar.</p>
	`;
	const bg2 = document.createElement('div');
	bg2.className = 'success-bg';
	document.body.appendChild(bg2);
	playBallAnimation(app.querySelector('.info-pig'));

	const countdownEl = document.createElement("div");
	countdownEl.className = "bom-jogo-countdown";
	let secs = 10;
	countdownEl.textContent = secs;
	document.body.appendChild(countdownEl);

	const ticker = setInterval(() => {
		secs--;
		countdownEl.textContent = secs;
	}, 1000);

	setTimeout(() => {
		clearInterval(ticker);
		location.reload();
	}, 11000);
}

// VERIFY THE DEVICE IS ON-PREMISES, THEN SHOW THE CHECK-IN / FINISH FLOW
async function verifyLocationAndProceed(court) {
	app.innerHTML = `<p class="message">A verificar a tua localização...</p>`;

	let position;
	try {
		position = await getCurrentPosition();
	} catch (e) {
		renderLocationBlocked(court, MSG_LOCATION_FAILED);
		return;
	}

	const distance = distanceMeters(
		position.coords.latitude, position.coords.longitude,
		court.lat, court.lng
	);
	// accuracy is the GPS error radius in meters. We widen the allowed distance by that amount
	// so a device with a coarse fix (e.g. Wi-Fi triangulation) isn't unfairly rejected,
	// but cap it so someone far away can't spoof their way in with a deliberately bad signal.
	const allowance = Math.min(position.coords.accuracy || 0, MAX_ACCURACY_ALLOWANCE);
	const threshold = MAX_DISTANCE_METERS + allowance;

	if (distance > threshold) {
		renderLocationBlocked(court, MSG_LOCATION_FAILED);
		return;
	}

	const active = await fetchActiveReservation();
	if (active) await finishGame(active.id);
	renderAvailable(court);
}

// CARD DECK FLIP MECHANIC
function initDeck() {
	const deck = document.querySelector(".deck");
	const mainCard = document.getElementById("app");
	const secondaryCard = document.getElementById("secondary-card");
	const closeBtn = document.getElementById("secondary-close");
	if (!deck || !mainCard || !secondaryCard) return;

	const ANIM_MS = 600;
	let animating = false;

	function flipDeck() {
		if (animating) return;
		animating = true;

		const isFlipped = deck.classList.contains("flipped");
		const topCard = isFlipped ? secondaryCard : mainCard;
		const bottomCard = isFlipped ? mainCard : secondaryCard;

		topCard.classList.add("to-back");
		bottomCard.classList.add("to-front");

		// Swap z-index at midpoint when top card is off-screen
		const mid = setTimeout(() => {
			topCard.style.zIndex = "0";
			bottomCard.style.zIndex = "2";
		}, ANIM_MS / 2);

		topCard.addEventListener("animationend", () => {
			clearTimeout(mid);
			topCard.classList.remove("to-back");
			bottomCard.classList.remove("to-front");
			topCard.style.zIndex = "";
			bottomCard.style.zIndex = "";
			deck.classList.toggle("flipped");
			animating = false;
		}, { once: true });
	}

	closeBtn?.addEventListener("click", flipDeck);

	// Event delegation for flip links injected by render functions
	deck.addEventListener("click", e => {
		if (e.target.closest("[data-action='flip-deck']")) flipDeck();
	});
}

// POPULATE THE SECONDARY CARD WITH COURT INFO AND A STATS PLACEHOLDER
function renderSecondaryCard(court) {
	const secondary = document.getElementById("secondary-card");
	if (!secondary) return;
	secondary.querySelector(".secondary-content")?.remove();
	const content = document.createElement("div");
	content.className = "secondary-content";
	content.innerHTML = `
		
		<div id="court-stats"></div>
	`;
	secondary.querySelector(".secondary-close").insertAdjacentElement("afterend", content);
}

// FETCH ALL RESERVATIONS FOR THIS COURT AND RENDER AN HOURLY OCCUPANCY CHART
async function loadHourlyChart() {
	const statsEl = document.getElementById("court-stats");
	if (!statsEl) return;

	const DAYS = 15; // rolling window; seeded data covers the trailing 14 full days, today is always empty
	const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
	const { data } = await db
		.from("reservations")
		.select("started_at, ends_at, manual_finished_at")
		.eq("court_id", courtId)
		.gte("started_at", since.toISOString());

	const HOURS = Array.from({ length: 10 }, (_, i) => i + 10); // 10h–19h

	// Count weekday and weekend days in the window for each hour's denominator
	let weekdayDays = 0, weekendDays = 0;
	for (let i = 0; i < DAYS; i++) {
		const dow = new Date(since.getTime() + i * 24 * 60 * 60 * 1000).getDay();
		if (dow === 0 || dow === 6) weekendDays++; else weekdayDays++;
	}

	const weekday = {}, weekend = {};
	HOURS.forEach(h => { weekday[h] = 0; weekend[h] = 0; });

	(data || []).forEach(r => {
		const start = new Date(r.started_at);
		const end = new Date(r.manual_finished_at ?? r.ends_at);
		const dow = start.getDay();
		const startH = start.getHours() + start.getMinutes() / 60;
		const endH = end.getHours() + end.getMinutes() / 60;
		const target = (dow === 0 || dow === 6) ? weekend : weekday;
		HOURS.forEach(h => {
			const overlap = Math.max(0, Math.min(endH, h + 1) - Math.max(startH, h));
			target[h] += overlap;
		});
	});

	// Convert occupied hours → occupancy rate (0–1) relative to total available hours per slot
	// Capped at 0.8: a slot showing 100% every time looks unrealistic/synthetic
	const toRate = (occupiedHours, days) => Math.min(0.8, occupiedHours / days);
	const hasData = (data || []).length > 0;

	if (!hasData) {
		// TODO: remove placeholders once app has sufficient data
		const rand = (min, max) => Math.random() * (max - min) + min;
		HOURS.forEach(h => {
			weekday[h] = (h >= 16 && h <= 18) ? rand(0.5, 0.75) : rand(0.1, 0.3);
			weekend[h] = (h >= 10 && h <= 12) ? rand(0.4, 0.75) : (h >= 15 && h <= 18 ? rand(0.35, 0.65) : rand(0.05, 0.2));
		});
	}

	const rate = h => ({
		wd: hasData ? toRate(weekday[h], weekdayDays) : weekday[h],
		we: hasData ? toRate(weekend[h], weekendDays) : weekend[h],
	});

	statsEl.innerHTML = `
		<div class="court-stats-label">Taxa de ocupação por hora</div>
		<div class="chart-legend">(% de vezes em que o campo esteve ocupado)</div>
		<div class="court-chart">
			<div class="chart-area">
				<div class="chart-y-axis">
					<span class="chart-y-label">100%</span>
					<span class="chart-y-label">50%</span>
					<span class="chart-y-label">0%</span>
				</div>
				<div class="chart-bars">
					${HOURS.map(h => { const r = rate(h); return `
					<div class="chart-col">
						<div class="chart-col-bars">
							<div class="chart-bar chart-bar-weekday" style="height:${Math.round(r.wd * 100)}px"></div>
							<div class="chart-bar chart-bar-weekend" style="height:${Math.round(r.we * 100)}px"></div>
						</div>
						<span class="chart-label">${h}h</span>
					</div>`; }).join("")}
				</div>
			</div>
			<div class="chart-legend">
				<span class="legend-item"><span class="legend-dot legend-weekday"></span>Seg–Sex</span>
				<span class="legend-item"><span class="legend-dot legend-weekend"></span>Sab–Dom</span>
			</div>
		</div>
	`;
}

// BUILD THE ISO COURT GROUP DIAGRAM INSIDE THE SECONDARY CARD
function renderCourtGroupDiagram(groupCourts) {
	const secondary = document.getElementById("secondary-card");
	if (!secondary) return;

	secondary.querySelector(".court-diagram-wrapper")?.remove();

	// SVG viewBox is 154×90. Court outline vertices (after group translate -500.5,-93.5):
	//   left=(0.5,57.1)  bottom=(54.9,88.5)  right=(152.7,32.1)  top=(98,0.5)
	// Courts are arranged TL→BR: each successive court steps right (+X) and down (+Y).
	// Step derived from the sideline vector (left→top vertex), scaled to display size.
	const IMG_H = 80;
	const IMG_W = Math.round(154 / 90 * IMG_H);                     // = 137
	// Full sideline step (courts touching) scaled by spacing factor.
	const STEP_X = Math.round((98 - 0.5) / 154 * IMG_W * 0.65);    // ≈ 56
	const STEP_Y = Math.round((57.1 - 0.5) / 90 * IMG_H * 0.65);   // ≈ 33

	const sorted = [...groupCourts].sort((a, b) => a.group_position - b.group_position);
	const currentIndex = sorted.findIndex(c => String(c.id) === String(courtId));
	if (currentIndex === -1) return;

	const wrapper = document.createElement("div");
	wrapper.className = "court-diagram-wrapper";

	const diagram = document.createElement("div");
	diagram.className = "court-group-diagram";

	const currentCustomImage = COURT_CUSTOM_IMAGES[String(courtId)];
	if (currentCustomImage) {
		// Custom image already encodes the full group layout with correct opacities
		const customH = currentCustomImage.height ?? IMG_H;
		const customW = Math.round(154 / 90 * customH);
		diagram.style.width = customW + "px";
		diagram.style.height = customH + "px";
		const img = document.createElement("img");
		img.src = currentCustomImage.src;
		img.alt = "";
		img.className = "court-diagram-img";
		img.style.left = "0";
		img.style.top = "0";
		img.style.width = customW + "px";
		img.style.height = customH + "px";
		diagram.appendChild(img);
	} else {
		const n = sorted.length;
		diagram.style.width = ((n - 1) * STEP_X + IMG_W) + "px";
		diagram.style.height = ((n - 1) * STEP_Y + IMG_H) + "px";
		sorted.forEach((court, i) => {
			const img = document.createElement("img");
			img.src = "/images/court_iso.svg";
			img.alt = court.name || "";
			img.className = "court-diagram-img";
			img.style.left = (i * STEP_X) + "px";
			img.style.top = (i * STEP_Y) + "px";
			img.style.width = IMG_W + "px";
			img.style.height = IMG_H + "px";
			img.style.opacity = i === currentIndex ? "1" : "0.3";
			diagram.appendChild(img);
		});
	}

	const label = document.createElement("div");
	label.className = "court-diagram-label";
	label.textContent = "Disposição do campo";
	wrapper.appendChild(label);
	wrapper.appendChild(diagram);
	const statsEl = secondary.querySelector("#court-stats");
	statsEl ? statsEl.parentElement.insertBefore(wrapper, statsEl) : secondary.appendChild(wrapper);
}

// LOAD COURT STATUS AND SHOW THE PREVIEW SCREEN
async function load() {
	if (!courtId) {
		app.innerHTML = `<p class="message error">No court specified.<br>Add ?court=1 to the URL.</p>`;
		return;
	}

	const { data: court, error: courtErr } = await db
		.from("courts").select("name, city, description, lat, lng, group_id, unavailable").eq("id", courtId).eq("active", true).single();

	if (courtErr || !court) {
		app.innerHTML = `<p class="message error">Campo não encontrado.</p>`;
		return;
	}

	if (court.unavailable) {
		app.innerHTML = `<p class="message error">Este campo está temporariamente encerrado.</p>`;
		return;
	}

	const active = await fetchActiveReservation();
	renderPreview(court, active);
	renderSecondaryCard(court);

	// Populate the secondary card lazily — it won't be visible until the user flips.
	if (court.group_id) {
		db.from("courts")
			.select("id, name, group_position")
			.eq("group_id", court.group_id)
			.order("group_position")
			.then(({ data }) => {
				if (data && data.length > 1) renderCourtGroupDiagram(data);
			});
		loadHourlyChart();
	}
}

load();
initDeck();

document.getElementById("install-nudge-close")?.addEventListener("click", () => {
	document.getElementById("install-nudge").hidden = true;
});
