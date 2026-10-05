const app = document.getElementById("app");

const MSG_HELLO = name => `Olá, ${name}`;
const MSG_SAVE_ERROR = "Não foi possível guardar. Tenta outra vez.";
const MSG_SAVED = "Alterações guardadas.";
// SHOWN BOTH DURING ONBOARDING AND ON THE PROFILE, NEXT TO WHERE THE DATA IS ENTERED
const MSG_RANKING_VISIBILITY = "O ranking só mostra a inicial do teu nome com o apelido e os teus pontos — nunca onde nem quando jogas.";
const MSG_DATA_DISCLAIMER = "Estas informações são relevantes para o administrador do campo quando pedes um passe. Por este motivo o Campo Livre irá guardar os teus dados, embora não tenha interesse neles.";

const MSG_HISTORY_TITLE = "Teus jogos passados";
const MSG_VIEW_INFO = "Dados pessoais";
const MSG_HISTORY_EMPTY = "Teu histórico de jogos ficará guardado aqui.";
const MSG_VISITOR_HISTORY_EMPTY = `Teu histórico de jogos ficará guardado aqui. ${MSG_LOGIN_LINK} para assegurares que não perdes o progresso.`;
const MSG_COURT_UNKNOWN = "Campo desconhecido";
const MSG_GAME_TITLE = court => `Partida em ${court}`;
const MSG_GAME_DURATION = mins => `${mins} min`;
const MSG_KIND_WALKIN = "Jogo público";
const MSG_KIND_BOOKING = "Jogo reservado";
const MSG_VISITOR_INTRO = `Estes são os jogos começados neste dispositivo. ${MSG_LOGIN_LINK} para os guardares na tua conta e os veres em qualquer lado.`;
const MSG_VISITOR_LOGIN = "Fazer login";
const MSG_LINK_FAILED = "Este link de login já não funciona. Cada link só serve uma vez e expira ao fim de algum tempo. Pede um novo e abre-o logo.";
const MSG_DUMMY_TITLE = "Minha primeira partida";
const MSG_DUMMY_PASS = "Meu primeiro passe";
const MSG_VISITOR_PROGRESS = `Vais ver o teu ténis progredir aqui. Usa o Campo Livre quando jogares para acumular XP. ${MSG_LOGIN_LINK} para não perderes o progresso.`;
const MSG_VISITOR_INFO = "Dá o próximo passo no ténis: acompanha a tua evolução e joga em campos privados.";
const MSG_VISITOR_PASSES = `Passes são permissões para jogares em campos privados. É necessário <a href="login.html">login</a> e envio de informações aos administradores do campo.`;
// LOSS AVERSION FOR A VISITOR WITH WALK-INS; A CONCRETE NEXT STEP FOR A BLANK ONE, WHO HAS NOTHING TO LOSE YET
const MSG_TEASER_XP = xp => `Já tens ${MSG_XP(xp)} à tua espera. ${MSG_LOGIN_LINK} para não os perderes.`;
const MSG_TEASER_FIRST = xp => `O teu primeiro jogo vai valer logo ${MSG_XP(xp)}.`;

const MSG_VIEW_PROGRESS = "Progresso";
const MSG_VIEW_RANKING = "Ranking";
const MSG_VIEW_PASSES = "Os teus passes";
const MSG_NO_PASSES = "Não és membro de nenhum campo, infelizmente. Bora mudar isso com o teu primeiro passe!";
const MSG_PASS_REQUESTED = date => `Pedido a ${date}`;
const MSG_PASS_PENDING = "Solicitação enviada. Aguarda aprovação dos administradores do campo.";
const MSG_PASS_DENIED = reason => reason ? `Solicitação recusada. Motivo: ${reason}` : "Solicitação recusada.";

// ONE-SHOT localStorage FLAGS, READ AND CLEARED TOGETHER SO A LATER, UNRELATED VISIT TO THE PROFILE ISN'T REDIRECTED
function takeOnce(key) {
	try {
		const value = localStorage.getItem(key);
		localStorage.removeItem(key);
		return value;
	} catch {
		return null;
	}
}

