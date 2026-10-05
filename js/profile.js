const app = document.getElementById("app");

const MSG_HELLO = name => `Olá, ${name}`;
const MSG_SAVE_ERROR = "Não foi possível guardar. Tenta outra vez.";
const MSG_SAVED = "Alterações guardadas.";
// SHOWN BOTH DURING ONBOARDING AND ON THE PROFILE, NEXT TO WHERE THE DATA IS ENTERED
const MSG_RANKING_VISIBILITY = "No ranking só aparece a inicial do teu nome com o apelido (ex.: R. Barbosa) e os teus pontos — nunca onde nem quando jogas.";
const MSG_DATA_DISCLAIMER = "O login só é necessário caso queiras reservar um campo. <br><br>Estas informações são relevantes para o administrador do campo quando pedes um passe. Por este motivo o Campo Livre irá guardar os teus dados, embora não tenha interesse neles.";

const MSG_HISTORY_TITLE = "Teus jogos passados";
const MSG_VIEW_INFO = "Dados pessoais";
const MSG_HISTORY_EMPTY = "Teu histórico de jogos ficará guardado aqui.";
// "FAZ LOGIN" IN THE VISITOR COPY IS A LINK TO login.html, SO THE ASK IS ONE TAP AWAY WHEREVER IT'S READ
const MSG_LOGIN_LINK = `<a href="login.html">Faz login</a>`;
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

// "ATIVIDADE", NEVER "SAÚDE" — SEE "ACTIVITY, NEVER HEALTH" IN CLAUDE.md
const MSG_VIEW_PROGRESS = "Progresso";
const MSG_PROGRESS_EMPTY = "O teu progresso aparece aqui depois do primeiro jogo.";
const MSG_STAT_STREAK = n => `${n} ${n === 1 ? "semana" : "semanas seguidas"}`;
// "NENHUMA" FOR ZERO: SPACE GROTESK'S ROUND 0 READ AS AN "o" ("o jogos"), AND IT HAS NO SLASHED ZERO
const MSG_STAT_GAMES_VALUE = n => n === 0 ? "Nenhuma partida" : `${n} ${n === 1 ? "partida" : "partidas"}`;
const MSG_STAT_GAMES_HINT = "Nos últimos 6 meses";
const MSG_XP_LEVEL = n => `Nível ${n}`;
// TITLES ARE RANKS THAT GROW WITH THE NUMBER — A FIXED TOP TITLE WOULD READ AS MOCKERY OVER ONE GAME.
// EVERY LEVEL SPANS THE SAME step (GAMES IN THE LAST 6 MONTHS / WEEKS IN A ROW), SO THE BAR SPLITS INTO EQUAL SEGMENTS.
// LEVEL i STARTS AT i × step; THE BAR IS FULL AT titles.length × step
const levelScale = (step, titles) => ({
	max: titles.length * step,
	levels: titles.map((title, i) => ({ from: i * step, title })),
});
const LEVELS_GAMES = levelScale(5, ["Raquete de gaveta", "Voltou da reforma", "Cliente da casa", "24 sobre 7"]);
const LEVELS_STREAK = levelScale(2, ["Só quer postar", "Comprometido", "Joga até na chuva", "Força da natureza"]);
const LEVELS_TERRITORY = levelScale(1, ["Gato de apartamento", "Turista", "Presidente da junta", "Sem morada fixa"]);
const MSG_TITLE_TERRITORY = "Território";
const LEVELS_TARIMBA = levelScale(10, ["Ainda com etiqueta", "Já tem calos", "Mobília do clube", "Património do ténis"]);
const MSG_STAT_HOURS = n => `${n} ${n === 1 ? "hora" : "horas"}`;
const MSG_STAT_HOURS_HINT = "Em campo, desde a primeira partida";
const MSG_STAT_STREAK_HINT = "Com pelo menos uma partida";
const MSG_STAT_COURTS = n => `${n} ${n === 1 ? "campo" : "campos diferentes"}`;
const MSG_STAT_COURTS_HINT = n => `Já ${n === 1 ? "recebeu" : "receberam"} as tuas partidas`;
// THE RANKING MEASURES WHO PLAYS THE MOST, NOT WHO PLAYS THE BEST. THE PIG TEASES, NEVER SHAMES
const MSG_VIEW_RANKING = "Ranking";
const MSG_SEASON = name => `Época de ${name}`;
const MSG_SEASONS = "Há duas épocas por ano: Época de Verão: de 01/04 a 30/09. Época de Inverno: de 01/10 a 31/03";
const MSG_RANKING_FIRST = "A vista do topo é qualquer coisa. Aproveita.";
const MSG_RANKING_TIED = name => `Estás empatado com ${name}. Desempata em campo.`;
// "N JOGOS" AT 500 XP EACH, THE LEAST A GAME EARNS — A NEW COURT OR A STREAK WEEK CAN MAKE IT FEWER
const MSG_RANKING_CHASE = (games, name) => `${games === 1 ? "1 jogito" : `${games} jogitos`} e deixas ${name} para trás.`;
// AFTER THE BOARD UPDATES, BEFORE THE USUAL LINE: WHAT THE PLAYER GAINED SINCE THEY LAST LOOKED, AND WHO THEY PASSED
const MSG_RANKING_GAINED = xp => `Ganhaste ${MSG_XP(xp)} desde a última vez.`;
const MSG_RANKING_OVERTAKE = (xp, name) => `Máquina! Ganhaste ${MSG_XP(xp)} e agora vês ${name} pelo retrovisor.`;
const MSG_RANKING_DROPPED = "Tragédia anunciada: caíste de posição. Não deixes ficar barato.";
const MSG_RANKING_ZERO = "Nenhum jogo na época? Tás a gozar.";
// "BORA PARTICIPAR" OPENS DADOS (data-pane-link), WHERE THE PARTICIPAR / RECUSAR TOGGLE IS
const MSG_RANKING_OUT = `Não te deixes intimidar, somos todos amadores. <a href="#" data-pane-link="info">Bora participar</a>.`;
// "DADOS" OPENS THAT TAB (data-pane-link), WHERE THE PARTICIPAR / RECUSAR TOGGLE IS
const MSG_RANKING_ABOUT = `O ranking junta todos os jogadores do Campo Livre. Se preferires ficar de fora, podes sair em <a href="#" data-pane-link="info">Dados</a>.`;
const MSG_POINTS_INFO = "Entende o ranking";
// DISPLAY ONLY — THE RULES THEMSELVES LIVE IN games_xp / season_ranking (supabase/sql), SO KEEP THESE IN STEP WITH THEM
const POINTS_RULES = [
	["Cada partida", 500],
	["Primeira partida num campo novo", 500],
	["Semana com partida, a seguir a outra", 500],
	["Passe aprovado", XP_PER_PASS],
];
const MSG_POINTS_NOTE = "Partidas de 10 minutos ou menos não contam. Os pontos voltam a zero no início de cada época; o teu XP de progresso geral nunca desce.";
const MSG_VISITOR_RANKING = `Os jogadores mais ativos de cada época aparecem aqui. ${MSG_LOGIN_LINK} para entrares na corrida.`;
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

