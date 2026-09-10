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
		style: "https://tiles.openfreemap.org/styles/liberty",
		center: [points[0].lng, points[0].lat],
		zoom: 13,
		scrollZoom: false,
		attributionControl: false,
	});

	points.forEach(court => {
		const extIcon = `<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 4 13 10 7 16"/></svg>`;
		const descHtml = court.description ? `<div class="popup-desc">${court.description}</div>` : "";
		const popup = new maplibregl.Popup({ offset: 40 })
			.setHTML(`<a class="popup-link" href="court?court=${court.id}"><div class="popup-body"><div><div class="popup-name">${court.name}</div>${descHtml}</div>${extIcon}</div></a>`);
		popup.on("open", () => {
			const occupied = Boolean(latestActiveMap[court.id]);
			popup.getElement()?.classList.toggle("popup-occupied", occupied);
		});
		const marker = new maplibregl.Marker()
			.setLngLat([court.lng, court.lat])
			.setPopup(popup);
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
function renderCourtCard(court, res, isOwner = false) {
	const sub = court.description ? `<p class="card-sub">${court.description}</p>` : "";

	if (res) {
		const mins = minutesLeft(res.ends_at);
		const timeLabel = mins > 0 ? `<img src="/images/icon_timer.svg" class="badge-icon">${mins}MIN` : "A ACABAR";
		return `
      <a class="card inuse" href="court?court=${court.id}">
        <div class="card-header">
          ${cityHtml(court.city)}
          <div class="badge-group">
            <span class="badge inuse">OCUPADO</span>
            <span class="badge time">${timeLabel}</span>
          </div>
        </div>
        <p class="card-status inuse">${court.name}</p>
        ${isOwner ? `<p class="card-sub">Meu jogo</p>` : sub}
      </a>
    `;
	}
	return `
      <a class="card available" href="court?court=${court.id}">
        <div class="card-header">
          ${cityHtml(court.city)}
          <span class="badge available">LIVRE</span>
        </div>
        <p class="card-status available">${court.name}</p>
        ${sub}
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
        ${city.toLowerCase().startsWith("ol") && city.toLowerCase().includes("bairro") ? "Oliv. B." : city.toLowerCase().startsWith("alb") ? "Alberg." : city}
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

	const sorted = [...visible].sort((a, b) => {
		const cityDiff = (a.city || "").localeCompare(b.city || "");
		return cityDiff !== 0 ? cityDiff : (a.name || "").localeCompare(b.name || "");
	});

	const myRes = Object.values(latestActiveMap).find(r => r.device_id === getDeviceId());
	const myCourtId = myRes?.court_id;

	const finalSorted = myCourtId
		? [sorted.find(c => c.id === myCourtId), ...sorted.filter(c => c.id !== myCourtId)].filter(Boolean)
		: sorted;

	const logoPig = document.querySelector(".logo-pig");

	if (finalSorted.length) {
		grid.innerHTML = finalSorted.map(court => renderCourtCard(court, latestActiveMap[court.id], court.id === myCourtId)).join("");
		grid.classList.remove("grid--empty");
		if (logoPig) logoPig.style.opacity = "";
	} else {
		grid.innerHTML = `<div class="empty"><img src="images/pig.svg" class="empty-pig" alt=""> <p>Removeste todos<br> os filtros, Zé.</p></div>`;
		grid.classList.add("grid--empty");
		if (logoPig) logoPig.style.opacity = "0";
	}

}

// LOAD ALL COURTS AND THEIR ACTIVE RESERVATIONS
async function load() {
	const now = new Date().toISOString();

	const [{ data: courts }, { data: reservations }] = await Promise.all([
		db.from("courts").select("*").order("id"),
		db.from("reservations").select("*").is("manual_finished_at", null).gt("ends_at", now),
	]);

	if (!courts || courts.length === 0) {
		grid.innerHTML = `<p class="empty">Sem campos encontrados.</p>`;
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

db.channel("reservations-live")
  .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, load)
  .subscribe();
