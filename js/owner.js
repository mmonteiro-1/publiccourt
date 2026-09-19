const app = document.getElementById("app");
let ownerData = null;

const DURATION_OPTIONS = [
	{ label: "Sem validade", months: "" },
	{ label: "1 mês", months: 1 },
	{ label: "3 meses", months: 3 },
	{ label: "6 meses", months: 6 },
	{ label: "1 ano", months: 12 },
	{ label: "2 anos", months: 24 },
];

function showView(view) {
	document.querySelectorAll(".owner-view").forEach(el => el.hidden = true);
	document.getElementById(`view-${view}`).hidden = false;
	document.querySelectorAll(".owner-nav-btn").forEach(btn => {
		btn.classList.toggle("active", btn.dataset.view === view);
	});
}

async function loadDashboard(user) {
	const { data: ownedGroups } = await db.from("court_groups").select("id, membership_duration_months");
	if (!ownedGroups || ownedGroups.length === 0) {
		location.href = "profile.html";
		return;
	}

	const groupIds = ownedGroups.map(g => g.id);

	const [
		{ data: pending },
		{ data: approved },
		{ data: courts },
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

	ownerData = {
		ownedGroups,
		pending: pending || [],
		approved: approved || [],
		courts: courts || [],
		profiles,
		courtsByGroup,
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

function renderRulesView() {
	const container = document.getElementById("view-rules");
	const { ownedGroups, courtsByGroup } = ownerData;

	container.innerHTML = ownedGroups.map(group => {
		const courtNames = (courtsByGroup[group.id] || []).join(", ");
		const current = group.membership_duration_months ?? "";
		const options = DURATION_OPTIONS.map(opt =>
			`<option value="${opt.months}" ${current == opt.months ? "selected" : ""}>${opt.label}</option>`
		).join("");
		return `
			<div class="membership-card">
				<p class="membership-player">${courtNames}</p>
				<p class="membership-courts membership-rule-label">Validade do membership</p>
				<select class="form-input duration-select" data-group-id="${group.id}">
					${options}
				</select>
			</div>
		`;
	}).join("");

	container.querySelectorAll(".duration-select").forEach(sel => {
		sel.addEventListener("change", () => saveDuration(parseInt(sel.dataset.groupId), sel.value));
	});
}

async function saveDuration(groupId, value) {
	const months = value === "" ? null : parseInt(value);
	await db.from("court_groups")
		.update({ membership_duration_months: months })
		.eq("id", groupId);
	const group = ownerData.ownedGroups.find(g => g.id === groupId);
	if (group) group.membership_duration_months = months;
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