// MONDAY 00:00 OF THE WEEK date FALLS IN, AS A TIMESTAMP — THE KEY FOR THE WEEKLY STREAK
function weekStart(date) {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
	return d.getTime();
}

// WEEKS IN A ROW WITH AT LEAST ONE GAME, ENDING NOW. WEEKLY, NOT DAILY: DAILY STREAKS WOULD PUNISH NORMAL TENNIS
// RHYTHMS. A CURRENT WEEK WITH NO GAME YET DOESN'T BREAK IT — THE PLAYER STILL HAS UNTIL SUNDAY
function weeklyStreak(games) {
	const weeks = new Set(games.map(game => weekStart(game.start)));
	const cursor = new Date(weekStart(new Date()));
	if (!weeks.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 7);
	let streak = 0;
	while (weeks.has(cursor.getTime())) {
		streak++;
		cursor.setDate(cursor.getDate() - 7);
	}
	return streak;
}

// LONGEST RUN OF WEEKS IN A ROW EVER, NOT JUST THE CURRENT ONE — A DIAMOND ONCE EARNED IS KEPT
function longestStreak(games) {
	const weeks = new Set(games.map(game => weekStart(game.start)));
	let longest = 0;
	for (const week of weeks) {
		const cursor = new Date(week);
		cursor.setDate(cursor.getDate() - 7);
		if (weeks.has(cursor.getTime())) continue;
		let run = 0;
		cursor.setTime(week);
		while (weeks.has(cursor.getTime())) {
			run++;
			cursor.setDate(cursor.getDate() + 7);
		}
		longest = Math.max(longest, run);
	}
	return longest;
}

// MOST GAMES EVER INSIDE ONE 6-MONTH WINDOW. THE COUNT ONLY PEAKS RIGHT AFTER A GAME, SO WINDOWS ENDING AT EACH GAME ARE ENOUGH
function peakRecentGames(games) {
	return Math.max(0, ...games.map(game => {
		const end = new Date(game.start);
		const start = new Date(end);
		start.setMonth(start.getMonth() - 6);
		return games.filter(other => new Date(other.start) >= start && new Date(other.start) <= end).length;
	}));
}

const DIAMOND_ICON = `<img src="images/icon_diamond_color.svg" class="link-icon" alt="">`;

function levelIndex(scale, value) {
	return scale.levels.findLastIndex(level => value >= level.from);
}

function levelTitle(scale, value) {
	return scale.levels[levelIndex(scale, value)].title;
}

