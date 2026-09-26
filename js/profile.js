const app = document.getElementById("app");

const MSG_HELLO = name => `Olá, ${name}`;
const MSG_SAVE_ERROR = "Não foi possível guardar. Tenta outra vez.";
const MSG_SAVED = "Alterações guardadas.";
// SHOWN BOTH DURING ONBOARDING AND ON THE PROFILE, NEXT TO WHERE THE DATA IS ENTERED
const MSG_DATA_DISCLAIMER = "O login só é necessário caso queira reservar um campo. <br><br>Estas informações são relevantes para o administrador do campo quando solicitas uma reserva. Por este motivo o Campo Livre irá guardar os teus dados, embora não tenha interesse neles.";

const MSG_HISTORY_TITLE = "Teus jogos passados";
const MSG_VIEW_INFO = "Dados pessoais";
const MSG_HISTORY_EMPTY = "Teu histórico de jogos ficará guardado aqui.";
const MSG_COURT_UNKNOWN = "Campo desconhecido";
const MSG_GAME_TITLE = court => `Partida em ${court}`;
const MSG_GAME_DURATION = mins => `${mins} min`;
const MSG_KIND_WALKIN = "Jogo público";
const MSG_KIND_BOOKING = "Jogo reservado";
const MSG_VISITOR_INTRO = "Estes são os jogos começados neste dispositivo. Faz login para os guardares na tua conta e os veres em qualquer lado.";
const MSG_VISITOR_LOGIN = "Fazer login";

// ONE-SHOT: THE PAGE A PLAYER STARTED LOGIN FROM (SET BY court-bookable.js). READ AND CLEARED TOGETHER SO
// A LATER, UNRELATED VISIT TO THE PROFILE ISN'T BOUNCED TO AN OLD COURT
function takeReturnTo() {
	try {
		const url = localStorage.getItem("returnTo");
		localStorage.removeItem("returnTo");
		return url;
	} catch {
		return null;
	}
}

// ADOPT THE WALK-INS THIS DEVICE STARTED WHILE LOGGED OUT, SO A VISITOR WHO LATER CREATES AN ACCOUNT
// KEEPS THEIR HISTORY. ONLY UNCLAIMED ROWS ARE TOUCHED — ON A SHARED DEVICE A SECOND ACCOUNT CAN'T
// TAKE WALK-INS THE FIRST ONE ALREADY ADOPTED. WALK-INS FROM A DEVICE THEY NEVER LOG IN ON STAY ANONYMOUS
async function claimDeviceWalkIns(user) {
	await db.from("walk_ins")
		.update({ player_id: user.id })
		.eq("device_id", getDeviceId())
		.is("player_id", null);
}

// ENTRY POINT: REDIRECTS OWNERS, ROUTES NEW USERS TO ONBOARDING, RETURNING USERS TO PROFILE
async function loadProfile(user) {
	await claimDeviceWalkIns(user);

	// OWNERS NEVER LAND ON THE PLAYER PROFILE — SEND THEM TO THEIR DASHBOARD.
	// MUST FILTER BY owner_id — MEMBERS CAN ALSO READ court_groups (FOR SLOT RULES),
	// SO WITHOUT THE FILTER ANY APPROVED MEMBER WOULD BE WRONGLY REDIRECTED TO owner.html.
	const { data: ownedGroups } = await db.from("court_groups").select("id").eq("owner_id", user.id).limit(1);
	if (ownedGroups && ownedGroups.length > 0) {
		takeReturnTo();
		location.href = "owner.html";
		return;
	}

	// maybeSingle() RETURNS null (NOT AN ERROR) WHEN NO ROW EXISTS — USED TO DETECT NEW USERS
	const { data: profile } = await db
		.from("profiles")
		.select("name, phone, nif")
		.eq("id", user.id)
		.maybeSingle();

	// NEW PLAYERS ONBOARD FIRST; THE RETURN HAPPENS WHEN ONBOARDING FINISHES (SEE finish())
	if (!profile) {
		startOnboarding(user);
		return;
	}

	const returnTo = takeReturnTo();
	if (returnTo) {
		location.href = returnTo;
		return;
	}

	showProfile(user, profile);
}

