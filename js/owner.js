import { renderSlotPicker } from './slot-picker.js';

const app = document.getElementById("app");
// IN-MEMORY CACHE OF ALL OWNER DATA; POPULATED ONCE ON LOAD, PATCHED IN-PLACE AFTER SAVES
let ownerData = null;

// DAY NAMES INDEXED BY JS getDay() (0 = SUNDAY) — USED FOR OPENING HOURS ROWS
const DAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];

const MEMBERSHIP_DURATION_OPTIONS = [
	{ label: "Sem validade", months: "" },
	{ label: "1 mês", months: 1 },
	{ label: "3 meses", months: 3 },
	{ label: "6 meses", months: 6 },
	{ label: "1 ano", months: 12 },
	{ label: "2 anos", months: 24 },
];

const SLOT_DURATION_OPTIONS = [
	{ label: "—", minutes: "" },
	{ label: "30 min", minutes: 30 },
	{ label: "60 min", minutes: 60 },
];

const MIN_GAME_DURATION_OPTIONS = [
	{ label: "—", minutes: "" },
	{ label: "60 min", minutes: 60 },
	{ label: "90 min", minutes: 90 },
];

// SWITCH BETWEEN THE PENDING / MEMBERS / RULES TABS; HIDES ALL VIEWS THEN SHOWS THE ONE REQUESTED
// SYNC LOGO PIG HERE — RENDER FUNCTIONS RUN IN PARALLEL SO THEIR HIDE/SHOW CALLS WOULD FIGHT EACH OTHER
function showView(view) {
	document.querySelectorAll(".owner-view").forEach(el => el.hidden = true);
	const active = document.getElementById(`view-${view}`);
	active.hidden = false;
	document.querySelectorAll(".owner-nav-btn").forEach(btn => {
		btn.classList.toggle("active", btn.dataset.view === view);
	});
	const logoPig = document.querySelector(".logo-pig");
	if (logoPig) logoPig.style.opacity = active.querySelector(".empty-pig") ? "0" : "";
}