// AFTER A MAGIC LINK: BACK TO THE COURT LOGIN STARTED FROM (returnTo, SET BY court-bookable.js), ELSE THE COURT LIST.
// justLoggedIn (SET BY login.js) TELLS A LOGIN LANDING APART FROM OPENING THE PROFILE VIA THE HEADER AVATAR.
// A LINK OPENED IN ANOTHER BROWSER HAS NEITHER FLAG AND STAYS ON THE PROFILE
function redirectAfterLogin() {
	const returnTo = takeOnce("returnTo");
	const justLoggedIn = takeOnce("justLoggedIn");
	const target = returnTo || (justLoggedIn && "index.html");
	if (target) location.href = target;
	return Boolean(target);
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

// ENTRY POINT: REDIRECTS ADMINS, ROUTES NEW USERS TO ONBOARDING, RETURNING USERS TO PROFILE
async function loadProfile(user) {
	// LETS login.html GREET THIS DEVICE AS RETURNING NEXT TIME
	try { localStorage.setItem("hasLoggedIn", "1"); } catch {}
	await claimDeviceWalkIns(user);

	// ADMINS NEVER LAND ON THE PLAYER PROFILE — SEND THEM TO THEIR DASHBOARD.
	// MUST FILTER BY admin_id — MEMBERS CAN ALSO READ court_groups (FOR SLOT RULES),
	// SO WITHOUT THE FILTER ANY APPROVED MEMBER WOULD BE WRONGLY REDIRECTED TO admin.html.
	const { data: adminGroups } = await db.from("court_groups").select("id").eq("admin_id", user.id).limit(1);
	if (adminGroups && adminGroups.length > 0) {
		takeOnce("returnTo");
		takeOnce("justLoggedIn");
		location.href = "admin.html";
		return;
	}

	// maybeSingle() RETURNS null (NOT AN ERROR) WHEN NO ROW EXISTS — USED TO DETECT NEW USERS
	const { data: profile } = await db
		.from("profiles")
		.select("name, phone, nif, hide_from_ranking")
		.eq("id", user.id)
		.maybeSingle();

	// NEW PLAYERS ONBOARD FIRST; THE RETURN HAPPENS WHEN ONBOARDING FINISHES (SEE finish())
	if (!profile) {
		startOnboarding(user);
		return;
	}

	if (redirectAfterLogin()) return;
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

		if (redirectAfterLogin()) return;
		showProfile(user, { name: collected.name, phone: collected.phone, nif: collected.nif, hide_from_ranking: false });
	}

	render();
}

// PAST GAMES FOR ONE PLAYER, NEWEST FIRST. A REGISTERED PLAYER IS MATCHED ON player_id SO THE HISTORY
// FOLLOWS THE ACCOUNT ONTO ANY DEVICE; A VISITOR HAS ONLY device_id, AND NO BOOKINGS AT ALL. A VISITOR SEES ONLY UNCLAIMED
// WALK-INS: THOSE ARE EXACTLY WHAT claimDeviceWalkIns HANDS OVER ON LOGIN, NOT ONES AN EARLIER ACCOUNT ON THIS DEVICE ALREADY TOOK.
// THE GAMES AND THE XP EACH EARNED COME FROM THE DATABASE (my_games_xp → games_xp), THE SAME FUNCTION THE RANKING READS, SO THE
// XP RULES LIVE ONLY THERE. IT ALREADY DROPS FUTURE GAMES AND THOSE OF 10 MIN OR LESS (MIS-TAPS, WALK-INS ENDED RIGHT AWAY)
async function fetchHistory(user) {
	const { data } = await db.rpc("my_games_xp", { p_device: user ? null : getDeviceId() });
	const games = (data ?? []).map(g => ({
		courtId: g.court_id,
		start: g.start_at,
		end: g.end_at,
		mins: Math.round((new Date(g.end_at) - new Date(g.start_at)) / 60000),
		kind: g.kind === "booking" ? MSG_KIND_BOOKING : MSG_KIND_WALKIN,
		xp: g.xp,
	}));
	if (!games.length) return games;

	// COURTS IN ONE QUERY INSTEAD OF AN EMBEDDED JOIN, WHICH WOULD NEED AN FK ON BOTH SOURCE TABLES
	const ids = [...new Set(games.map(game => game.courtId))];
	const { data: courts } = await db.from("courts").select("id, name").in("id", ids);
	const byId = Object.fromEntries((courts ?? []).map(court => [court.id, court]));
	return games.map(game => ({ ...game, court: byId[game.courtId] ?? null }));
}

