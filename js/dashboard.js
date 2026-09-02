// DOM REFERENCES
const grid = document.getElementById("grid");
const rdot = document.getElementById("rdot");
const refreshLabel = document.getElementById("refresh-label");

// MINUTES REMAINING UNTIL A RESERVATION ENDS
function minutesLeft(endsAt) {
	const ms = new Date(endsAt) - Date.now();
	return Math.max(0, Math.ceil(ms / 60000));
}

// PIN EACH COURT ON THE MAP (RUNS ONCE)
let map = null;
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
		new maplibregl.Marker()
			.setLngLat([court.lng, court.lat])
			.setPopup(new maplibregl.Popup({ offset: 25 }).setText(markerLabel))
			.addTo(map);
	});

	if (points.length > 1) {
		const bounds = points.reduce(
			(b, c) => b.extend([c.lng, c.lat]),
			new maplibregl.LngLatBounds([points[0].lng, points[0].lat], [points[0].lng, points[0].lat])
		);
		map.fitBounds(bounds, { padding: 40 });
	}
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
      </div>
    `;
	}
	return `
      <div class="court-card available">
        <p class="court-number">${court.name}${court.city ? ` · ${court.city}` : ""}</p>
        <span class="badge available"><span class="dot"></span> Available</span>
        <p class="card-status available">Ready</p>
        <p class="card-sub">Scan the QR code to check in</p>
      </div>
    `;
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

	// GROUP COURTS BY CITY, SORTED ALPHABETICALLY FOR A STABLE ORDER
	const byCity = new Map();
	courts.forEach(court => {
		const city = court.city || "Other";
		if (!byCity.has(city)) byCity.set(city, []);
		byCity.get(city).push(court);
	});
	const sortedCities = Array.from(byCity.entries()).sort((a, b) => a[0].localeCompare(b[0]));

	grid.innerHTML = sortedCities.map(([city, cityCourts]) => `
      <div class="city-group">
        <p class="city-heading">${city}</p>
        <div class="city-courts">
          ${cityCourts.map(court => renderCourtCard(court, activeMap[court.id])).join("")}
        </div>
      </div>
    `).join("");

	rdot.classList.remove("active");
	void rdot.offsetWidth;
	rdot.classList.add("active");
	refreshLabel.textContent = `Updated ${formatTime(new Date())}`;
}

load();
setInterval(load, 30000);