// ONBOARDING SLIDESHOW FOR NEW USERS — ONE QUESTION PER STEP, ALL SAVED IN A SINGLE INSERT AT THE END
function startOnboarding(user) {
	// CENTRES THE ONE-QUESTION SLIDES; THE PROFILE ITSELF STAYS TOP-ANCHORED (SEE .page-profile #app)
	document.body.classList.add("onboarding");
	const collected = { name: '', phone: '', nif: '' };
	let step = 0;

	// NAME IS REQUIRED; PHONE AND NIF ARE OPTIONAL
	const steps = [
		{ question: 'Como devemos chamar-te?', field: 'name', type: 'text', placeholder: 'Nome', autocomplete: 'name', required: true },
		{ question: 'Queres deixar o telefone registado?', field: 'phone', type: 'tel', placeholder: 'Telefone (opcional)', autocomplete: 'tel', required: false },
		{ question: 'Queres deixar o NIF registado?', field: 'nif', type: 'number', placeholder: 'NIF (opcional)', autocomplete: 'off', required: false },
	];

	function render() {
		const s = steps[step];
		const isLast = step === steps.length - 1;
		const isFirst = step === 0;
		// CONTINUE IS BLOCKED ONLY ON THE NAME STEP IF THE FIELD IS EMPTY
		const canAdvance = !s.required || collected[s.field].length > 0;

		app.innerHTML = `
			<p class="card-sub onboarding-step">${step + 1} / ${steps.length}</p>
			<p class="onboarding-question">${s.question}</p>
			<input class="form-input" type="${s.type}" id="onboarding-input"
				placeholder="${s.placeholder}"
				autocomplete="${s.autocomplete}"
				value="${collected[s.field]}">
			<div class="onboarding-actions margin-top-10">
				${!isFirst ? `<button id="back-btn" class="button-shallow">Voltar</button>` : ''}
				<button id="next-btn" ${canAdvance ? '' : 'disabled'}>${isLast ? 'Concluir' : 'Continuar'}</button>
			</div>
			<p class="card-sub margin-top-10 margin-bottom-10" style="font-size: .7em; color: var(--black)">${MSG_DATA_DISCLAIMER}</p>
		`;

		const input = document.getElementById('onboarding-input');
		const nextBtn = document.getElementById('next-btn');

		input.focus();

		// RE-CHECK disabled STATE AS THE USER TYPES ON REQUIRED STEPS
		if (s.required) {
			input.addEventListener('input', () => {
				nextBtn.disabled = !input.value.trim();
			});
		}

		// ENTER KEY ADVANCES LIKE TAPPING CONTINUAR
		input.addEventListener('keydown', e => {
			if (e.key === 'Enter' && !nextBtn.disabled) nextBtn.click();
		});

		if (!isFirst) {
			document.getElementById('back-btn').addEventListener('click', () => {
				// SAVE THE CURRENT FIELD VALUE BEFORE GOING BACK SO IT'S RESTORED ON RETURN
				collected[s.field] = input.value.trim();
				step--;
				render();
			});
		}

		nextBtn.addEventListener('click', async () => {
			collected[s.field] = input.value.trim();
			if (isLast) {
				await finish(nextBtn);
			} else {
				step++;
				render();
			}
		});
	}

	// BUILDS THE INSERT PAYLOAD AND WRITES THE PROFILE; ONLY SETS phone/nif IF THE USER FILLED THEM
	async function finish(nextBtn) {
		nextBtn.disabled = true;
		nextBtn.textContent = 'A guardar...';

		const payload = { id: user.id, name: collected.name };
		if (collected.phone) payload.phone = collected.phone;
		if (collected.nif) payload.nif = collected.nif;

		const { error } = await db.from('profiles').insert(payload);
		if (error) {
			nextBtn.disabled = false;
			nextBtn.textContent = 'Concluir';
			app.insertAdjacentHTML('beforeend', `<p class="form-error">Erro ao guardar. Tenta outra vez.</p>`);
			return;
		}

		const returnTo = takeReturnTo();
		if (returnTo) {
			location.href = returnTo;
			return;
		}

		showProfile(user, { name: collected.name, phone: collected.phone, nif: collected.nif });
	}

	render();
}

// PAST GAMES FOR ONE PLAYER, NEWEST FIRST. A LOGGED-IN PLAYER IS MATCHED ON player_id SO THE HISTORY
// FOLLOWS THE ACCOUNT ONTO ANY DEVICE; A VISITOR HAS ONLY device_id, AND NO BOOKINGS AT ALL
async function fetchHistory(user) {
	const walkIns = db.from("walk_ins").select("court_id, started_at, ends_at, manual_finished_at");
	const [{ data: walkInRows }, { data: bookingRows }] = await Promise.all([
		user ? walkIns.eq("player_id", user.id) : walkIns.eq("device_id", getDeviceId()),
		user
			? db.from("bookings").select("court_id, start_at, end_at").eq("player_id", user.id).eq("status", "confirmed")
			: { data: [] },
	]);

	const now = Date.now();
	return [
		// A WALK-IN STOPPED EARLY STILL CARRIES ITS ORIGINAL (FUTURE) ends_at, SO manual_finished_at WINS
		...(walkInRows ?? []).map(w => ({ courtId: w.court_id, start: w.started_at, end: w.manual_finished_at ?? w.ends_at, kind: MSG_KIND_WALKIN })),
		...(bookingRows ?? []).map(b => ({ courtId: b.court_id, start: b.start_at, end: b.end_at, kind: MSG_KIND_BOOKING })),
	]
		.filter(game => new Date(game.end).getTime() < now)
		.sort((a, b) => new Date(b.start) - new Date(a.start));
}