// TICKET CARDS REUSING THE ADMIN DASHBOARD'S MARKUP, SO A GAME LOOKS THE SAME ON BOTH SIDES OF THE APP.
// TAKES THE fetchHistory PROMISE SO THE PROGRESS VIEW CAN SHARE ONE FETCH
// WITH NO GAMES YET, ONE FADED EXAMPLE CARD SHOWS HOW THE LIST WORKS. A FIRST GAME, SO ITS +1000 XP IS EXACTLY WHAT
// THE PLAYER'S OWN FIRST GAME WILL EARN (+500 FOR THE GAME, +500 FOR THE NEW COURT). IT ISN'T IN THE DATABASE, SO THAT NUMBER
// IS FIXED HERE. REALLY DATED YESTERDAY, SO THE STREAK MATHS TREAT IT AS A RECENT PAST GAME
const DUMMY_GAME_XP = 1000;

function dummyGame() {
	const start = new Date();
	start.setDate(start.getDate() - 1);
	start.setHours(18, 0, 0, 0);
	const end = new Date(start);
	end.setHours(19);
	// THE SHOWN DATE IS 30/02, A DAY THAT DOESN'T EXIST, SO IT READS AS AN EXAMPLE. THE REAL DATES STAY FOR THE STREAK MATHS
	return { courtId: 0, title: MSG_DUMMY_TITLE, label: "SAB, 30/02, 18:00-19:00", start: start.toISOString(), end: end.toISOString(), mins: 60, kind: MSG_KIND_WALKIN, xp: DUMMY_GAME_XP };
}

async function loadHistory(container, gamesPromise, emptyMessage = MSG_HISTORY_EMPTY) {
	const games = await gamesPromise;
	const shown = games.length ? games : [dummyGame()];
	// THE MESSAGE GOES ABOVE THE LIST, NOT INSIDE IT, SO EVERY PANE SPACES ITS TEXT AND FIRST CARD THE SAME: 10px EACH
	if (!games.length) {
		container.insertAdjacentHTML("beforebegin", `<p class="card-sub margin-top-10" style="font-size: .7em">${emptyMessage}</p>`);
		container.classList.replace("margin-top-20", "margin-top-10");
	}
	container.innerHTML = shown.map(game => {
		const mins = game.mins;
		const title = game.title ?? MSG_GAME_TITLE(game.court?.name ?? MSG_COURT_UNKNOWN);
		// white-space: normal BECAUSE .ticket-title TRUNCATES TO ONE LINE, AND COURT NAMES CAN BE LONG
		return `
		<div class="ticket${games.length ? "" : " locked"}">
			${games.length ? "" : PADLOCK_HTML}
			<p class="ticket-title" style="white-space: normal">${title}</p>
			<p class="ticket-line"><img src="images/icon_court.svg" class="link-icon" alt="">${game.kind}<span class="game-xp">${MSG_GAME_XP(game.xp)}</span></p>
			<div class="divider ticket-divider"></div>
			<div class="ticket-date-row">
				<p class="ticket-date"><img src="images/icon_calendar_tennis.svg" class="link-icon" alt="">${game.label ?? gameLabel(game.start, game.end)}</p>
				<p class="ticket-date"><img src="images/icon_clock.svg" class="link-icon" alt="">${MSG_GAME_DURATION(mins)}</p>
			</div>
		</div>
	`;
	}).join("");
	return games.length;
}

async function fetchPasses(user) {
	// EVERY STATUS, NOT ONLY approved: THE PASSES VIEW ALSO SHOWS WHAT'S WAITING AND WHAT WAS REFUSED
	const { data } = await db.from("passes")
		.select("group_id, status, denied_reason, created_at, approved_at, expires_at")
		.eq("player_id", user.id);
	return data ?? [];
}

