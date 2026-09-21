// ENTRY POINT FOR court.html — fetches the court record and hands off to the right module.
// This file owns no UI logic: it reads the URL, loads the data, and decides who renders.
//
// Modules on stage:
//   court-walkin.js   — anonymous walk-in flow (check-in, check-out, location verify)
//   court-bookable.js — pre-registered booking flow (registration, calendar, billing)
//   secondary-card.js — secondary card, deck flip, hourly chart, court group diagram

import { initDeck, renderSecondaryCard, loadHourlyChart, renderCourtGroupDiagram } from './secondary-card.js';
import { renderBookable } from './court-bookable.js';
import { init as initWalkin, fetchActiveReservation, renderPreview } from './court-walkin.js';

const app = document.getElementById("app");
const courtId = new URLSearchParams(location.search).get("court");

// Let CSS show an install nudge for browser (non-PWA) visitors.
const isPWA = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
if (!isPWA) document.body.classList.add("non-pwa");

// Share courtId with the walk-in module before any async work starts.
initWalkin(courtId);

async function load() {
	if (!courtId) {
		app.innerHTML = `<p class="message error">No court specified.<br>Add ?court=1 to the URL.</p>`;
		return;
	}

	const { data: court, error: courtErr } = await db
		.from("courts").select("id, name, city, description, lat, lng, group_id, unavailable, bookable").eq("id", courtId).eq("active", true).single();

	if (courtErr || !court) {
		app.innerHTML = `<p class="message error">Campo não encontrado.</p>`;
		return;
	}

	if (court.unavailable) {
		app.innerHTML = `<p class="message error">Este campo está temporariamente encerrado.</p>`;
		return;
	}

	// Route: bookable courts go to court-bookable.js, walk-in courts go to court-walkin.js.
	if (court.bookable) {
		await renderBookable(court);
		renderSecondaryCard(court);
		if (court.group_id) {
			db.from("courts")
				.select("id, name, group_position")
				.eq("group_id", court.group_id)
				.order("group_position")
				.then(({ data }) => {
					if (data && data.length > 1) renderCourtGroupDiagram(data, courtId);
				});
		}
		return;
	}

	const active = await fetchActiveReservation();
	renderPreview(court, active);
	renderSecondaryCard(court);

	// Secondary card content loads lazily — it won't be visible until the user flips the deck.
	if (court.group_id) {
		db.from("courts")
			.select("id, name, group_position")
			.eq("group_id", court.group_id)
			.order("group_position")
			.then(({ data }) => {
				if (data && data.length > 1) renderCourtGroupDiagram(data, courtId);
			});
		loadHourlyChart(courtId);
	}
}

load();
initDeck();

document.getElementById("install-nudge-close")?.addEventListener("click", () => {
	document.getElementById("install-nudge").hidden = true;
});