// LOAD ALL OWNER DATA IN ONE BATCH; REDIRECTS TO PROFILE IF THE USER OWNS NO GROUPS
async function loadDashboard(user) {
	const { data: ownedGroups } = await db.from("court_groups").select("id, membership_duration_months, slot_duration_minutes, min_game_duration_minutes, price_per_slot_cents").eq("owner_id", user.id);
	if (!ownedGroups || ownedGroups.length === 0) {
		location.href = "profile.html";
		return;
	}

	const groupIds = ownedGroups.map(g => g.id);

	// FROM MIDNIGHT SO THE SLOT PICKER STILL SHOWS TODAY'S IN-PROGRESS AND PAST GAMES, LIKE THE PLAYER'S
	const todayStart = new Date();
	todayStart.setHours(0, 0, 0, 0);

	const [
		{ data: pending },
		{ data: approved },
		{ data: courts },
		{ data: openingHours },
		{ data: upcomingBookings },
		{ data: allTimeBookings },
	] = await Promise.all([
		db.from("memberships")
			.select("id, player_id, group_id, court_id, created_at")
			.eq("status", "pending")
			.in("group_id", groupIds),
		db.from("memberships")
			.select("id, player_id, group_id, court_id, approved_at, expires_at")
			.eq("status", "approved")
			.in("group_id", groupIds),
		db.from("courts")
			.select("id, name, group_id, lat, lng")
			.in("group_id", groupIds)
			.eq("active", true),
		db.from("court_opening_hours")
			.select("*")
			.in("group_id", groupIds),
		db.from("bookings")
			.select("id, player_id, group_id, court_id, start_at, end_at")
			.in("group_id", groupIds)
			.eq("status", "confirmed")
			.gte("start_at", todayStart.toISOString())
			.order("start_at"),
		// PLAYER_ID ONLY — JUST ENOUGH TO COUNT EACH MEMBER'S BOOKINGS; CANCELLED ONES DON'T COUNT
		db.from("bookings")
			.select("player_id")
			.in("group_id", groupIds)
			.eq("status", "confirmed"),
	]);

	// FETCH PLAYER PROFILES IN A SINGLE QUERY; SET DEDUPLICATES IDS ACROSS PENDING, APPROVED AND BOOKINGS
	const allPlayerIds = [...new Set([...(pending || []), ...(approved || []), ...(upcomingBookings || [])].map(m => m.player_id))];
	let profiles = {};
	if (allPlayerIds.length > 0) {
		const { data: profileData } = await db.from("profiles").select("id, name, phone, nif").in("id", allPlayerIds);
		profiles = Object.fromEntries((profileData || []).map(p => [p.id, p]));
	}

	// INDEX COURTS AND OPENING HOURS BY GROUP FOR O(1) LOOKUPS IN RENDER FUNCTIONS
	const courtsByGroup = {};
	const courtsById = {};
	(courts || []).forEach(c => {
		if (!courtsByGroup[c.group_id]) courtsByGroup[c.group_id] = [];
		courtsByGroup[c.group_id].push(c.name);
		courtsById[c.id] = c.name;
	});

	const openingHoursByGroup = {};
	(openingHours || []).forEach(h => {
		if (!openingHoursByGroup[h.group_id]) openingHoursByGroup[h.group_id] = {};
		openingHoursByGroup[h.group_id][h.day_of_week] = h;
	});

	// INDEX NEXT BOOKING PER PLAYER — BOOKINGS ARE ORDERED BY start_at SO FIRST MATCH IS EARLIEST
	// LIST VIEW AND "NEXT GAME" ONLY CARE ABOUT GAMES NOT YET STARTED; RLS ALSO BLOCKS CANCELLING STARTED ONES
	const now = new Date();
	const notStartedBookings = (upcomingBookings || []).filter(b => new Date(b.start_at) > now);

	const nextBookingByPlayer = {};
	notStartedBookings.forEach(b => {
		if (!nextBookingByPlayer[b.player_id]) nextBookingByPlayer[b.player_id] = b;
	});

	const bookingCountByPlayer = {};
	(allTimeBookings || []).forEach(b => {
		bookingCountByPlayer[b.player_id] = (bookingCountByPlayer[b.player_id] || 0) + 1;
	});

	ownerData = {
		user,
		ownedGroups,
		pending: pending || [],
		approved: approved || [],
		courts: courts || [],
		bookings: notStartedBookings,
		todayBookings: upcomingBookings || [],
		profiles,
		courtsByGroup,
		courtsById,
		openingHoursByGroup,
		nextBookingByPlayer,
		bookingCountByPlayer,
	};

	document.getElementById("loading-msg").hidden = true;
	document.querySelector(".owner-nav").hidden = false;

	renderPendingView();
	renderMembersView();
	renderBookingsView();
	renderRulesView();
	renderProfileView();
	showView("bookings");

	document.querySelectorAll(".owner-nav-btn").forEach(btn => {
		btn.addEventListener("click", () => showView(btn.dataset.view));
	});
}