// INLINE, NOT AN <img>: CSS CAN'T REACH INTO AN <img> SVG, AND THE FIRST PATH'S FILL IS WHAT TURNS YELLOW ON ACHIEVEMENT
const STAR_SVG = achieved => `<svg class="level-star${achieved ? " achieved" : ""}" viewBox="0 0 22 21" aria-hidden="true"><path d="M10.7459 0C11.0974 0 11.4216 0.199219 11.5818 0.511719L14.4529 6.14453L20.699 7.13672C21.0466 7.19141 21.3357 7.4375 21.4451 7.77344C21.5545 8.10938 21.4646 8.47656 21.2185 8.72656L16.7459 13.1992L17.7341 19.4453C17.7888 19.793 17.6443 20.1445 17.3591 20.3516C17.074 20.5586 16.6951 20.5898 16.3826 20.4297L10.7459 17.5625L5.10915 20.4297C4.79665 20.5898 4.41774 20.5586 4.13258 20.3516C3.84743 20.1445 3.7029 19.7969 3.75758 19.4453L4.74196 13.1992L0.27321 8.72656C0.0232101 8.47656 -0.0627274 8.10938 0.0466476 7.77344C0.156023 7.4375 0.441179 7.19141 0.792741 7.13672L7.03883 6.14453L9.91383 0.511719C10.074 0.199219 10.3982 0 10.7498 0H10.7459Z"/><path d="M10.7459 0C11.0974 0 11.4216 0.199219 11.5818 0.511719L14.4529 6.14453L20.699 7.13672C21.0466 7.19141 21.3357 7.4375 21.4451 7.77344C21.5545 8.10938 21.4646 8.47656 21.2185 8.72656L16.7459 13.1992L17.7341 19.4453C17.7888 19.793 17.6443 20.1445 17.3591 20.3516C17.074 20.5586 16.6951 20.5898 16.3826 20.4297L10.7459 17.5625L5.10915 20.4297C4.79665 20.5898 4.41774 20.5586 4.13259 20.3516C3.84743 20.1445 3.7029 19.7969 3.75758 19.4453L4.74196 13.1992L0.27321 8.72656C0.0232101 8.47656 -0.0627274 8.10938 0.0466476 7.77344C0.156023 7.4375 0.441179 7.19141 0.792741 7.13672L7.03884 6.14453L9.91383 0.511719C10.074 0.199219 10.3982 0 10.7498 0H10.7459ZM10.7459 3L8.48805 7.42188C8.35134 7.6875 8.09743 7.875 7.80055 7.92188L2.89821 8.70313L6.40602 12.2148C6.61696 12.4258 6.71462 12.7266 6.66774 13.0234L5.8943 17.9258L10.3201 15.6758C10.5857 15.5391 10.9021 15.5391 11.1716 15.6758L15.5974 17.9258L14.824 13.0234C14.7771 12.7266 14.8748 12.4258 15.0857 12.2148L18.5935 8.70313L13.6912 7.92188C13.3943 7.875 13.1404 7.6875 13.0037 7.42188L10.7459 3Z"/></svg>`;

// ONE STAR PER LEVEL; THE CURRENT LEVEL AND EVERY ONE BELOW IT ARE FILLED, SO THE FIRST LEVEL ALREADY HAS ONE
function levelStars(scale, value) {
	const current = levelIndex(scale, value);
	return scale.levels.map((_, i) => STAR_SVG(i <= current)).join("");
}

// XP ITSELF IS COMPUTED IN THE DATABASE (games_xp, player_xp), NOT HERE — THE RANKING READS THE SAME FUNCTIONS
function sumXp(games) {
	return games.reduce((sum, game) => sum + game.xp, 0);
}

// LEVEL n NEEDS 1500 + 500n XP (2000, 2500 … 6500), SO EACH IS A BIT HARDER. REACHING AN END IS A LEVEL-UP: 0–1999 IS LEVEL 1, 2000–4499 LEVEL 2
const XP_LEVEL_ENDS = [];
for (let n = 1, total = 0; n <= 10; n++) XP_LEVEL_ENDS.push(total += 1500 + 500 * n);

// RELATIVE, UNLIKE THE SKILL BARS: THE FILL ONLY COVERS THE CURRENT LEVEL. PAST THE LAST LEVEL IT STAYS FULL
// CHARACTER ART PER XP LEVEL (INDEX 0 = LEVEL 1), GETTING MORE "PRO" AS THE PLAYER LEVELS UP.
// PLACEHOLDERS FOR NOW — ONE ENTRY PER LEVEL SO EACH CAN GET ITS OWN IMAGE LATER WITHOUT TOUCHING THE LOGIC
const XP_LEVEL_IMAGES = [
	"pig_reaching", "pig_reaching", "pig_reaching",
	"pig_sitting", "pig_sitting", "pig_sitting",
	"pig_serving", "pig_serving", "pig_serving", "pig_serving",
];

// CHARACTER NAME + FLAVOUR TEXT PER XP LEVEL (INDEX 0 = LEVEL 1). ONLY ONE FOR TESTING — UNTIL EVERY LEVEL HAS ITS OWN,
// A MISSING ENTRY FALLS BACK TO THE FIRST
const XP_LEVEL_INFO = [
	{ title: "Apanha-bolas", description: "Passa mais tempo a apanhar bolas do que a batê-las. Chega a casa com dores nas costas de tanto que se dobra." },
];

// THE VISITOR'S DUMMY CARD GETS ITS OWN CHARACTER, SO IT NEVER PASSES FOR A REAL LEVEL-1 PLAYER'S
const XP_VISITOR_INFO = { title: "Raquete emprestada", description: "Aparece para jogar com a raquete do primo e sapatilhas da Vans. Ainda tá a descobrir se é destro ou canhoto." };

// THE TRADING CARD (THINK MAGIC / POKÉMON): LEVEL IN THE BANNER, PLAYER ART, CHARACTER NAME AND FLAVOUR TEXT,
// THE FOUR SKILL RATINGS, THEN THE XP BAR. A teaser MAKES IT THE VISITOR'S LOCKED PREVIEW: ITS OWN CHARACTER, THE FILL
// GROWING IN (.locked), AND THE TEASER UNDER THE BAR
function xpCard(xp, diamonds, skills, teaser) {
	const found = XP_LEVEL_ENDS.findIndex(end => xp < end);
	const index = found === -1 ? XP_LEVEL_ENDS.length - 1 : found;
	const from = index ? XP_LEVEL_ENDS[index - 1] : 0;
	const to = XP_LEVEL_ENDS[index];
	const fill = Math.min((xp - from) / (to - from), 1) * 100;
	const info = teaser ? XP_VISITOR_INFO : XP_LEVEL_INFO[index] ?? XP_LEVEL_INFO[0];
	return `
		<div class="trading-card${teaser ? " locked" : ""}">
			<p class="trading-card-level">${MSG_XP_LEVEL(index + 1)}<span>${DIAMOND_ICON} ${diamonds}</span></p>
			<div class="trading-card-art">
				<div class="trading-card-frame"></div>
				<img src="images/${XP_LEVEL_IMAGES[index]}.svg" alt="">
			</div>
			<p class="trading-card-name">${info.title}</p>
			<p class="trading-card-text">${info.description}</p>
			<div class="trading-card-skills">${skills.map(skill => `
				<div class="trading-card-skill">
					${skill.rating}
					<img src="images/icon_${skill.icon}.svg" class="link-icon" alt="">
				</div>
			`).join("")}</div>
			${barHtml(fill, `<span>${MSG_XP(xp)}</span>`, "xp-bar")}
			${teaser ? `<p class="trading-card-text">${teaser}</p>` : ""}
		</div>
	`;
}

