const app = document.getElementById("app");
let ownerData = null;

const DAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

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
	{ label: "45 min", minutes: 45 },
	{ label: "60 min", minutes: 60 },
	{ label: "90 min", minutes: 90 },
	{ label: "120 min", minutes: 120 },
];

const MIN_GAME_DURATION_OPTIONS = [
	{ label: "—", minutes: "" },
	{ label: "30 min", minutes: 30 },
	{ label: "45 min", minutes: 45 },
	{ label: "60 min", minutes: 60 },
	{ label: "90 min", minutes: 90 },
];

function showView(view) {
	document.querySelectorAll(".owner-view").forEach(el => el.hidden = true);
	document.getElementById(`view-${view}`).hidden = false;
	document.querySelectorAll(".owner-nav-btn").forEach(btn => {
		btn.classList.toggle("active", btn.dataset.view === view);
	});
}

async function loadDashboard(user) {
	const { data: ownedGroups } = await db.from("court_groups").select("id, membership_duration_months, slot_duration_minutes, min_game_duration_minutes, price_per_slot_cents").eq("owner_id", user.id);
	if (!ownedGroups || ownedGroups.length === 0) {
		location.href = "profile.html";
		return;
	}

	const groupIds = ownedGroups.map(g => g.id);

	const [
		{ data: pending },
		{ data: approved },
		{ data: courts },
		{ data: openingHours },
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
			.select("id, name, group_id")
			.in("group_id", groupIds)
			.eq("active", true),
		db.from("court_opening_hours")
			.select("*")
			.in("group_id", groupIds),
	]);

	const allPlayerIds = [...new Set([...(pending || []), ...(approved || [])].map(m => m.player_id))];
	let profiles = {};
	if (allPlayerIds.length > 0) {
		const { data: profileData } = await db.from("profiles").select("id, name").in("id", allPlayerIds);
		profiles = Object.fromEntries((profileData || []).map(p => [p.id, p]));
	}

	const courtsByGroup = {};
	(courts || []).forEach(c => {
		if (!courtsByGroup[c.group_id]) courtsByGroup[c.group_id] = [];
		courtsByGroup[c.group_id].push(c.name);
	});

	const openingHoursByGroup = {};
	(openingHours || []).forEach(h => {
		if (!openingHoursByGroup[h.group_id]) openingHoursByGroup[h.group_id] = {};
		openingHoursByGroup[h.group_id][h.day_of_week] = h;
	});

	ownerData = {
		ownedGroups,
		pending: pending || [],
		approved: approved || [],
		courts: courts || [],
		profiles,
		courtsByGroup,
		openingHoursByGroup,
	};

	document.getElementById("loading-msg").hidden = true;
	document.querySelector(".owner-nav").hidden = false;

	renderPendingView();
	renderMembersView();
	renderRulesView();
	showView("pending");

	document.querySelectorAll(".owner-nav-btn").forEach(btn => {
		btn.addEventListener("click", () => showView(btn.dataset.view));
	});

	document.getElementById("logout-btn").addEventListener("click", async () => {
		await db.auth.signOut();
		location.href = "login.html";
	});
}