// RENDER THE LIST OF PENDING MEMBERSHIP REQUESTS WITH APPROVE / DENY ACTIONS
function renderPendingView() {
	const container = document.getElementById("view-pending");
	const { pending, profiles, courtsByGroup } = ownerData;

	if (pending.length === 0) {
		setEmptyState(container, "Sem solicitações<br>pendentes");
		return;
	}

	container.innerHTML = pending.map(m => {
		const profile = profiles[m.player_id];
		const playerName = profile?.name || "Jogador desconhecido";
		const courtNames = (courtsByGroup[m.group_id] || []).join(", ");
		const date = new Date(m.created_at).toLocaleDateString("pt-PT");
		const phoneLine = profile?.phone ? `<p class="membership-courts"><img src="images/icon_phone.svg" class="link-icon" alt="">${profile.phone}</p>` : "";
		const nifLine = profile?.nif ? `<p class="membership-courts"><img src="images/icon_id.svg" class="link-icon" alt="">NIF ${profile.nif}</p>` : "";
		return `
			<div class="membership-card" data-id="${m.id}">
				<div class="membership-player-row">
					<p class="membership-player">${playerName}</p>
					<div class="membership-hole"></div>
				</div>
				<p class="membership-courts"><img src="images/icon_court.svg" class="link-icon" alt="">${courtNames}</p>
				<div class="divider"></div>
				<div class="membership-data">
					<p class="membership-date"><img src="images/icon_calendar_pen.svg" class="link-icon" alt="">${date}</p>
					${phoneLine}
					${nifLine}
				</div>
				<div class="membership-actions">
					<button class="approve-btn" data-id="${m.id}">Aprovar</button>
					<button class="button-shallow deny-btn" data-id="${m.id}">Recusar</button>
				</div>
				<div class="deny-form" id="deny-form-${m.id}" hidden>
					<input class="form-input" id="deny-reason-${m.id}" placeholder="Motivo da recusa (opcional)" type="text">
					<button class="confirm-deny-btn" data-id="${m.id}">Confirmar recusa</button>
				</div>
			</div>
		`;
	}).join("");

	container.querySelectorAll(".approve-btn").forEach(btn => {
		btn.addEventListener("click", () => approveMembership(btn.dataset.id));
	});

	// DENY SHOWS A REASON INPUT INLINE RATHER THAN A SEPARATE PAGE
	container.querySelectorAll(".deny-btn").forEach(btn => {
		btn.addEventListener("click", () => {
			document.getElementById(`deny-form-${btn.dataset.id}`).hidden = false;
			btn.hidden = true;
		});
	});

	container.querySelectorAll(".confirm-deny-btn").forEach(btn => {
		btn.addEventListener("click", () => {
			const reason = document.getElementById(`deny-reason-${btn.dataset.id}`).value.trim();
			denyMembership(btn.dataset.id, reason);
		});
	});
}