// THE LABELS ARE RENDERED TWICE: BLACK ON THE TRACK, AND A WHITE COPY ON TOP CLIPPED TO THE FILL'S WIDTH
function barHtml(fill, labels, modifier = "") {
	return `<div class="level-bar ${modifier}" style="--fill: ${fill}%"><div></div><p>${labels}</p><p>${labels}</p></div>`;
}

// THE SKILL AS A SHARE OF ITS BAR, 0–100, SO THE TRADING CARD'S FOUR NUMBERS SHARE ONE SCALE (THINK FIFA CARD RATINGS).
// 100 IS A FULL BAR, THE SAME MOMENT THE DIAMOND IS EARNED
function skillRating(scale, value) {
	return Math.min(value / scale.max, 1) * 100;
}

// FILL FROM 0 TO max OVER ONE EQUAL SEGMENT PER LEVEL, EACH LABELLED WITH ITS TITLE
function levelBar(scale, value) {
	return barHtml(skillRating(scale, value),scale.levels.map(level => `<span>${level.title}</span>`).join(""));
}

// PROGRESS FROM THE SAME GAMES AS THE HISTORY (ALREADY WITHOUT THE ≤10 MIN ONES). DECLARED TIME ON COURT,
// NOT TIME PLAYED: A WALK-IN LASTS WHAT THE PLAYER CHOSE UNLESS ENDED EARLY, AND A BOOKING DOESN'T PROVE A SHOW-UP
// A teaser MAKES THIS THE VISITOR'S LOCKED PREVIEW: IT PINS THE TRADING CARD'S RATINGS AT 1 AND THE SKILL CARDS' NUMBERS AT 0 —
// AN EMPTY STARTING POINT RATHER THAN THE DUMMY FIRST GAME'S REAL VALUES. THE LEVELS, BARS AND XP STILL COME FROM THAT GAME
// xpPromise IS THE TRADING CARD'S TOTAL: THE GAMES' XP PLUS +3000 PER PASS EVER AWARDED, AS player_xp COUNTS IT
async function loadProgress(container, gamesPromise, teaserPromise, xpPromise) {
	const games = await gamesPromise;
	const teaser = await teaserPromise;
	const xp = await xpPromise;
	if (!games.length) {
		setPigAppearance(container, MSG_PROGRESS_EMPTY, "pig_reaching");
		return;
	}

	// GAMES, NOT MINUTES: A COUNT IS MORE TANGIBLE AND DOESN'T DEPEND ON THE WALK-IN DURATION THE PLAYER DECLARED.
	// ROLLING 6 MONTHS, NOT A CALENDAR PERIOD, SO THE TOTAL NEVER RESETS TO ZERO ON A FIXED DATE AND DROPS THE PLAYER A LEVEL
	const now = new Date();
	const recentStart = new Date(now);
	recentStart.setMonth(recentStart.getMonth() - 6);
	const gamesRecent = games.filter(game => new Date(game.start) >= recentStart && new Date(game.start) < now).length;

	const streak = weeklyStreak(games);

	// ONE COURT IS ALREADY LEVEL 1, SO THE LEVEL IS courts - 1; THE BAR USES courts ITSELF SO EACH REACHED LEVEL'S SEGMENT IS FULL
	const courts = new Set(games.map(game => game.courtId)).size;

	// LIFETIME, LIKE XP, SO IT NEVER DROPS. FILLS THE GAP MOMENTUM LEAVES: A 2h MATCH WEIGHS FOUR TIMES A 30 MIN HIT
	const hours = Math.floor(games.filter(game => new Date(game.start) < now).reduce((sum, game) => sum + game.mins, 0) / 60);

	// A DIAMOND PER SKILL WHOSE BAR WAS EVER FULL, KEPT FOREVER — SO THE ROLLING SKILLS CHECK THEIR BEST VALUE, NOT THE CURRENT ONE
	const past = games.filter(game => new Date(game.start) < now);
	const diamonds = {
		games: peakRecentGames(past) >= LEVELS_GAMES.max,
		hours: hours >= LEVELS_TARIMBA.max,
		streak: longestStreak(past) >= LEVELS_STREAK.max,
		courts: courts >= LEVELS_TERRITORY.max,
	};

	const statCard = (icon, metric, title, value, detail, bar, diamond) => `
		<div class="ticket">
			<p class="skill-title"><img src="images/icon_${icon}.svg" class="link-icon" alt="">${metric}</p>
			<p class="ticket-title margin-top-5" style="white-space: normal">${value}${diamond ? ` ${DIAMOND_ICON}` : ""}</p>
			<div class="ticket-date">${detail}</div>
			<p class="stat-level">${title}</p>
			${bar}
		</div>
	`;
	const rating = (scale, value) => teaser ? 1 : Math.round(skillRating(scale, value));
	const shown = value => teaser ? 0 : value;
	container.innerHTML = [
		xpCard(xp, Object.values(diamonds).filter(Boolean).length, [
			{ icon: "fire_color", rating: rating(LEVELS_GAMES, gamesRecent) },
			{ icon: "sheriff_color", rating: rating(LEVELS_TARIMBA, hours) },
			{ icon: "repeat_color", rating: rating(LEVELS_STREAK, streak) },
			{ icon: "globe_color", rating: rating(LEVELS_TERRITORY, courts) },
		], teaser),
		statCard("fire_color", "Momentum", levelTitle(LEVELS_GAMES, gamesRecent) + levelStars(LEVELS_GAMES, gamesRecent), MSG_STAT_GAMES_VALUE(shown(gamesRecent)), MSG_STAT_GAMES_HINT, levelBar(LEVELS_GAMES, gamesRecent), diamonds.games),
		statCard("sheriff_color", "Tarimba", levelTitle(LEVELS_TARIMBA, hours) + levelStars(LEVELS_TARIMBA, hours), MSG_STAT_HOURS(shown(hours)), MSG_STAT_HOURS_HINT, levelBar(LEVELS_TARIMBA, hours), diamonds.hours),
		statCard("repeat_color", "Consistência", levelTitle(LEVELS_STREAK, streak) + levelStars(LEVELS_STREAK, streak), MSG_STAT_STREAK(shown(streak)), MSG_STAT_STREAK_HINT, levelBar(LEVELS_STREAK, streak), diamonds.streak),
		statCard("globe_color", MSG_TITLE_TERRITORY, levelTitle(LEVELS_TERRITORY, courts - 1) + levelStars(LEVELS_TERRITORY, courts - 1), MSG_STAT_COURTS(shown(courts)), MSG_STAT_COURTS_HINT(shown(courts)), levelBar(LEVELS_TERRITORY, courts), diamonds.courts),
	].join("");
}