// THE PLAYER'S APPROVED PASSES AS THE SAME CARD THE ADMIN SEES IN THE MEMBERS TAB (admin.js renderMembersView),
// WITH THE GROUP NAME WHERE THE ADMIN SEES THE PLAYER'S. NO REVOKE LINK — THAT'S THE ADMIN'S CALL, NOT THE PLAYER'S
async function loadPasses(container, user, passesPromise) {
	// A PENDING OR REFUSED REQUEST DROPS OUT A MONTH AFTER IT WAS MADE (requestExpired IN utils.js); APPROVED PASSES STAY
	const passes = (await passesPromise).filter(m => m.status === "approved" || !requestExpired(m.created_at));
	// NO PASS YET: THE SAME LOCKED DUMMY TICKET VISITORS GET, SO THE VIEW SHOWS WHAT A PASS LOOKS LIKE INSTEAD OF A LONE PIG.
	// THE MESSAGE GOES ABOVE THE LIST, 10px EACH, LIKE EVERY OTHER PANE WITH A DESCRIPTION
	if (!passes.length) {
		container.insertAdjacentHTML("beforebegin", `<p class="card-sub margin-top-10" style="font-size: .7em">${MSG_NO_PASSES}</p>`);
		container.classList.replace("margin-top-20", "margin-top-10");
		container.innerHTML = dummyPassCard();
		return;
	}

	const groupIds = passes.map(m => m.group_id);
	const [{ data: groups }, { data: courts }, { data: bookings }] = await Promise.all([
		db.from("court_groups").select("id, name").in("id", groupIds),
		db.from("courts").select("id, group_id, name").in("group_id", groupIds).eq("active", true).order("group_position"),
		// ORDERED BY start_at SO THE FIRST NOT-YET-STARTED MATCH PER GROUP IS THE NEXT GAME
		db.from("bookings").select("group_id, start_at, end_at").eq("player_id", user.id).eq("status", "confirmed").in("group_id", groupIds).order("start_at"),
	]);

	const now = new Date();
	const date = ts => ts ? new Date(ts).toLocaleDateString("pt-PT") : "—";
	// WAITING FIRST (THE PLAYER IS WATCHING FOR IT), THEN THE PASSES THEY HOLD, THEN REFUSALS; NEWEST FIRST WITHIN EACH
	const order = { pending: 0, approved: 1, denied: 2 };
	container.innerHTML = [...passes]
		.sort((a, b) => order[a.status] - order[b.status] || new Date(b.created_at) - new Date(a.created_at))
		.map(m => {
			const groupCourts = (courts ?? []).filter(c => c.group_id === m.group_id);
			const courtNames = groupCourts.map(c => c.name).join(", ");
			// MOST GROUPS HAVE NO name IN THE DB, SO THEIR COURTS STAND IN FOR IT
			const groupName = (groups ?? []).find(g => g.id === m.group_id)?.name || courtNames || MSG_COURT_UNKNOWN;
			if (m.status !== "approved") return requestCard(groupName, m, date(m.created_at), groupCourts[0]?.id);
			const groupBookings = (bookings ?? []).filter(b => b.group_id === m.group_id);
			const nextBooking = groupBookings.find(b => new Date(b.start_at) > now);
			return passCard({
				name: groupName,
				since: date(m.approved_at),
				expires: m.expires_at ? date(m.expires_at) : null,
				nextGame: nextBooking ? gameLabel(nextBooking.start_at, nextBooking.end_at) : null,
				bookings: groupBookings.length,
			});
		}).join("");
}

// A PENDING OR REFUSED REQUEST: THE SAME TICKET AND BADGE SLOT AS A PASS.
// A REFUSAL LINKS TO THE COURT PAGE, WHICH ALREADY HANDLES ASKING AGAIN (court-bookable.js)
function requestCard(name, request, requested, courtId) {
	const pending = request.status === "pending";
	return `
		<div class="ticket${pending ? "" : " refused"}">
			<div class="ticket-hole"></div>
			<p class="ticket-title">${name}</p>
			<div class="ticket-date-row">
				<p class="ticket-date">${MSG_PASS_REQUESTED(requested)}</p>
				<p class="ticket-date"><img src="images/icon_trash.svg" class="link-icon" alt="">${requestExpiry(request.created_at).toLocaleDateString("pt-PT")}</p>
			</div>
			<div class="divider"></div>
			<p class="ticket-line"><img src="images/${pending ? "icon_clock" : "icon_user_exclamation"}.svg" class="link-icon" alt="">${pending ? MSG_PASS_PENDING : MSG_PASS_DENIED(request.denied_reason)}</p>
			${!pending && courtId ? `<a href="court?court=${courtId}"><img src="images/icon_praying.svg" class="link-icon" alt="">Solicitar novamente</a>` : ""}
		</div>
	`;
}