// RENDER THE LIST OF APPROVED MEMBERS, SORTED MOST-RECENTLY-APPROVED FIRST
function renderMembersView() {
	const container = document.getElementById("view-members");
	const { approved, profiles, courtsByGroup } = ownerData;

	if (approved.length === 0) {
		setEmptyState(container, "Nenhum membro ativo<br>infelizmente.");
		return;
	}

	const sorted = [...approved].sort((a, b) => new Date(b.approved_at) - new Date(a.approved_at));
	const { nextBookingByPlayer } = ownerData;

	container.innerHTML = sorted.map(m => {
		const playerName = profiles[m.player_id]?.name || "Jogador desconhecido";
		const courtNames = (courtsByGroup[m.group_id] || []).join(", ");
		const approvedDate = m.approved_at ? new Date(m.approved_at).toLocaleDateString("pt-PT") : "—";
		const expiresDate = m.expires_at ? new Date(m.expires_at).toLocaleDateString("pt-PT") : null;
		const nextBooking = nextBookingByPlayer[m.player_id];
		const bookingCount = ownerData.bookingCountByPlayer[m.player_id] || 0;
		const nextGameLabel = nextBooking
			? new Date(nextBooking.start_at).toLocaleString("pt-PT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
			: "Sem jogos agendados";
		return `
			<div class="membership-card" data-id="${m.id}">
				<div class="membership-player-row">
					<p class="membership-player">${playerName}</p>
					<div class="membership-hole"></div>
				</div>
				<div class="membership-date-row">
					<p class="membership-date">Membro desde ${approvedDate}</p>
					<a class="revoke-btn uppercase" style="color: var(--orange)" data-id="${m.id}" href="#">Revogar</a>
				</div>
				<div class="divider"></div>
				<div class="membership-data">
					<p class="membership-courts"><img src="images/icon_court.svg" class="link-icon" alt="">${courtNames}</p>
					<p class="membership-date">${expiresDate ? `<img src="images/icon_timer.svg" class="link-icon" alt=""> ${expiresDate}` : "Sem data de expiração"}</p>
					<p class="membership-date"><img src="images/icon_calendar_clock.svg" class="link-icon" alt="">${nextGameLabel}</p>
					<p class="membership-date"><img src="images/icon_history.svg" class="link-icon" alt="">${bookingCount} ${bookingCount === 1 ? "reserva" : "reservas"}</p>
				</div>
				<div class="revoke-confirm" id="revoke-confirm-${m.id}" hidden>
					<p class="margin-top-10 margin-bottom-10">Esta ação não pode ser revertida. ${playerName} será comunicado por email.</p>
					<div class="membership-actions">
						<button class="confirm-revoke-btn" data-id="${m.id}"><img src="images/icon_death.svg" class="link-icon margin-left-5" alt="">Revogar</button>
						<button class="button-shallow cancel-revoke-btn" data-id="${m.id}">Cancelar</button>
					</div>
				</div>
			</div>
		`;
	}).join("");

	container.querySelectorAll(".revoke-btn").forEach(btn => {
		btn.addEventListener("click", e => {
			e.preventDefault();
			btn.hidden = true;
			document.getElementById(`revoke-confirm-${btn.dataset.id}`).hidden = false;
		});
	});

	container.querySelectorAll(".cancel-revoke-btn").forEach(btn => {
		btn.addEventListener("click", () => {
			document.getElementById(`revoke-confirm-${btn.dataset.id}`).hidden = true;
			btn.closest(".membership-card").querySelector(".revoke-btn").hidden = false;
		});
	});

	container.querySelectorAll(".confirm-revoke-btn").forEach(btn => {
		btn.addEventListener("click", () => revokeMembership(btn.dataset.id));
	});
}

// RENDER THE LIST OF UPCOMING BOOKINGS ACROSS ALL OWNED COURTS, SOONEST FIRST
function renderBookingsView() {
	const container = document.getElementById("view-bookings");
	const { bookings, profiles, courtsById } = ownerData;

	if (bookings.length === 0) {
		setEmptyState(container, "Sem reservas<br>agendadas");
		return;
	}

	container.innerHTML = bookings.map(b => {
		const playerName = profiles[b.player_id]?.name || "Jogador desconhecido";
		const courtName = courtsById[b.court_id] || "Campo desconhecido";
		const s = new Date(b.start_at);
		const e = new Date(b.end_at);
		const fmt = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
		const dateLabel = s.toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short" });
		return `
			<div class="membership-card" data-id="${b.id}">
				<div class="membership-player-row">
					<p class="membership-player">${playerName}</p>
					<div class="membership-hole"></div>
				</div>
				<p class="membership-courts"><img src="images/icon_court.svg" class="link-icon" alt="">${courtName}</p>
				<div class="divider"></div>
				<div class="membership-date-row">
					<p class="membership-date"><img src="images/icon_calendar_clock.svg" class="link-icon" alt="">${dateLabel}, ${fmt(s)}–${fmt(e)}</p>
					<a class="cancel-booking-anchor uppercase" style="color: var(--orange)" data-id="${b.id}" href="#">Cancelar</a>
				</div>
				<div class="cancel-booking-confirm" id="cancel-booking-confirm-${b.id}" hidden>
					<p class="margin-top-10 margin-bottom-10">Esta ação não pode ser revertida. ${playerName} será notificado.</p>
					<div class="membership-actions">
						<button class="confirm-cancel-booking-btn" data-id="${b.id}"><img src="images/icon_death.svg" class="link-icon" alt="">Cancelar</button>
						<button class="button-shallow back-cancel-booking-btn" data-id="${b.id}">Voltar</button>
					</div>
				</div>
			</div>
		`;
	}).join("");

	container.querySelectorAll(".cancel-booking-anchor").forEach(btn => {
		btn.addEventListener("click", e => {
			e.preventDefault();
			btn.hidden = true;
			document.getElementById(`cancel-booking-confirm-${btn.dataset.id}`).hidden = false;
		});
	});

	container.querySelectorAll(".back-cancel-booking-btn").forEach(btn => {
		btn.addEventListener("click", () => {
			document.getElementById(`cancel-booking-confirm-${btn.dataset.id}`).hidden = true;
			btn.closest(".membership-card").querySelector(".cancel-booking-anchor").hidden = false;
		});
	});

	container.querySelectorAll(".confirm-cancel-booking-btn").forEach(btn => {
		btn.addEventListener("click", () => cancelBooking(btn.dataset.id));
	});
}

// SETS status TO cancelled AND REMOVES THE CARD; RLS ONLY ALLOWS THIS WHILE start_at IS STILL IN THE FUTURE
async function cancelBooking(id) {
	const card = document.querySelector(`#view-bookings .membership-card[data-id="${id}"]`);
	const btn = card.querySelector(".confirm-cancel-booking-btn");
	btn.disabled = true;
	btn.textContent = "A cancelar...";

	// .select() SO A ROW SILENTLY FILTERED OUT BY RLS (0 ROWS UPDATED) IS TREATED AS A FAILURE TOO
	const { data, error } = await db.from("bookings").update({ status: "cancelled" }).eq("id", id).select();
	if (error || !data || data.length === 0) {
		btn.disabled = false;
		btn.innerHTML = '<img src="images/icon_death.svg" class="link-icon" alt="">Cancelar';
		return;
	}

	card.remove();
}

// DELETE THE MEMBERSHIP ROW AND REMOVE ITS CARD FROM THE DOM
async function revokeMembership(id) {
	const card = document.querySelector(`#view-members .membership-card[data-id="${id}"]`);
	const btn = card.querySelector(".confirm-revoke-btn");
	btn.disabled = true;
	btn.textContent = "A revogar...";

	const { error } = await db.from("memberships").delete().eq("id", id);
	if (error) { btn.disabled = false; btn.textContent = "Revogar"; return; }

	card.remove();
}

// HTML HELPERS FOR FORM CONTROLS USED IN THE RULES VIEW
function makeSelect(options, currentValue, classes, dataAttrs) {
	const attrs = Object.entries(dataAttrs).map(([k, v]) => `data-${k}="${v}"`).join(" ");
	const opts = options.map(opt => {
		const val = opt.minutes !== undefined ? opt.minutes : opt.months;
		return `<option value="${val}" ${currentValue == val ? "selected" : ""}>${opt.label}</option>`;
	}).join("");
	return `<select class="${classes}" ${attrs}>${opts}</select>`;
}

function makeTimeInput(field, value) {
	const v = value ? value.slice(0, 5) : "";
	return `<input type="time" class="form-input opening-input" data-field="${field}" value="${v}">`;
}

// LUNCH BREAK INPUTS: ONE PAIR FOR WEEKDAYS (REPRESENTATIVE: DAY 1) AND ONE FOR WEEKENDS (DAY 6).
// THE SAME PAUSE IS APPLIED TO ALL DAYS IN EACH GROUP WHEN SAVING.
function renderPauseSection(groupId) {
	const hours = ownerData.openingHoursByGroup[groupId] || {};
	const wd = hours[1] || {};
	const we = hours[6] || {};
	const wdStart = wd.pause_start ? wd.pause_start.slice(0, 5) : "";
	const wdEnd = wd.pause_end ? wd.pause_end.slice(0, 5) : "";
	const weStart = we.pause_start ? we.pause_start.slice(0, 5) : "";
	const weEnd = we.pause_end ? we.pause_end.slice(0, 5) : "";
	return `
		<div class="opening-hours-pause-row">
			<div class="opening-hours-header">
				<p class="court-rules-title">Pausa Seg–Sex</p>
			</div>
			<div class="opening-hours-times">
				<div class="rule-time-row">
					<div>${makeTimeInput("pause_weekday_start", wdStart)}</div>
					<div>${makeTimeInput("pause_weekday_end", wdEnd)}</div>
				</div>
			</div>
		</div>
		<div class="opening-hours-pause-row">
			<div class="opening-hours-header">
				<p class="court-rules-title">Pausa Sab–Dom</p>
			</div>
			<div class="opening-hours-times">
				<div class="rule-time-row">
					<div>${makeTimeInput("pause_weekend_start", weStart)}</div>
					<div>${makeTimeInput("pause_weekend_end", weEnd)}</div>
				</div>
			</div>
		</div>
	`;
}

// RENDERS ONE ROW PER DAY WITH AN OPEN/CLOSED TOGGLE AND TIME INPUTS
function renderOpeningHoursSection(groupId) {
	const hours = ownerData.openingHoursByGroup[groupId] || {};
	return DAYS.map((dayName, dayIndex) => {
		const h = hours[dayIndex] || {};
		const isClosed = h.closed ?? false;
		return `
			<div class="opening-hours-day" data-day="${dayIndex}" data-closed="${isClosed}">
				<div class="opening-hours-header">
					<p class="court-rules-title">${dayName}</p>
					<button class="day-toggle ${isClosed ? "" : "button-shallow"}">${isClosed ? "Fechado" : "Aberto"}</button>
				</div>
				<div class="opening-hours-times" ${isClosed ? "hidden" : ""}>
					<div class="rule-time-row">
						<div>
							${makeTimeInput("open", h.open)}
						</div>
						<div>
							${makeTimeInput("close", h.close)}
						</div>
					</div>
				</div>
			</div>
		`;
	}).join("");
}

// RENDER THE OWNER PROFILE: EMAIL, NAME FROM PROFILES IF AVAILABLE, AND LOGOUT
function renderProfileView() {
	const container = document.getElementById("view-profile");
	const { user } = ownerData;
	container.innerHTML = `
		<p class="membership-player">${user.email}</p>
		<div class="membership-actions">
			<button id="logout-btn">Sair</button>
		</div>
	`;
	container.querySelector("#logout-btn").addEventListener("click", async () => {
		await db.auth.signOut();
		location.href = "login.html";
	});
}

// RENDERS THE RULES FORM FOR EACH OWNED GROUP; SAVE BUTTON IS DISABLED UNTIL AN INPUT CHANGES
function renderRulesView() {
	const container = document.getElementById("view-rules");
	const { ownedGroups, courtsByGroup } = ownerData;

	container.innerHTML = ownedGroups.map(group => {
		const courtNames = (courtsByGroup[group.id] || []).join(", ");
		const priceEuros = group.price_per_slot_cents != null ? (group.price_per_slot_cents / 100).toFixed(2) : "";

		return `
			<div class="court-rules-card" data-group-id="${group.id}">
				<div class="court-rules-toggle">
					<p class="court-rules-title"><img src="images/icon_court.svg" class="link-icon" alt="">${courtNames}</p>
					<img src="images/icon_triangle.svg" class="card-toggle-icon" alt="">
				</div>
				<div class="court-rules-body">

				<div id="owner-slot-picker-${group.id}"></div>
				<div class="divider"></div>

				<div class="court-rules-grid">
					<div>
						<p class="court-rules-label">Duração do slot</p>
						${makeSelect(SLOT_DURATION_OPTIONS, group.slot_duration_minutes ?? "", "form-input rule-input", { field: "slot_duration_minutes" })}
					</div>
					<div>
						<p class="court-rules-label">Preço por slot (€)</p>
						<input class="form-input rule-input" type="number" inputmode="decimal" min="0" step="0.01" placeholder="€0.00" value="${priceEuros}" data-field="price_per_slot_cents">
					</div>
					<div>
						<p class="court-rules-label">Duração mínima jogo</p>
						${makeSelect(MIN_GAME_DURATION_OPTIONS, group.min_game_duration_minutes ?? "", "form-input rule-input", { field: "min_game_duration_minutes" })}
					</div>
					<div>
						<p class="court-rules-label">Validade do passe</p>
						${makeSelect(MEMBERSHIP_DURATION_OPTIONS, group.membership_duration_months ?? "", "form-input rule-input", { field: "membership_duration_months" })}
					</div>
				</div>
				<div class="divider"></div>
				<div>
					<p class="court-rules-title">Horário de funcionamento</p>
					<div class="court-rules-hours">
						${renderOpeningHoursSection(group.id)}
						${renderPauseSection(group.id)}
					</div>
				</div>

				<button class="save-rules-btn margin-top-10" data-group-id="${group.id}" disabled><img src="images/icon_save.svg" class="link-icon" alt="">Guardar alterações</button>
				</div>
			</div>
		`;
	}).join("");

	// OWNER SLOT PICKER PER GROUP — SAME COMPONENT AS THE PLAYER'S, READ-ONLY (NO TAPPING, NO ACTIONS)
	ownedGroups.forEach(group => {
		const openingHours = Object.values(ownerData.openingHoursByGroup[group.id] || {});
		const bookings = ownerData.todayBookings
			.filter(b => b.group_id === group.id)
			.map(b => ({ ...b, player_name: ownerData.profiles[b.player_id]?.name || "Jogador desconhecido" }));
		// COURTS IN A GROUP SHARE A SITE, SO THE FIRST ONE'S COORDINATES STAND IN FOR THE WHOLE GROUP'S FORECAST
		const groupCourt = ownerData.courts.find(c => c.group_id === group.id);
		renderSlotPicker(document.getElementById(`owner-slot-picker-${group.id}`), group, openingHours, null, bookings, null, false, null, true, groupCourt);
	});

	container.querySelectorAll(".court-rules-card").forEach(card => {
		card.querySelector(".court-rules-toggle").addEventListener("click", () => {
			const body = card.querySelector(".court-rules-body");
			const icon = card.querySelector(".card-toggle-icon");
			const collapsed = body.hidden;
			body.hidden = !collapsed;
			icon.style.transform = collapsed ? "" : "rotate(-90deg)";
		});

		const groupId = card.dataset.groupId;
		const saveBtn = card.querySelector(".save-rules-btn");

		card.querySelectorAll(".rule-input, .opening-input").forEach(input => {
			input.addEventListener("change", () => saveBtn.disabled = false);
		});

		card.querySelectorAll(".day-toggle").forEach(btn => {
			btn.addEventListener("click", () => {
				const dayEl = btn.closest(".opening-hours-day");
				const isClosed = dayEl.dataset.closed === "true";
				const nowClosed = !isClosed;
				dayEl.dataset.closed = nowClosed;
				dayEl.querySelector(".opening-hours-times").hidden = nowClosed;
				btn.textContent = nowClosed ? "Fechado" : "Aberto";
				btn.classList.toggle("button-shallow", !nowClosed);
				saveBtn.disabled = false;
			});
		});

		saveBtn.addEventListener("click", () => saveRules(groupId, card, saveBtn));
	});
}

// SAVES COURT RULES AND OPENING HOURS IN PARALLEL; PATCHES ownerData IN MEMORY TO AVOID A RE-FETCH
async function saveRules(groupId, card, saveBtn) {
	saveBtn.disabled = true;
	saveBtn.textContent = "A guardar...";

	const updates = {};
	card.querySelectorAll(".rule-input").forEach(input => {
		const field = input.dataset.field;
		if (field === "price_per_slot_cents") {
			// STORE PRICE AS INTEGER CENTS TO AVOID FLOATING POINT IN THE DB
			const euros = parseFloat(input.value);
			updates[field] = isNaN(euros) ? null : Math.round(euros * 100);
		} else {
			updates[field] = input.value === "" ? null : parseInt(input.value);
		}
	});

	const wdPS = card.querySelector('[data-field="pause_weekday_start"]')?.value || null;
	const wdPE = card.querySelector('[data-field="pause_weekday_end"]')?.value || null;
	const wePB = card.querySelector('[data-field="pause_weekend_start"]')?.value || null;
	const wePE = card.querySelector('[data-field="pause_weekend_end"]')?.value || null;
	// BOTH START AND END MUST BE SET FOR THE PAUSE TO BE VALID; OTHERWISE CLEAR BOTH
	const weekdayPause = (wdPS && wdPE) ? { start: wdPS, end: wdPE } : { start: null, end: null };
	const weekendPause = (wePB && wePE) ? { start: wePB, end: wePE } : { start: null, end: null };

	const hoursRows = [];
	card.querySelectorAll(".opening-hours-day").forEach(dayEl => {
		const day = parseInt(dayEl.dataset.day);
		const closed = dayEl.dataset.closed === "true";
		const get = field => dayEl.querySelector(`[data-field="${field}"]`)?.value || null;
		// APPLY THE SAME WEEKDAY OR WEEKEND PAUSE TO EVERY DAY IN THAT GROUP
		const pause = (day === 0 || day === 6) ? weekendPause : weekdayPause;
		hoursRows.push({
			group_id: groupId,
			day_of_week: day,
			closed,
			open: closed ? null : get("open"),
			close: closed ? null : get("close"),
			pause_start: pause.start,
			pause_end: pause.end,
		});
	});

	// UPSERT ON group_id + day_of_week; ONE ROW PER DAY PER GROUP IS THE INVARIANT
	const [{ error: groupError }, { error: hoursError }] = await Promise.all([
		db.from("court_groups").update(updates).eq("id", groupId),
		db.from("court_opening_hours").upsert(hoursRows, { onConflict: "group_id,day_of_week" }),
	]);

	if (groupError || hoursError) {
		saveBtn.disabled = false;
		saveBtn.textContent = "Guardar alterações";
		return;
	}

	const group = ownerData.ownedGroups.find(g => g.id == groupId);
	if (group) Object.assign(group, updates);
	hoursRows.forEach(r => {
		if (!ownerData.openingHoursByGroup[groupId]) ownerData.openingHoursByGroup[groupId] = {};
		ownerData.openingHoursByGroup[groupId][r.day_of_week] = r;
	});
	saveBtn.textContent = "Guardado";
}

// APPROVE A MEMBERSHIP; CALCULATES expiry FROM THE GROUP'S membership_duration_months IF SET
async function approveMembership(id) {
	const card = document.querySelector(`#view-pending .membership-card[data-id="${id}"]`);
	const btn = card.querySelector(".approve-btn");
	btn.disabled = true;
	btn.textContent = "A aprovar...";

	const membership = ownerData.pending.find(m => m.id === id);
	const group = ownerData.ownedGroups.find(g => g.id === membership?.group_id);

	const approvedAt = new Date().toISOString();
	let expiresAt = null;
	if (group?.membership_duration_months) {
		const d = new Date(approvedAt);
		d.setMonth(d.getMonth() + group.membership_duration_months);
		expiresAt = d.toISOString();
	}

	const { error } = await db.from("memberships")
		.update({ status: "approved", approved_at: approvedAt, expires_at: expiresAt })
		.eq("id", id);

	if (error) { btn.disabled = false; btn.textContent = "Aprovar"; return; }

	// FIRE THE NOTIFICATION EDGE FUNCTION AFTER THE DB WRITE SUCCEEDS
	await db.functions.invoke("notify-membership", { body: { membershipId: id } });
	card.remove();
}

// DENY A MEMBERSHIP AND OPTIONALLY RECORD THE REASON; FIRES NOTIFICATION EDGE FUNCTION
async function denyMembership(id, reason) {
	const card = document.querySelector(`#view-pending .membership-card[data-id="${id}"]`);
	const btn = card.querySelector(".confirm-deny-btn");
	btn.disabled = true;
	btn.textContent = "A recusar...";

	const { error } = await db.from("memberships")
		.update({ status: "denied", denied_reason: reason || null })
		.eq("id", id);

	if (error) { btn.disabled = false; btn.textContent = "Confirmar recusa"; return; }

	await db.functions.invoke("notify-membership", { body: { membershipId: id } });
	card.remove();
}

// ENTRY POINT: LOAD DASHBOARD ON LOGIN, REDIRECT TO LOGIN ON NO SESSION
// INITIAL_SESSION FIRES EXACTLY ONCE ON PAGE LOAD; SIGNED_IN CAN RE-FIRE ON TOKEN REFRESH IN SOME SUPABASE VERSIONS
db.auth.onAuthStateChange((event, session) => {
	if (event === "INITIAL_SESSION") {
		if (session) loadDashboard(session.user);
		else location.href = "login.html";
	}
});