// THE PLAYER'S WHOLE XP, PASSES INCLUDED (FROM pass_awards, SO REVOKING NEVER LOWERS IT)
async function fetchXp() {
	const { data } = await db.rpc("my_xp");
	return data ?? 0;
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


// THE CURRENT SEASON'S NAME, FOR DISPLAY ONLY — THE REAL BOUNDARIES ARE season_start IN supabase/sql/ranking.sql:
// VERÃO APR–SEP, INVERNO OCT–MAR
// startDate IS season_start'S DATE, THE KEY FOR ranking_views
function currentSeason() {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth() + 1;
	if (month >= 4 && month <= 9) return { name: "Verão", startDate: `${year}-04-01` };
	return { name: "Inverno", startDate: `${month >= 10 ? year : year - 1}-10-01` };
}

// DEBUG: REPLAYS AN UPDATE WITH FAKE NUMBERS, ON DEMAND — ADD ?board=overtake OR ?board=gain TO profile.html. NOTHING IS SAVED.
// THE PLAYER IS PUT 3rd (OR LAST, WITH FEWER PLAYERS) WITH 5650 XP UNDER A 5890; overtake TAKES THEM TO 6000, PASSING IT, AND
// gain TO 5800, STAYING PUT
function debugBoards(rows, kind) {
	const FAKE_XP = [9200, 5890, 5650, 4100, 3550, 2000, 1500, 1000];
	const mine = rows.find(row => row.is_me);
	if (!mine) return { before: rows, after: rows };
	const board = rows.filter(row => !row.is_me);
	board.splice(Math.min(2, board.length), 0, mine);
	const before = board.map((row, i) => ({ ...row, place: i + 1, points: FAKE_XP[i] ?? 500 }));
	const after = before.map(row => ({ ...row }));
	const i = before.indexOf(before.find(row => row.is_me));
	if (i === 0) return { before, after };
	if (kind === "overtake") {
		after[i - 1] = { ...before[i], place: before[i - 1].place, points: 6000 };
		after[i] = { ...before[i - 1], place: before[i].place };
	} else {
		after[i].points = 5800;
	}
	return { before, after };
}

// A PLAQUE IS SWAPPED BY TWO CSS ANIMATIONS CHAINED IN JS (plaque-out, THEN plaque-in), BECAUSE ONE KEYFRAME CAN'T CHANGE THE
// TEXT HALFWAY. UNDER REDUCED MOTION THE CSS TURNS THEM OFF, SO animationend WOULD NEVER FIRE — CALLERS SKIP THE MOTION THERE
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function playPlaque(plaque, name) {
	return new Promise(resolve => {
		plaque.classList.remove("plaque-out", "plaque-in");
		plaque.classList.add(name);
		plaque.addEventListener("animationend", resolve, { once: true });
	});
}

// ONE PLAQUE PULLED OUT, RELABELLED WHILE ITS SLOT IS EMPTY, AND SLID BACK IN
async function replacePlaque(plaque, text) {
	await playPlaque(plaque, "plaque-out");
	await wait(300);
	plaque.textContent = text;
	await playPlaque(plaque, "plaque-in");
}

// THE XP DIGITS A ROW MUST CHANGE TO SHOW target, LEFT TO RIGHT: ONLY THOSE THAT DIFFER. THE PLACE DIGITS BELONG TO THE ROW
// (ROW 2 ALWAYS SAYS 2), SO THEY NEVER CHANGE
function digitChanges(row, target) {
	const plaques = [...row.xp.querySelectorAll(".plaque")];
	const chars = [...String(target.points).padStart(plaques.length, " ")].map(c => c.trim());
	return plaques.map((plaque, i) => [plaque, chars[i]]).filter(([plaque, char]) => plaque.textContent !== char);
}

// THE WHITE .me PLAQUES FOLLOW THE PLAYER'S NAME: THE WHOLE ROW THAT HOLDS IT IS WHITE
function setMine(row, mine) {
	[row.name, row.place, row.xp].forEach(el => el.classList.toggle("me", mine));
}

// ONE PAIR OF HANDS REARRANGING THE BOARD, EACH MOVE 1s AFTER THE LAST. NAMES FIRST, AS A SWAP: THE PLAYER'S PLAQUE IS PULLED
// OUT FIRST, THEN THE OTHERS; WITH ALL THEIR SLOTS EMPTY THEY'RE EXCHANGED, AND THE PLAYER'S GOES BACK IN FIRST (INTO ITS NEW
// ROW), THEN THE OTHERS. ONLY THEN THE NUMBERS: EVERY ROW STARTS AT ONCE, EACH WORKING LEFT TO RIGHT. A NAME MOVED BEFORE ITS
// NUMBER MEANS EACH ROW'S DIGITS CHANGE ONCE, STRAIGHT TO THEIR FINAL VALUE
async function updateRows(updates) {
	const named = updates.filter(([row, target]) => row.name.textContent !== target.name);
	const digits = updates.map(([row, target]) => digitChanges(row, target));
	const relabel = () => named.forEach(([row, target]) => { row.name.textContent = target.name; setMine(row, target.is_me); });
	if (reducedMotion()) {
		relabel();
		digits.flat().forEach(([plaque, char]) => { plaque.textContent = char; });
		return;
	}
	const mineFirst = isMine => (a, b) => isMine(b) - isMine(a);
	const pullOrder = [...named].sort(mineFirst(([row]) => row.name.classList.contains("me")));
	const pushOrder = [...named].sort(mineFirst(([, target]) => target.is_me));
	const oneByOne = (list, act) => Promise.all(list.map((item, n) => wait(n * 1000).then(() => act(item))));

	await oneByOne(pullOrder, ([row]) => playPlaque(row.name, "plaque-out"));
	await wait(300);
	relabel();
	await oneByOne(pushOrder, ([row]) => playPlaque(row.name, "plaque-in"));
	await wait(1000);
	await Promise.all(digits.map(row => oneByOne(row, ([plaque, char]) => replacePlaque(plaque, char))));
}

// WHERE THE PLAYER STANDS ON A GIVEN BOARD (BEFORE OR AFTER AN UPDATE), IN THE PIG'S VOICE
function rankingLine(list) {
	const meIndex = list.findIndex(row => row.is_me);
	const me = list[meIndex];
	if (!me) return MSG_RANKING_OUT;
	// EVERYONE WITHOUT POINTS SHARES A PLACE ON TARIMBA ALONE, SO "TIED" OR "1.º" WOULD MEAN NOTHING HERE
	if (!me.points) return MSG_RANKING_ZERO;
	const tiedWith = list.find(row => !row.is_me && row.place === me.place);
	if (tiedWith) return MSG_RANKING_TIED(tiedWith.name);
	// THE NEAREST PLAYER WITH MORE POINTS; A SAME-POINTS PLAYER AHEAD ON TARIMBA STILL NEEDS ONE MORE POINT, SO ONE GAME
	const above = list.slice(0, meIndex).reverse().find(row => row.place < me.place);
	if (!above) return MSG_RANKING_FIRST;
	return MSG_RANKING_CHASE(Math.ceil((above.points - me.points + 1) / 500), above.name);
}

// THE TOP THREE FOR THE ASPIRATION, THEN THE PLAYER WITH WHOEVER IS JUST ABOVE AND BELOW — NEVER THE WHOLE TABLE
async function loadRanking(container, user) {
	const season = currentSeason();
	const { data } = await db.rpc("season_ranking");
	const debug = new URLSearchParams(location.search).get("board");
	// before IS THE BOARD AS THE PLAYER LAST SAW IT THIS SEASON (ranking_views), after THE LIVE RANKING. NO SNAPSHOT YET (FIRST
	// LOOK THIS SEASON) MEANS NOTHING TO ANIMATE: THE BOARD JUST SHOWS
	let before, after;
	if (debug) {
		({ before, after } = debugBoards(data ?? [], debug));
	} else {
		const { data: seen } = await db.from("ranking_views").select("board").eq("season_start", season.startDate).maybeSingle();
		after = data ?? [];
		before = seen?.board ?? after;
	}
	// THE BOARD ONLY ANIMATES GOOD NEWS. A PLAYER WHO DROPPED A PLACE GETS THE NEW BOARD STRAIGHT AWAY, NO PLAQUES MOVING — AND
	// IT'S SAVED, SO THE DROP NEVER REPLAYS. COMPARED BY PLACE, NOT ROW, SO A TIE SHUFFLING THE ORDER DOESN'T COUNT AS A DROP
	const placeBefore = before.find(row => row.is_me)?.place;
	const placeAfter = after.find(row => row.is_me)?.place;
	const dropped = placeBefore && placeAfter > placeBefore;
	if (dropped) before = after;

	const meIndex = after.findIndex(row => row.is_me);
	const shown = new Set([0, 1, 2]);
	if (meIndex !== -1) [meIndex - 1, meIndex, meIndex + 1].forEach(i => shown.add(i));
	const indices = [...shown].filter(i => i >= 0 && i < after.length).sort((a, b) => a - b);

	// THE LAYOUT IS THE LIVE ONE: THE ROWS SHOWN NOW, EACH STARTING WITH WHAT THE PLAYER SAW IN THAT ROW LAST TIME (BLANK IF THE
	// BOARD WAS SHORTER THEN). THE PLACE DIGITS ARE ALWAYS THE LIVE ONES — THEY BELONG TO THE ROW AND NEVER ANIMATE
	const BLANK = { name: "", points: "", is_me: false };
	const start = i => before[i] ?? BLANK;

	// A GOLF-TOURNAMENT SIGN: EVERY DIGIT ON ITS OWN PLAQUE IN ITS OWN SLOT, PADDED WITH BLANK ONES (2 FOR THE PLACE, 4 FOR THE
	// XP — MORE IF ANY NUMBER, BEFORE OR AFTER, NEEDS THEM). ONE GRID FOR THE WHOLE BOARD, SO THE COLUMNS LINE UP
	const xpCount = Math.max(4, ...[...before, ...after].map(row => String(row.points).length));
	const digits = (value, count, me = false) => `<div class="scoreboard-digits${me ? " me" : ""}">${[...String(value).padStart(count, " ")]
		.map(c => `<span class="plaque-slot"><span class="plaque">${c.trim()}</span></span>`).join("")}</div>`;
	const board = document.createElement("div");
	board.className = "scoreboard";
	board.innerHTML = `
		<div class="scoreboard-face">
			<div class="scoreboard-head"><p>${MSG_SEASON(season.name)}</p></div>
			<div class="scoreboard-grid"><p>Pos</p><p>Jogador</p><p>XP</p></div>
		</div>
	`;
	const grid = board.querySelector(".scoreboard-grid");
	// EACH SHOWN ROW'S THREE PARTS (PLACE DIGITS, NAME PLAQUE, XP DIGITS), BY ITS INDEX IN after, SO A ROW CAN BE UPDATED LATER
	const rowEls = {};
	// A ROW OF EMPTY PLAQUES, LIKE THE BLANK LINES ON A REAL BOARD
	const blankRow = () => grid.insertAdjacentHTML("beforeend", `${digits("", 2)}<span class="plaque-slot"><span class="plaque"></span></span>${digits("", xpCount)}`);
	let rowCount = 0;
	indices.forEach((i, n) => {
		// A JUMP IN PLACES IS A BLANK ROW
		if (n && i - indices[n - 1] > 1) {
			blankRow();
			rowCount++;
		}
		rowCount++;
		const row = start(i);
		// THE NAME PLAQUE SITS IN A SLOT THAT CLIPS IT, SO IT CAN BE PULLED OUT FROM BEHIND
		grid.insertAdjacentHTML("beforeend", `${digits(after[i].place, 2, row.is_me)}<span class="plaque-slot"><span class="plaque name${row.is_me ? " me" : ""}"></span></span>${digits(row.points, xpCount, row.is_me)}`);
		const nameSlot = grid.lastElementChild.previousElementSibling;
		rowEls[i] = { place: nameSlot.previousElementSibling, name: nameSlot.firstElementChild, xp: grid.lastElementChild };
		// NAMES ARE TYPED BY PLAYERS, SO THEY GO IN THROUGH textContent, NEVER THROUGH THE TEMPLATE
		rowEls[i].name.textContent = row.name;
	});
	// THE BOARD NEVER LOOKS EMPTY: AT LEAST 10 ROWS, THE REST BLANK, SO EARLY IN A SEASON IT'S STILL A FULL SIGN WAITING FOR NAMES
	const MIN_ROWS = 10;
	for (; rowCount < MIN_ROWS; rowCount++) blankRow();
	// THE BOARD STANDS BETWEEN TWO POLES, EACH CAPPED WITH A SPHERE, LIKE A REAL TOURNAMENT SIGN. AFTER THE BOARD, SO THEY PAINT
	// IN FRONT OF ITS EDGES, AS IF HOLDING IT
	const sign = document.createElement("div");
	sign.className = "scoreboard-sign";
	sign.append(board);
	sign.insertAdjacentHTML("beforeend", `<span class="scoreboard-pole"></span><span class="scoreboard-pole"></span>`);
	container.replaceChildren(sign);

	const line = document.createElement("p");
	// ABOVE THE BOARD, LIKE EVERY OTHER PANE'S DESCRIPTION: 10px ABOVE IT AND 10px BETWEEN IT AND THE BOARD
	line.className = "card-sub margin-top-10";
	line.style.fontSize = ".7em";
	// THE LINE TELLS THE NEWS STRAIGHT AWAY, WITHOUT WAITING FOR THE PLAQUES: WHAT HAPPENED SINCE THE LAST LOOK, THEN WHERE THE
	// PLAYER STANDS NOW. A GAIN, AND WHO THEY PASSED IF THEY MOVED UP (TOLD APART BY ref); AFTER A DROP THE PIG TEASES — NEVER SHAMES
	const meBefore = before.findIndex(row => row.is_me);
	const gained = meIndex === -1 || meBefore === -1 ? 0 : after[meIndex].points - before[meBefore].points;
	const passed = after[meIndex + 1];
	const passedBefore = passed?.ref ? before.findIndex(row => row.ref === passed.ref) : -1;
	const overtook = meIndex !== -1 && passedBefore !== -1 && passedBefore < meBefore;
	const lead = dropped ? MSG_RANKING_DROPPED : gained > 0 ? (overtook ? MSG_RANKING_OVERTAKE(gained, passed.name) : MSG_RANKING_GAINED(gained)) : "";
	if (meIndex === -1) {
		// OPTED OUT: THE ONE LINE WITH A LINK, AND NO PLAYER NAMES IN IT, SO IT CAN GO IN AS HTML
		line.innerHTML = MSG_RANKING_OUT;
		line.querySelector("a").addEventListener("click", event => {
			event.preventDefault();
			app.querySelector('.folder-tab[data-pane="info"]').click();
		});
	} else {
		// NAMES ARE TYPED BY PLAYERS, SO EVERY OTHER LINE GOES IN AS TEXT
		line.textContent = (lead ? `${lead} ` : "") + rankingLine(after);
	}
	container.before(line);
	container.classList.replace("margin-top-20", "margin-top-10");

	// THE SNAPSHOT IS SAVED ONLY ONCE THE PLAYER HAS SEEN THE UPDATE, SO A BOARD NEVER OPENED STILL PLAYS NEXT TIME. ONLY WHAT
	// season_ranking ALREADY SHOWED THEM. NEVER IN DEBUG
	const save = () => {
		if (debug) return;
		const snapshot = after.map(({ place, name, points, is_me, ref }) => ({ place, name, points, is_me, ref }));
		// .then() BECAUSE A SUPABASE QUERY IS ONLY SENT WHEN AWAITED OR THEN-ED — NOTHING HERE WAITS ON IT
		db.from("ranking_views").upsert({ player_id: user.id, season_start: season.startDate, board: snapshot, seen_at: new Date().toISOString() }, { onConflict: "player_id,season_start" }).then(({ error }) => { if (error) console.error(error); });
	};
	const changed = indices.some(i => start(i).name !== after[i].name || start(i).points !== after[i].points);
	if (!changed) {
		if (before === after) save();
		return appendPointsInfo(container);
	}

	// THE UPDATE PLAYS THE FIRST TIME THE BOARD IS ACTUALLY SEEN (THE RANKING TAB OPENED), NOT WHEN IT'S RENDERED HIDDEN. EVERY
	// SHOWN ROW IS HANDED ITS FINAL CONTENT; ROWS THAT DON'T CHANGE HAVE NOTHING TO DO
	const observer = new IntersectionObserver(entries => {
		if (!entries[0].isIntersecting) return;
		observer.disconnect();
		wait(1000)
			.then(() => updateRows(indices.map(i => [rowEls[i], after[i]])))
			.then(save);
	});
	observer.observe(board);
	appendPointsInfo(container);
}

// WHAT EARNS POINTS, FOLDED AWAY UNTIL ASKED FOR: THE SAME COLLAPSIBLE CARD AS THE ADMIN'S COURT RULES (admin.js), STARTING
// CLOSED — THE TRIANGLE TURNED -90deg, AS admin.js TURNS IT WHEN A CARD IS FOLDED
function appendPointsInfo(container) {
	container.insertAdjacentHTML("beforeend", `
		<div class="court-rules-card">
			<div class="court-rules-toggle">
				<p class="court-rules-title"><img src="images/icon_info.svg" class="link-icon" alt="">${MSG_POINTS_INFO}</p>
				<img src="images/icon_triangle.svg" class="card-toggle-icon" alt="" style="transform: rotate(-90deg)">
			</div>
			<div class="court-rules-body" hidden>
				${POINTS_RULES.map(([label, xp]) => `<p class="ranking-row"><span>${label}</span><span>+${MSG_XP(xp)}</span></p>`).join("")}
				<p class="card-sub margin-top-10">${MSG_POINTS_NOTE}</p>
				<p class="card-sub margin-top-10">${MSG_SEASONS}</p>
				<p class="card-sub margin-top-10">${MSG_RANKING_ABOUT}</p>
			</div>
		</div>
	`);
	const card = container.lastElementChild;
	card.querySelector('[data-pane-link="info"]').addEventListener("click", event => {
		event.preventDefault();
		app.querySelector('.folder-tab[data-pane="info"]').click();
	});
	card.querySelector(".court-rules-toggle").addEventListener("click", () => {
		const body = card.querySelector(".court-rules-body");
		body.hidden = !body.hidden;
		card.querySelector(".card-toggle-icon").style.transform = body.hidden ? "rotate(-90deg)" : "";
	});
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
		<!-- VISITORS AREN'T RANKED (NO ACCOUNT); THE REAL PREVIEW IS THE "LEADERBOARD TEASER" TODO -->
		<div data-pane-body="ranking" hidden>
			<p class="card-sub margin-top-10" style="font-size: .7em">${MSG_VISITOR_RANKING}</p>
			${loginBtn}
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
				<div>
					<div class="opening-hours-header">
						<p class="court-rules-label">Ranking</p>
						<div class="view-toggle" id="ranking-toggle">
							<button class="view-toggle-btn" data-hidden="false">Participar</button>
							<button class="view-toggle-btn" data-hidden="true">Recusar</button>
						</div>
					</div>
					<p class="card-sub" style="font-size: .7em">${MSG_RANKING_VISIBILITY}</p>
				</div>
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