function renderPendingView() {
	const container = document.getElementById("view-pending");
	const { pending, profiles, courtsByGroup } = ownerData;

	if (pending.length === 0) {
		container.innerHTML = `<p class="form-sent">Sem solicitações pendentes.</p>`;
		return;
	}

	container.innerHTML = pending.map(m => {
		const playerName = profiles[m.player_id]?.name || "Jogador desconhecido";
		const courtNames = (courtsByGroup[m.group_id] || []).join(", ");
		const date = new Date(m.created_at).toLocaleDateString("pt-PT");
		return `
			<div class="membership-card" data-id="${m.id}">
				<p class="membership-player">${playerName}</p>
				<p class="membership-courts">${courtNames}</p>
				<p class="membership-date">${date}</p>
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

function renderMembersView() {
	const container = document.getElementById("view-members");
	const { approved, profiles, courtsByGroup } = ownerData;

	if (approved.length === 0) {
		container.innerHTML = `<p class="form-sent">Nenhum membro ativo.</p>`;
		return;
	}

	const sorted = [...approved].sort((a, b) => new Date(b.approved_at) - new Date(a.approved_at));

	container.innerHTML = sorted.map(m => {
		const playerName = profiles[m.player_id]?.name || "Jogador desconhecido";
		const courtNames = (courtsByGroup[m.group_id] || []).join(", ");
		const approvedDate = m.approved_at ? new Date(m.approved_at).toLocaleDateString("pt-PT") : "—";
		const expiresDate = m.expires_at ? new Date(m.expires_at).toLocaleDateString("pt-PT") : null;
		return `
			<div class="membership-card" data-id="${m.id}">
				<p class="membership-player">${playerName}</p>
				<p class="membership-courts">${courtNames}</p>
				<p class="membership-date">Aprovado ${approvedDate}</p>
				<p class="membership-date">${expiresDate ? `Expira ${expiresDate}` : "Sem validade"}</p>
				<div class="membership-actions">
					<button class="button-shallow revoke-btn" data-id="${m.id}">Revogar</button>
				</div>
				<div class="revoke-confirm" id="revoke-confirm-${m.id}" hidden>
					<p class="membership-date">Esta ação não pode ser revertida.</p>
					<div class="membership-actions">
						<button class="confirm-revoke-btn" data-id="${m.id}">Revogar</button>
						<button class="button-shallow cancel-revoke-btn" data-id="${m.id}">Cancelar</button>
					</div>
				</div>
			</div>
		`;
	}).join("");

	container.querySelectorAll(".revoke-btn").forEach(btn => {
		btn.addEventListener("click", () => {
			btn.closest(".membership-card").querySelector(".membership-actions").hidden = true;
			document.getElementById(`revoke-confirm-${btn.dataset.id}`).hidden = false;
		});
	});

	container.querySelectorAll(".cancel-revoke-btn").forEach(btn => {
		btn.addEventListener("click", () => {
			document.getElementById(`revoke-confirm-${btn.dataset.id}`).hidden = true;
			btn.closest(".membership-card").querySelector(".membership-actions").hidden = false;
		});
	});

	container.querySelectorAll(".confirm-revoke-btn").forEach(btn => {
		btn.addEventListener("click", () => revokeMembership(btn.dataset.id));
	});
}

async function revokeMembership(id) {
	const card = document.querySelector(`#view-members .membership-card[data-id="${id}"]`);
	const btn = card.querySelector(".confirm-revoke-btn");
	btn.disabled = true;
	btn.textContent = "A revogar...";

	const { error } = await db.from("memberships").delete().eq("id", id);
	if (error) { btn.disabled = false; btn.textContent = "Revogar"; return; }

	card.remove();
}

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

function renderOpeningHoursSection(groupId) {
	const hours = ownerData.openingHoursByGroup[groupId] || {};
	return DAYS.map((dayName, dayIndex) => {
		const h = hours[dayIndex] || {};
		const isClosed = h.closed ?? false;
		return `
			<div class="opening-hours-day" data-day="${dayIndex}" data-closed="${isClosed}">
				<div class="opening-hours-header">
					<p class="membership-courts" style="margin:0">${dayName}</p>
					<button class="day-toggle ${isClosed ? "" : "button-shallow"}">${isClosed ? "Fechado" : "Aberto"}</button>
				</div>
				<div class="opening-hours-times" ${isClosed ? "hidden" : ""}>
					<div class="rule-time-row">
						<div>
							<p class="membership-date">Abertura</p>
							${makeTimeInput("open", h.open)}
						</div>
						<div>
							<p class="membership-date">Fecho</p>
							${makeTimeInput("close", h.close)}
						</div>
					</div>
				</div>
			</div>
		`;
	}).join("");
}

function renderRulesView() {
	const container = document.getElementById("view-rules");
	const { ownedGroups, courtsByGroup } = ownerData;

	container.innerHTML = ownedGroups.map(group => {
		const courtNames = (courtsByGroup[group.id] || []).join(", ");
		const priceEuros = group.price_per_slot_cents != null ? (group.price_per_slot_cents / 100).toFixed(2) : "";

		return `
			<div class="membership-card" data-group-id="${group.id}">
				<p class="membership-player">${courtNames}</p>

				<p class="membership-courts membership-rule-label">Duração do slot</p>
				${makeSelect(SLOT_DURATION_OPTIONS, group.slot_duration_minutes ?? "", "form-input rule-input", { field: "slot_duration_minutes" })}

				<p class="membership-courts membership-rule-label">Preço por slot</p>
				<input class="form-input rule-input" type="number" inputmode="decimal" min="0" step="0.01" placeholder="€0.00" value="${priceEuros}" data-field="price_per_slot_cents">

				<p class="membership-courts membership-rule-label">Duração mínima de jogo</p>
				${makeSelect(MIN_GAME_DURATION_OPTIONS, group.min_game_duration_minutes ?? "", "form-input rule-input", { field: "min_game_duration_minutes" })}

				<p class="membership-courts membership-rule-label">Validade do membership</p>
				${makeSelect(MEMBERSHIP_DURATION_OPTIONS, group.membership_duration_months ?? "", "form-input rule-input", { field: "membership_duration_months" })}

				<p class="membership-courts membership-rule-label" style="margin-top:10px">Horário de funcionamento</p>
				${renderOpeningHoursSection(group.id)}

				<button class="save-rules-btn margin-top-10" data-group-id="${group.id}" disabled>Guardar alterações</button>
			</div>
		`;
	}).join("");

	container.querySelectorAll(".membership-card").forEach(card => {
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

async function saveRules(groupId, card, saveBtn) {
	saveBtn.disabled = true;
	saveBtn.textContent = "A guardar...";

	const updates = {};
	card.querySelectorAll(".rule-input").forEach(input => {
		const field = input.dataset.field;
		if (field === "price_per_slot_cents") {
			const euros = parseFloat(input.value);
			updates[field] = isNaN(euros) ? null : Math.round(euros * 100);
		} else {
			updates[field] = input.value === "" ? null : parseInt(input.value);
		}
	});

	const hoursRows = [];
	card.querySelectorAll(".opening-hours-day").forEach(dayEl => {
		const day = parseInt(dayEl.dataset.day);
		const closed = dayEl.dataset.closed === "true";
		const get = field => dayEl.querySelector(`[data-field="${field}"]`)?.value || null;
		hoursRows.push({
			group_id: groupId,
			day_of_week: day,
			closed,
			open: closed ? null : get("open"),
			close: closed ? null : get("close"),
			pause_start: closed ? null : get("pause_start"),
			pause_end: closed ? null : get("pause_end"),
		});
	});

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

	await db.functions.invoke("notify-membership", { body: { membershipId: id } });
	card.remove();
}

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

db.auth.onAuthStateChange((event, session) => {
	if (session) {
		loadDashboard(session.user);
	} else if (event === "INITIAL_SESSION") {
		location.href = "login.html";
	}
});
