export async function renderBookable(court) {
	const app = document.getElementById("app");
	app.classList.add("available");
	app.classList.remove("inuse");

	const { data: { session } } = await db.auth.getSession();
	const user = session?.user ?? null;

	const descriptionLine = `<a class="card-sub deck-flip-link" data-action="flip-deck" href="#">${court.description || "Mais sobre este campo"}<img src="images/icon_info.svg" class="link-icon" alt=""></a>`;

	const header = `
		<div class="card-header">
			${cityHtml(court.city)}
			<span class="badge">RESERVAS</span>
		</div>
		<p class="card-status">${court.name}</p>
		${descriptionLine}
		<div class="divider"></div>
	`;

	const footerHtml = `
		<a class="info-link" id="back-link" href="index.html">
			<img src="images/icon_back.svg" class="link-icon" alt="">
			Voltar
		</a>`;

	document.getElementById("court-footer").innerHTML = footerHtml;

	if (!user) {
		app.innerHTML = `${header}
			<p class="card-sub margin-bottom-20"><b>Olá, jogador.</b> Reservas neste campo estão destinadas a membros. Primeiro faz login no Campo Livre e depois solicita um membership neste campo para poder jogar</p>
			<button id="login-btn">Fazer login</button>
		`;
		document.getElementById("login-btn").addEventListener("click", () => { location.href = "login.html"; });
		return;
	}

	const { data: profile } = await db.from("profiles").select("name").eq("id", user.id).single();
	const name = profile?.name || user.user_metadata?.name || "jogador";

	// Fetch sibling courts if this court belongs to a group
	let siblingCourts = [];
	if (court.group_id) {
		const { data } = await db.from("courts")
			.select("id, name")
			.eq("group_id", court.group_id)
			.eq("active", true)
			.neq("id", court.id)
			.order("group_position");
		siblingCourts = data || [];
	}

	const siblingNote = siblingCourts.length > 0
		? `<p class="card-sub margin-top-10" style="font-size:0.8em">Este membership é também válido para: ${siblingCourts.map(c => c.name).join(", ")}.</p>`
		: "";

	// Check membership — group-scoped if court has a group, otherwise court-scoped
	const membershipQuery = court.group_id
		? db.from("memberships").select("status, denied_reason").eq("player_id", user.id).eq("group_id", court.group_id)
		: db.from("memberships").select("status, denied_reason").eq("player_id", user.id).eq("court_id", court.id);

	const { data: membership } = await membershipQuery.maybeSingle();

	if (membership?.status === "pending") {
		app.innerHTML = `${header}
			<p class="card-sub"><b>Olá, ${name}.</b> A tua solicitação de membership está pendente de aprovação.</p>
			${siblingNote}
		`;
		return;
	}

	if (membership?.status === "denied") {
		const reason = membership.denied_reason ? ` Motivo: ${membership.denied_reason}.` : "";
		app.innerHTML = `${header}
			<p class="card-sub margin-bottom-20"><b>Olá, ${name}.</b> A tua solicitação foi recusada.${reason} Podes solicitar novamente.</p>
			${siblingNote}
			<button id="reapply-btn">Solicitar novamente</button>
		`;
		document.getElementById("reapply-btn").addEventListener("click", () => requestMembership(court, user, name, app, header, siblingNote, true));
		return;
	}

	if (membership?.status === "approved") {
		// Future: booking UI goes here
		app.innerHTML = `${header}
			<p class="card-sub"><b>Olá, ${name}.</b> És membro deste campo.</p>
			${siblingNote}
		`;
		return;
	}

	app.innerHTML = `${header}
		<p class="card-sub margin-bottom-20"><b>Olá, ${name}.</b> Reservas neste campo estão destinadas a membros. Quer solicitar um membership?</p>
		${siblingNote}
		<button id="membership-btn">Solicitar membership</button>
	`;
	document.getElementById("membership-btn").addEventListener("click", () => requestMembership(court, user, name, app, header, siblingNote, false));
}

async function requestMembership(court, user, name, app, header, siblingNote, isReapply) {
	const btn = document.getElementById("membership-btn") || document.getElementById("reapply-btn");
	if (btn) { btn.disabled = true; btn.textContent = "A enviar..."; }

	// Re-apply: delete the denied row first so we can insert fresh
	if (isReapply) {
		const deleteQuery = court.group_id
			? db.from("memberships").delete().eq("player_id", user.id).eq("group_id", court.group_id)
			: db.from("memberships").delete().eq("player_id", user.id).eq("court_id", court.id);
		await deleteQuery;
	}

	const scope = court.group_id
		? { player_id: user.id, group_id: court.group_id }
		: { player_id: user.id, court_id: court.id };

	const { error } = await db.from("memberships").insert(scope);

	if (error) {
		if (btn) { btn.disabled = false; btn.textContent = isReapply ? "Solicitar novamente" : "Solicitar membership"; }
		return;
	}

	app.innerHTML = `${header}
		<p class="card-sub"><b>Olá, ${name}.</b> A tua solicitação de membership está pendente de aprovação.</p>
		${siblingNote}
	`;
}