// THE VISITOR'S EXAMPLE PASS. DATES ARE 30/02, A DAY THAT DOESN'T EXIST, SO IT READS AS AN EXAMPLE
function dummyPassCard() {
	return passCard({ name: MSG_DUMMY_PASS, since: "30/02", expires: null, nextGame: "SAB, 30/02, 18:00-19:00", bookings: 1, locked: true });
}

// VISITORS SEE THEIR DEVICE'S WALK-IN HISTORY INSTEAD OF BEING BOUNCED TO THE LOGIN PAGE — SOMEONE WHO
// ONLY EVER PLAYS WALK-INS STILL HAS A HISTORY WORTH SHOWING, AND LOGGING IN CLAIMS IT (SEE claimDeviceWalkIns)
// SAME TOGGLE AS A REGISTERED PLAYER'S PROFILE SO VISITORS SEE WHAT AN ACCOUNT ADDS; THE PANES THEY CAN'T USE HOLD THE LOGIN BUTTON
function showVisitor() {
	const loginBtn = `<button data-action="login" class="margin-top-20"><img src="images/icon_login.svg" class="link-icon" alt="">${MSG_VISITOR_LOGIN}</button>`;
	app.innerHTML = `
		${FOLDER_TABS_HTML}
		<div data-pane-body="history" hidden>
			<div class="bookings-list margin-top-20 margin-bottom-20"></div>
			<!-- HIDDEN UNTIL THE HISTORY LOADS, AND FOR A BLANK VISITOR FOR GOOD: AN EMPTY ACCOUNT GAINS THEM NOTHING, AND A BUTTON
			     UNDER THE DUMMY CARD MADE THE CARD ITSELF LOOK CLICKABLE -->
			<div id="visitor-history-extra" hidden>
				<p class="card-sub" style="font-size: .7em">${MSG_VISITOR_INTRO}</p>
				${loginBtn}
			</div>
		</div>
		<!-- THE CARDS ARE ALWAYS THE DUMMY FIRST GAME'S (LEVEL 1), NEVER THE VISITOR'S OWN WALK-INS, WHICH ONLY PICK THE TEASER -->
		<div data-pane-body="progress">
			<p class="card-sub margin-top-10" style="font-size: .7em">${MSG_VISITOR_PROGRESS}</p>
			<div class="bookings-list margin-top-10"></div>
		</div>
		<!-- VISITORS AREN'T RANKED (NO ACCOUNT): THE STANDARD BOARD WITH EXAMPLE PLAYERS AND THE VISITOR AS "O TEU NOME" (visitorRanking), ITS LINE CARRYING THE LOGIN LINK -->
		<div data-pane-body="ranking" hidden>
			<div class="bookings-list margin-top-20"></div>
		</div>
		<div data-pane-body="passes" hidden>
			<p class="card-sub margin-top-10" style="font-size: .7em">${MSG_VISITOR_PASSES}</p>
			<div class="bookings-list margin-top-10">${dummyPassCard()}</div>
		</div>
		<div data-pane-body="info" hidden>
			<p class="card-sub margin-top-10" style="font-size: .7em">${MSG_VISITOR_INFO}</p>
			${loginBtn}
		</div>
	`;

	const games = fetchHistory(null);
	loadHistory(app.querySelector('[data-pane-body="history"] .bookings-list'), games, MSG_VISITOR_HISTORY_EMPTY).then(count => {
		document.getElementById("visitor-history-extra").hidden = !count;
	});
	// WAITS FOR THE WALK-INS ONLY TO PICK THE TEASER — THE CARDS THEMSELVES ARE ALWAYS THE DUMMY FIRST GAME'S
	// A VISITOR HAS NO PASSES, SO THEIR GAMES' XP IS ALREADY WHAT player_xp WOULD SAY
	loadProgress(app.querySelector('[data-pane-body="progress"] .bookings-list'), Promise.resolve([dummyGame()]),
		games.then(list => list.length ? MSG_TEASER_XP(sumXp(list)) : MSG_TEASER_FIRST(DUMMY_GAME_XP)), Promise.resolve(DUMMY_GAME_XP));
	loadRanking(app.querySelector('[data-pane-body="ranking"] .bookings-list'), null, visitorRanking(DUMMY_GAME_XP));
	wireFolderTabs();
	app.querySelectorAll('[data-action="login"]').forEach(btn => btn.addEventListener("click", () => { location.href = "login.html"; }));
}

