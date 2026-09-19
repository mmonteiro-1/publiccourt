const app = document.getElementById("app");

async function loadDashboard(user) {
	const { data: ownedGroups } = await db.from("court_groups").select("id");
	if (!ownedGroups || ownedGroups.length === 0) {
		location.href = "profile.html";
		return;
	}

	const groupIds = ownedGroups.map(g => g.id);

	const [{ data: memberships }, { data: courts }] = await Promise.all([
		db.from("memberships")
			.select("id, player_id, group_id, court_id, created_at")
			.eq("status", "pending")
			.in("group_id", groupIds),
		db.from("courts")
			.select("id, name, group_id")
			.in("group_id", groupIds)
			.eq("active", true),
	]);

	const playerIds = [...new Set((memberships || []).map(m => m.player_id))];
	let profiles = {};
	if (playerIds.length > 0) {
		const { data: profileData } = await db.from("profiles").select("id, name").in("id", playerIds);
		profiles = Object.fromEntries((profileData || []).map(p => [p.id, p]));
	}

	const courtsByGroup = {};
	(courts || []).forEach(c => {
		if (!courtsByGroup[c.group_id]) courtsByGroup[c.group_id] = [];
		courtsByGroup[c.group_id].push(c.name);
	});

	if (!memberships || memberships.length === 0) {
		app.innerHTML = `
			<p class="owner-section">Memberships pendentes</p>
			<p class="form-sent">Sem solicitações pendentes.</p>
			<button class="form-btn" id="logout-btn" style="margin-top:30px">Sair</button>
		`;
		document.getElementById("logout-btn").addEventListener("click", async () => {
			await db.auth.signOut();
			location.href = "login.html";
		});
		return;
	}

	app.innerHTML = `
		<p class="owner-section">Memberships pendentes</p>
		${memberships.map(m => {
			const playerName = profiles[m.player_id]?.name || "Jogador desconhecido";
			const courtNames = (courtsByGroup[m.group_id] || []).join(", ");
			const date = new Date(m.created_at).toLocaleDateString("pt-PT");
			return `
				<div class="membership-card" data-id="${m.id}">
					<p class="membership-player">${playerName}</p>
					<p class="membership-courts">${courtNames}</p>
					<p class="membership-date">${date}</p>
					<div class="membership-actions">
						<button class="finish-btn approve-btn" data-id="${m.id}">Aprovar</button>
						<button class="form-btn deny-btn" data-id="${m.id}">Recusar</button>
					</div>
					<div class="deny-form" id="deny-form-${m.id}" hidden>
						<input class="form-input" id="deny-reason-${m.id}" placeholder="Motivo da recusa (opcional)" type="text">
						<button class="form-btn confirm-deny-btn" data-id="${m.id}" style="margin-top:10px">Confirmar recusa</button>
					</div>
				</div>
			`;
		}).join("")}
		<button class="form-btn" id="logout-btn" style="margin-top:15px">Sair</button>
	`;

	document.querySelectorAll(".approve-btn").forEach(btn => {
		btn.addEventListener("click", () => approveMembership(btn.dataset.id));
	});

	document.querySelectorAll(".deny-btn").forEach(btn => {
		btn.addEventListener("click", () => {
			document.getElementById(`deny-form-${btn.dataset.id}`).hidden = false;
			btn.hidden = true;
		});
	});

	document.querySelectorAll(".confirm-deny-btn").forEach(btn => {
		btn.addEventListener("click", () => {
			const reason = document.getElementById(`deny-reason-${btn.dataset.id}`).value.trim();
			denyMembership(btn.dataset.id, reason);
		});
	});

	document.getElementById("logout-btn").addEventListener("click", async () => {
		await db.auth.signOut();
		location.href = "login.html";
	});
}

async function approveMembership(id) {
	const card = document.querySelector(`.membership-card[data-id="${id}"]`);
	const btn = card.querySelector(".approve-btn");
	btn.disabled = true;
	btn.textContent = "A aprovar...";

	const { error } = await db.from("memberships")
		.update({ status: "approved", approved_at: new Date().toISOString() })
		.eq("id", id);

	if (error) { btn.disabled = false; btn.textContent = "Aprovar"; return; }
	card.remove();
}

async function denyMembership(id, reason) {
	const card = document.querySelector(`.membership-card[data-id="${id}"]`);
	const btn = card.querySelector(".confirm-deny-btn");
	btn.disabled = true;
	btn.textContent = "A recusar...";

	const { error } = await db.from("memberships")
		.update({ status: "denied", denied_reason: reason || null })
		.eq("id", id);

	if (error) { btn.disabled = false; btn.textContent = "Confirmar recusa"; return; }
	card.remove();
}

db.auth.onAuthStateChange((event, session) => {
	if (session) {
		loadDashboard(session.user);
	} else if (event === "INITIAL_SESSION") {
		location.href = "login.html";
	}
});
