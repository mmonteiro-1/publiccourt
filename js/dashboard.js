// DOM REFERENCES
const grid = document.getElementById("grid");
const filterTagsEl = document.getElementById("filterTags");

// CITY FILTER STATE: EVERY CITY EVER SEEN, AND WHICH ONES ARE CURRENTLY VISIBLE
const knownCities = new Set();
const activeCities = new Set();

// LATEST FETCHED DATA, CACHED SO TOGGLING A FILTER TAG DOESN'T NEED A NEW FETCH
let latestCourts = [];
let latestActiveMap = {};

// MINUTES REMAINING UNTIL A RESERVATION ENDS
function minutesLeft(endsAt) {
	const ms = new Date(endsAt) - Date.now();
	return Math.max(0, Math.ceil(ms / 60000));
}

// CREATE THE MAP AND ONE MARKER PER COURT (RUNS ONCE); VISIBILITY IS SYNCED SEPARATELY
let map = null;
const markersByCourtId = {};
function initMap(courts) {
	if (map) return;

	const points = courts.filter(c => c.lat != null && c.lng != null);
	if (points.length === 0) return;

	map = new maplibregl.Map({
		container: "map",
		style: "https://tiles.openfreemap.org/styles/dark",
		center: [points[0].lng, points[0].lat],
		zoom: 13,
		scrollZoom: false,
	});

	points.forEach(court => {
		const markerLabel = court.city ? `${court.name} — ${court.city}` : court.name;
		const marker = new maplibregl.Marker()
			.setLngLat([court.lng, court.lat])
			.setPopup(new maplibregl.Popup({ offset: 25 }).setText(markerLabel));
		markersByCourtId[court.id] = { marker, court };
	});
}

// SHOW ONLY THE MARKERS FOR ACTIVE CITIES, AND FIT THE VIEW TO WHAT'S VISIBLE
function updateMapVisibility() {
	if (!map) return;

	const visiblePoints = [];
	Object.values(markersByCourtId).forEach(({ marker, court }) => {
		if (activeCities.has(court.city || "Other")) {
			marker.addTo(map);
			visiblePoints.push([court.lng, court.lat]);
		} else {
			marker.remove();
		}
	});

	if (visiblePoints.length === 0) return;

	if (visiblePoints.length === 1) {
		map.flyTo({ center: visiblePoints[0], zoom: 13 });
		return;
	}

	const bounds = visiblePoints.reduce(
		(b, pt) => b.extend(pt),
		new maplibregl.LngLatBounds(visiblePoints[0], visiblePoints[0])
	);
	map.fitBounds(bounds, { padding: 40 });
}

// GRAY OUT MAP PINS FOR COURTS THAT ARE CURRENTLY OCCUPIED
function updateMarkerStatus() {
	Object.values(markersByCourtId).forEach(({ marker, court }) => {
		const occupied = Boolean(latestActiveMap[court.id]);
		marker.getElement().classList.toggle("marker-occupied", occupied);
	});
}

// RENDER A SINGLE COURT CARD, AVAILABLE OR IN USE
function renderCourtCard(court, res) {
	if (res) {
		const mins = minutesLeft(res.ends_at);
		return `
      <div class="court-card inuse">
        <p class="court-number">${court.name}${court.city ? ` · ${court.city}` : ""}</p>
        <div class="badge-row">
          <span class="badge inuse"><span class="dot blink"></span> In use</span>
          <span class="badge time">Started ${formatTime(res.started_at)}</span>
          <span class="badge time">Ends ${formatTime(res.ends_at)}</span>
        </div>
        <p class="card-status inuse">${mins > 0 ? `${mins}m left` : "Ending"}</p>
        <p class="card-sub">These are estimated times set by the player — there are no obligations whatsoever.</p>
      </div>
    `;
	}
	return `
      <div class="court-card available">
        <p class="court-number">${court.name}${court.city ? ` · ${court.city}` : ""}</p>
        <span class="badge available"><span class="dot"></span> Available</span>
        <p class="card-status available">Available</p>
        <p class="card-sub">Scan the court's QR code before using it</p>
      </div>
    `;
}

// REBUILD THE FILTER TAG ROW FROM THE COURTS SEEN SO FAR, PRESERVING EXISTING TOGGLE STATE
function updateFilterTags(courts) {
	const cities = Array.from(new Set(courts.map(c => c.city || "Other"))).sort((a, b) => a.localeCompare(b));

	// A CITY NOT SEEN BEFORE STARTS OUT VISIBLE; AN ALREADY-KNOWN CITY KEEPS ITS CURRENT ON/OFF STATE
	cities.forEach(city => {
		if (!knownCities.has(city)) {
			knownCities.add(city);
			activeCities.add(city);
		}
	});

	filterTagsEl.innerHTML = cities.map(city => `
      <button class="filter-tag${activeCities.has(city) ? " active" : ""}" data-city="${city}">${city}</button>
    `).join("");

	filterTagsEl.querySelectorAll(".filter-tag").forEach(btn => {
		btn.addEventListener("click", () => {
			const city = btn.dataset.city;
			activeCities.has(city) ? activeCities.delete(city) : activeCities.add(city);
			btn.classList.toggle("active");
			renderGrid();
			updateMapVisibility();
		});
	});
}

// RENDER THE COURT GRID FROM CACHED DATA, FILTERED BY THE ACTIVE CITY TAGS
function renderGrid() {
	const visible = latestCourts.filter(court => activeCities.has(court.city || "Other"));

	grid.innerHTML = visible.length
		? visible.map(court => renderCourtCard(court, latestActiveMap[court.id])).join("")
		: `<p class="empty">No courts match the selected filters.</p>`;
}

// LOAD ALL COURTS AND THEIR ACTIVE RESERVATIONS
async function load() {
	const now = new Date().toISOString();

	const [{ data: courts }, { data: reservations }] = await Promise.all([
		db.from("courts").select("*").order("id"),
		db.from("reservations").select("*").is("manual_finished_at", null).gt("ends_at", now),
	]);

	if (!courts || courts.length === 0) {
		grid.innerHTML = `<p class="empty">No courts found.</p>`;
		return;
	}

	initMap(courts);

	const activeMap = {};
	(reservations || []).forEach(r => { activeMap[r.court_id] = r; });

	latestCourts = courts;
	latestActiveMap = activeMap;

	updateFilterTags(courts);
	renderGrid();
	updateMarkerStatus();
	updateMapVisibility();
}

load();
setInterval(load, 30000);
