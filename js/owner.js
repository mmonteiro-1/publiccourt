const app = document.getElementById("app");
let ownerData = null;

function showView(view) {
	document.querySelectorAll(".owner-view").forEach(el => el.hidden = true);
	document.getElementById(`view-${view}`).hidden = false;
	document.querySelectorAll(".owner-nav-btn").forEach(btn => {
		btn.classList.toggle("active", btn.dataset.view === view);
	});
}

async function loadDashboard(user) {
	const { data: ownedGroups } = await db.from("court_groups").select("id");
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
			.select("id, player_id, group_id, court_id, approved_at")
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
		const date = m.approved_at ? new Date(m.approved_at).toLocaleDateString("pt-PT") : "—";
		return `
			<div class="membership-card">
				<p class="membership-player">${playerName}</p>
				<p class="membership-courts">${courtNames}</p>
				<p class="membership-date">Aprovado ${date}</p>
			</div>
		`;
	}).join("");
}

function renderRulesView() {
	const container = document.getElementById("view-rules");
	const { courts } = ownerData;

	const uniqueCourts = courts.map(c => `
		<div class="membership-card">
			<p class="membership-player">${c.name}</p>
		</div>
	`).join("");

	container.innerHTML = `
		<p class="owner-section">Campos</p>
		${uniqueCourts}
		<p class="owner-section" style="margin-top:20px">Disponibilidade</p>
		<p class="form-sent" style="text-align:left;font-weight:400">Em desenvolvimento.</p>
	`;
}

async function approveMembership(id) {
	const card = document.querySelector(`#view-pending .membership-card[data-id="${id}"]`);
	const btn = card.querySelector(".approve-btn");
	btn.disabled = true;
	btn.textContent = "A aprovar...";

	const { error } = await db.from("memberships")
		.update({ status: "approved", approved_at: new Date().toISOString() })
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