// COURT NAMES IN ONE QUERY INSTEAD OF AN EMBEDDED JOIN, WHICH WOULD NEED AN FK ON BOTH SOURCE TABLES
async function fetchCourtNames(games) {
	const ids = [...new Set(games.map(game => game.courtId))];
	const { data } = await db.from("courts").select("id, name").in("id", ids);
	return Object.fromEntries((data ?? []).map(court => [court.id, court.name]));
}

// TICKET CARDS REUSING THE OWNER DASHBOARD'S MARKUP, SO A GAME LOOKS THE SAME ON BOTH SIDES OF THE APP
async function loadHistory(container, user) {
	const games = await fetchHistory(user);
	if (!games.length) {
		setPigAppearance(container, MSG_HISTORY_EMPTY, "pig_serving");
		return;
	}

	const courts = await fetchCourtNames(games);
	container.innerHTML = games.map(game => {
		const mins = Math.round((new Date(game.end) - new Date(game.start)) / 60000);
		const title = MSG_GAME_TITLE(courts[game.courtId] ?? MSG_COURT_UNKNOWN);
		// white-space: normal BECAUSE .membership-player TRUNCATES TO ONE LINE, AND COURT NAMES CAN BE LONG
		return `
		<div class="membership-card">
			<p class="membership-player" style="white-space: normal">${title}</p>
			<p class="membership-courts"><img src="images/icon_court.svg" class="link-icon" alt="">${game.kind}</p>
			<div class="divider ticket-divider"></div>
			<div class="membership-date-row">
				<p class="membership-date"><img src="images/icon_calendar_tennis.svg" class="link-icon" alt="">${gameLabel(game.start, game.end)}</p>
				<p class="membership-date"><img src="images/icon_clock.svg" class="link-icon" alt="">${MSG_GAME_DURATION(mins)}</p>
			</div>
		</div>
	`;
	}).join("");
}

// VISITORS SEE THEIR DEVICE'S WALK-IN HISTORY INSTEAD OF BEING BOUNCED TO THE LOGIN PAGE — SOMEONE WHO
// ONLY EVER PLAYS WALK-INS STILL HAS A HISTORY WORTH SHOWING, AND LOGGING IN CLAIMS IT (SEE claimDeviceWalkIns)
function showVisitor() {
	app.innerHTML = `
		<p class="court-rules-label">${MSG_HISTORY_TITLE}</p>
		<div class="bookings-list margin-bottom-20"></div>
		<p class="card-sub margin-bottom-10" style="font-size: .7em">${MSG_VISITOR_INTRO}</p>
		<button id="login-btn"><img src="images/icon_login.svg" class="link-icon" alt="">${MSG_VISITOR_LOGIN}</button>
	`;

	loadHistory(app.querySelector(".bookings-list"), null);
	document.getElementById("login-btn").addEventListener("click", () => { location.href = "login.html"; });
}

// PERSONAL INFO FIELDS SHOWN AND EDITED ON THE PROFILE; ONLY name IS REQUIRED
const PROFILE_FIELDS = [
	{ field: "name", label: "Nome", type: "text", autocomplete: "name" },
	{ field: "phone", label: "Telefone", type: "tel", autocomplete: "tel" },
	{ field: "nif", label: "NIF", type: "number", autocomplete: "off" },
];