// PROGRESS IS THE DEFAULT PANE FOR PLAYERS AND VISITORS ALIKE (A VISITOR SEES THE DUMMY FIRST GAME UNDER THEIR TEASER)
const FOLDER_TABS_HTML = `
	<div class="folder-tabs">
		<button class="folder-tab active" data-pane="progress" aria-label="${MSG_VIEW_PROGRESS}"><img src="images/icon_medal.svg" alt=""><span>Progresso</span></button>
		<button class="folder-tab" data-pane="ranking" aria-label="${MSG_VIEW_RANKING}"><img src="images/icon_ranking.svg" alt=""><span>Ranking</span></button>
		<button class="folder-tab" data-pane="history" aria-label="${MSG_HISTORY_TITLE}"><img src="images/icon_history.svg" alt=""><span>Histórico</span></button>
		<button class="folder-tab" data-pane="passes" aria-label="${MSG_VIEW_PASSES}"><img src="images/icon_id.svg" alt=""><span>Passes</span></button>
		<button class="folder-tab" data-pane="info" aria-label="${MSG_VIEW_INFO}"><img src="images/icon_gear.svg" alt=""><span>Dados</span></button>
	</div>
`;

// PANES ARE RENDERED ONCE AND ONLY HIDDEN, SO SWITCHING NEITHER LOSES UNSAVED EDITS NOR REFETCHES ANY LIST
function wireFolderTabs() {
	const toggleBtns = app.querySelectorAll(".folder-tab");
	toggleBtns.forEach(btn => btn.addEventListener("click", () => {
		toggleBtns.forEach(b => b.classList.toggle("active", b === btn));
		app.querySelectorAll("[data-pane-body]").forEach(pane => { pane.hidden = pane.dataset.paneBody !== btn.dataset.pane; });
	}));
}

// PERSONAL INFO FIELDS SHOWN AND EDITED ON THE PROFILE; ONLY name IS REQUIRED
const PROFILE_FIELDS = [
	{ field: "name", label: "Nome", type: "text", autocomplete: "name" },
	{ field: "phone", label: "Telefone", type: "tel", autocomplete: "tel" },
	{ field: "nif", label: "NIF", type: "number", autocomplete: "off" },
];

