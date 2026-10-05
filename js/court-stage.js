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

// THE VISITOR NUDGE: A BLANK VISITOR IS INVITED TO SEE THEIR PROGRESS, A SEASONED ONE HEARS WHAT'S ALREADY WAITING.
// EACH WITH ITS OWN LINK TO THE PROFILE, ON THE SAME LINE. NO PLAYER DATA IN THEM, SO THEY GO IN AS HTML
const MSG_NUDGE_FIRST = `<a href="profile.html">Anda cá</a> ver o teu progresso`;
const MSG_NUDGE_WAITING = xp => `Tens ${MSG_XP(xp)} à tua espera. <a href="profile.html">Anda cá ver</a>`;

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
		renderSecondaryCard(court);
		await renderBookable(court);
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

// A CLOSED NUDGE STAYS CLOSED ON THIS DEVICE FOR 10 DAYS, THEN MAY ASK AGAIN — LONG ENOUGH NOT TO NAG, SHORT ENOUGH TO CATCH A
// PLAYER WHO CHANGED THEIR MIND. value SAYS WHAT WAS CLOSED, FOR A NUDGE WITH MORE THAN ONE VERSION. A STORAGE THAT THROWS
// (PRIVATE MODE) JUST MEANS THE NUDGE SHOWS
const NUDGE_SNOOZE_DAYS = 10;
function snoozeNudge(key, value = "closed") {
	try { localStorage.setItem(key, JSON.stringify({ value, until: Date.now() + NUDGE_SNOOZE_DAYS * 24 * 60 * 60 * 1000 })); } catch {}
}
function snoozedNudge(key) {
	try {
		const snooze = JSON.parse(localStorage.getItem(key));
		return snooze && snooze.until > Date.now() ? snooze.value : null;
	} catch {
		return null;
	}
}

const installNudge = document.getElementById("install-nudge");
if (snoozedNudge("installNudgeSnooze")) installNudge.hidden = true;
document.getElementById("install-nudge-close")?.addEventListener("click", () => {
	installNudge.hidden = true;
	snoozeNudge("installNudgeSnooze");
});

// VISITORS ONLY: THE XP THIS DEVICE'S UNCLAIMED WALK-INS HOLD (my_xp BY device_id), OR AN INVITATION TO SEE THEIR PROGRESS IF THERE
// ARE NONE. CLOSING IT SNOOZES THAT VERSION: A BLANK VISITOR WHO CLOSES IT STILL SEES THE OTHER ONE AS SOON AS THEY HAVE XP WAITING
async function showVisitorNudge() {
	const { data: { session } } = await db.auth.getSession();
	if (session) return;
	const { data: xp } = await db.rpc("my_xp", { p_device: getDeviceId() });
	const kind = xp ? "seasoned" : "blank";
	if (snoozedNudge("visitorNudgeSnooze") === kind) return;
	const nudge = document.getElementById("visitor-nudge");
	nudge.querySelector(".uppercase").innerHTML = xp ? MSG_NUDGE_WAITING(xp) : MSG_NUDGE_FIRST;
	nudge.hidden = false;
	document.getElementById("visitor-nudge-close").addEventListener("click", () => {
		nudge.hidden = true;
		snoozeNudge("visitorNudgeSnooze", kind);
	});
}
showVisitorNudge();
