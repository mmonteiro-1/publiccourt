// DOM REFERENCES
const grid = document.getElementById("grid");
const filterTagsEl = document.getElementById("filterTags");
const mapEl = document.getElementById("map");
const viewToggleEl = document.getElementById("viewToggle");

// CITY FILTER STATE: EVERY CITY EVER SEEN, AND WHICH ONES ARE CURRENTLY VISIBLE
const knownCities = new Set();
const activeCities = new Set();

// LATEST FETCHED DATA, CACHED SO TOGGLING A FILTER TAG DOESN'T NEED A NEW FETCH
let latestCourts = [];
let latestActiveMap = {};

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
		attributionControl: false,
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

// SWITCH BETWEEN THE LIST AND MAP VIEWS; MAP IS CREATED LAZILY ON FIRST USE
function setView(view) {
	const showMap = view === "map";

	grid.hidden = showMap;
	mapEl.hidden = !showMap;

	viewToggleEl.querySelectorAll(".view-toggle-btn").forEach(btn => {
		const isActive = btn.dataset.view === view;
		btn.classList.toggle("active", isActive);
		btn.setAttribute("aria-pressed", isActive);
	});

	if (showMap) {
		initMap(latestCourts);
		updateMapVisibility();
		updateMarkerStatus();
		// THE CONTAINER WAS HIDDEN (0x0) WHEN THE MAP WAS CREATED, SO ITS CANVAS NEEDS A RESIZE NOW THAT IT'S VISIBLE
		if (map) map.resize();
	}
}

viewToggleEl.querySelectorAll(".view-toggle-btn").forEach(btn => {
	btn.addEventListener("click", () => setView(btn.dataset.view));
});

// GRAY OUT MAP PINS FOR COURTS THAT ARE CURRENTLY OCCUPIED
function updateMarkerStatus() {
	Object.values(markersByCourtId).forEach(({ marker, court }) => {
		const occupied = Boolean(latestActiveMap[court.id]);
		marker.getElement().classList.toggle("marker-occupied", occupied);
	});
}

// RENDER A SINGLE COURT CARD, AVAILABLE OR IN USE
function renderCourtCard(court, res) {
	const descriptionLine = court.description ? `<p class="card-sub">${court.description}</p>` : "";

	if (res) {
		const mins = minutesLeft(res.ends_at);
		return `
      <a class="card inuse" href="court?court=${court.id}">
        <div class="card-header">
          <p class="city">${court.city || ""}</p>
          <span class="badge inuse"><span class="dot"></span> In use</span>
        </div>
        <div class="badge-row">
          <span class="badge time">Started ${formatTime(res.started_at)}</span>
          <span class="badge time">${mins > 0 ? `${mins}min left` : "Ending"}</span>
        </div>
        <p class="card-status inuse">${court.name}</p>
        ${descriptionLine}
      </a>
    `;
	}
	return `
      <a class="card available" href="court?court=${court.id}">
        <div class="card-header">
          <p class="city">${court.city || ""}</p>
          <span class="badge available"><span class="dot"></span> Available</span>
        </div>
        <p class="card-status available">${court.name}</p>
        ${descriptionLine}
      </a>
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
      <button class="filter-tag${activeCities.has(city) ? " active" : ""}" data-city="${city}">
        ${city}
        <svg class="filter-tag-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
          <line x1="12" y1="4" x2="12" y2="20"></line>
          <line x1="4" y1="12" x2="20" y2="12"></line>
        </svg>
      </button>
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