// RENDERS THE PLAYER PROFILE: GREETING AND EMAIL (READ-ONLY — IT'S THE LOGIN), THEN A TOGGLE BETWEEN
// THE EDITABLE INFO + LOGOUT PANE AND THE PAST GAMES PANE
function showProfile(user, profile) {
	document.body.classList.remove("onboarding");
	app.innerHTML = `
		<p class="profile-name"></p>
		<p class="profile-email"></p>
		<div class="view-toggle margin-top-20">
			<button class="view-toggle-btn active" data-pane="history" aria-label="${MSG_HISTORY_TITLE}"><img src="images/icon_history.svg" alt=""></button>
			<button class="view-toggle-btn" data-pane="info" aria-label="${MSG_VIEW_INFO}"><img src="images/icon_avatar.svg" alt=""></button>
		</div>
		<div data-pane-body="info" hidden>
			<div class="profile-form">
				${PROFILE_FIELDS.map(f => `
					<div>
						<p class="court-rules-label">${f.label}</p>
						<input class="form-input" type="${f.type}" autocomplete="${f.autocomplete}" data-field="${f.field}">
					</div>
				`).join("")}
				<p class="card-sub" id="profile-feedback" hidden></p>
				<p class="card-sub" style="font-size: .7em">${MSG_DATA_DISCLAIMER}</p>
				<button id="save-profile-btn" disabled><img src="images/icon_save.svg" class="link-icon" alt="">Guardar alterações</button>
				<button id="logout-btn" class="button-shallow">Terminar sessão</button>
			</div>
		</div>
		<div data-pane-body="history">
			<div class="bookings-list margin-top-20"></div>
		</div>
	`;

	loadHistory(app.querySelector(".bookings-list"), user);

	// BOTH PANES ARE RENDERED ONCE AND ONLY HIDDEN, SO SWITCHING NEITHER LOSES UNSAVED EDITS NOR REFETCHES THE HISTORY
	const toggleBtns = app.querySelectorAll(".view-toggle-btn");
	toggleBtns.forEach(btn => btn.addEventListener("click", () => {
		toggleBtns.forEach(b => b.classList.toggle("active", b === btn));
		app.querySelectorAll("[data-pane-body]").forEach(pane => { pane.hidden = pane.dataset.paneBody !== btn.dataset.pane; });
	}));

	// VALUES GO IN THROUGH THE DOM, NOT THE TEMPLATE, SO A QUOTE OR < IN A NAME CAN'T BREAK THE MARKUP
	const greeting = app.querySelector(".profile-name");
	greeting.textContent = MSG_HELLO(profile.name);
	app.querySelector(".profile-email").textContent = user.email;
	const inputs = [...app.querySelectorAll("[data-field]")];
	inputs.forEach(input => { input.value = profile[input.dataset.field] ?? ""; });

	const saveBtn = document.getElementById("save-profile-btn");
	const feedback = document.getElementById("profile-feedback");
	let saved = { ...profile };

	// ENABLED ONLY WHEN SOMETHING DIFFERS FROM WHAT'S SAVED AND THE NAME ISN'T EMPTY
	const refreshSave = () => {
		const changed = inputs.some(i => i.value.trim() !== (saved[i.dataset.field] ?? ""));
		const nameOk = inputs.find(i => i.dataset.field === "name").value.trim().length > 0;
		saveBtn.disabled = !(changed && nameOk);
		feedback.hidden = true;
	};
	inputs.forEach(i => i.addEventListener("input", refreshSave));

	saveBtn.addEventListener("click", async () => {
		saveBtn.disabled = true;
		// EMPTY OPTIONAL FIELDS ARE STORED AS null, MATCHING ONBOARDING WHICH SKIPS THEM
		const updates = Object.fromEntries(inputs.map(i => [i.dataset.field, i.value.trim() || null]));
		// .select() SO AN UPDATE SILENTLY FILTERED OUT BY RLS (0 ROWS) COUNTS AS A FAILURE, NOT A SAVE
		const { data, error } = await db.from("profiles").update(updates).eq("id", user.id).select();
		feedback.hidden = false;
		if (error || !data?.length) {
			feedback.textContent = MSG_SAVE_ERROR;
			refreshSave();
			feedback.hidden = false;
			return;
		}
		saved = { ...updates };
		greeting.textContent = MSG_HELLO(updates.name);
		feedback.textContent = MSG_SAVED;
	});

	document.getElementById("logout-btn").addEventListener("click", async () => {
		await db.auth.signOut();
		location.href = "login.html";
	});
}

// USE onAuthStateChange SO WE RECEIVE THE SESSION ONLY AFTER ANY PENDING TOKEN REFRESH RESOLVES.
// getSession() CAN RETURN null DURING A REFRESH, CAUSING A REDIRECT LOOP WITH login.html.
// THE loaded FLAG PREVENTS loadProfile FROM BEING CALLED TWICE (e.g. INITIAL_SESSION + TOKEN_REFRESHED).
let loaded = false;
db.auth.onAuthStateChange((event, session) => {
	if (session) {
		if (!loaded) {
			loaded = true;
			loadProfile(session.user);
		}
	} else if (event === 'SIGNED_OUT') {
		location.href = 'login.html';
	} else if (event === 'INITIAL_SESSION' && !location.hash.includes('access_token')) {
		// INITIAL_SESSION WITH NO SESSION AND NO MAGIC LINK TOKEN → GENUINELY NOT LOGGED IN
		showVisitor();
	}
});