// RENDERS THE PLAYER PROFILE: A TOGGLE BETWEEN FOUR PANES — PAST GAMES, PROGRESS, PASSES, AND INFO
// (GREETING, EMAIL READ-ONLY SINCE IT'S THE LOGIN, EDITABLE FIELDS + LOGOUT)
function showProfile(user, profile) {
	document.body.classList.remove("onboarding");
	app.innerHTML = `
		${FOLDER_TABS_HTML}
		<div data-pane-body="info" hidden>
			<p class="profile-name margin-top-20"></p>
			<p class="profile-email"></p>
			<div class="profile-form">
				${PROFILE_FIELDS.map(f => `
					<div>
						<p class="court-rules-label">${f.label}</p>
						<input class="form-input" type="${f.type}" autocomplete="${f.autocomplete}" data-field="${f.field}">
					</div>
				`).join("")}
				<div class="divider"></div>
				<div>
					<p class="court-rules-label">Ranking</p>
					<!-- fit-content: A FLEX ROW WOULD OTHERWISE STRETCH THE PILL ACROSS THE FORM -->
					<div class="view-toggle margin-bottom-10" id="ranking-toggle" style="width: fit-content">
						<button class="view-toggle-btn" data-hidden="false">Participar</button>
						<button class="view-toggle-btn" data-hidden="true">Recusar</button>
					</div>
					<p class="card-sub" style="font-size: .7em">${MSG_RANKING_VISIBILITY}</p>
				</div>
				<div class="divider"></div>
				<p class="card-sub" id="profile-feedback" hidden></p>
				<p class="card-sub" style="font-size: .7em">${MSG_DATA_DISCLAIMER}</p>
				<button id="save-profile-btn" disabled><img src="images/icon_save.svg" class="link-icon" alt="">Guardar alterações</button>
				<button id="logout-btn" class="button-shallow">Terminar sessão</button>
			</div>
		</div>
		<div data-pane-body="history" hidden>
			<div class="bookings-list margin-top-20"></div>
		</div>
		<div data-pane-body="progress">
			<div class="bookings-list margin-top-20"></div>
		</div>
		<div data-pane-body="ranking" hidden>
			<div class="bookings-list margin-top-20"></div>
		</div>
		<div data-pane-body="passes" hidden>
			<div class="bookings-list margin-top-20"></div>
		</div>
	`;

	const games = fetchHistory(user);
	loadHistory(app.querySelector('[data-pane-body="history"] .bookings-list'), games);
	loadProgress(app.querySelector('[data-pane-body="progress"] .bookings-list'), games, undefined, fetchXp());
	loadRanking(app.querySelector('[data-pane-body="ranking"] .bookings-list'), user);
	loadPasses(app.querySelector('[data-pane-body="passes"] .bookings-list'), user, fetchPasses(user));

	wireFolderTabs();

	// VALUES GO IN THROUGH THE DOM, NOT THE TEMPLATE, SO A QUOTE OR < IN A NAME CAN'T BREAK THE MARKUP
	const greeting = app.querySelector(".profile-name");
	greeting.textContent = MSG_HELLO(profile.name);
	app.querySelector(".profile-email").textContent = user.email;
	const inputs = [...app.querySelectorAll("[data-field]")];
	inputs.forEach(input => { input.value = profile[input.dataset.field] ?? ""; });

	const saveBtn = document.getElementById("save-profile-btn");
	const feedback = document.getElementById("profile-feedback");
	let saved = { ...profile };

	// THE COURT LIST'S LIST/MAP TOGGLE, WITH WORDS INSTEAD OF ICONS
	const rankingBtns = [...app.querySelectorAll("#ranking-toggle .view-toggle-btn")];
	let rankingHidden = profile.hide_from_ranking;
	const drawRankingToggle = () => {
		rankingBtns.forEach(btn => btn.classList.toggle("active", (btn.dataset.hidden === "true") === rankingHidden));
	};
	drawRankingToggle();

	// ENABLED ONLY WHEN SOMETHING DIFFERS FROM WHAT'S SAVED AND THE NAME ISN'T EMPTY
	const refreshSave = () => {
		const changed = inputs.some(i => i.value.trim() !== (saved[i.dataset.field] ?? "")) || rankingHidden !== saved.hide_from_ranking;
		const nameOk = inputs.find(i => i.dataset.field === "name").value.trim().length > 0;
		saveBtn.disabled = !(changed && nameOk);
		feedback.hidden = true;
	};
	inputs.forEach(i => i.addEventListener("input", refreshSave));
	rankingBtns.forEach(btn => btn.addEventListener("click", () => {
		rankingHidden = btn.dataset.hidden === "true";
		drawRankingToggle();
		refreshSave();
	}));

	saveBtn.addEventListener("click", async () => {
		saveBtn.disabled = true;
		// EMPTY OPTIONAL FIELDS ARE STORED AS null, MATCHING ONBOARDING WHICH SKIPS THEM
		const updates = { ...Object.fromEntries(inputs.map(i => [i.dataset.field, i.value.trim() || null])), hide_from_ranking: rankingHidden };
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
function showLinkFailed() {
	setPigAppearance(app, MSG_LINK_FAILED);
	app.insertAdjacentHTML("beforeend", `<button id="new-link-btn" class="margin-top-20"><img src="images/icon_login.svg" class="link-icon" alt="">Pedir novo link</button>`);
	document.getElementById("new-link-btn").addEventListener("click", () => { location.href = "login.html"; });
}

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
		// A MAGIC LINK THAT FAILED (EXPIRED, ALREADY USED — EMAIL APPS THAT PREVIEW LINKS CAN USE THEM UP) ARRIVES WITH AN
		// error INSTEAD OF A TOKEN. SAY SO RATHER THAN QUIETLY SHOWING THE VISITOR PROFILE, WHICH READS AS "LOGIN IS BROKEN"
		if (/[#&?]error=/.test(location.hash + location.search)) {
			showLinkFailed();
			return;
		}
		// INITIAL_SESSION WITH NO SESSION AND NO MAGIC LINK TOKEN → A VISITOR
		showVisitor();
	}
});
