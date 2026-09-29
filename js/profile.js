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

// "ATIVIDADE", NEVER "SAÚDE" — SEE "ACTIVITY, NEVER HEALTH" IN CLAUDE.md
const MSG_VIEW_PROGRESS = "Progresso";
const MSG_PROGRESS_EMPTY = "O teu progresso aparece aqui depois do primeiro jogo.";
const MSG_STAT_STREAK = n => `${n} ${n === 1 ? "semana" : "semanas seguidas"}`;
const MSG_STAT_GAMES_VALUE = n => `${n} ${n === 1 ? "jogo" : "jogos"}`;
const MSG_STAT_GAMES_HINT = "Nos últimos 6 meses";
// PT-PT GROUPING ("26 500") KEEPS THE INFLATED NUMBERS READABLE
const MSG_XP = xp => `${xp.toLocaleString("pt-PT")} XP`;
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
const MSG_STAT_HOURS_HINT = "Em campo, desde o primeiro jogo";
const MSG_STAT_STREAK_HINT = "Com pelo menos um jogo";
const MSG_STAT_COURTS = n => `${n} ${n === 1 ? "campo" : "campos diferentes"}`;
const MSG_STAT_COURTS_HINT = n => `Já ${n === 1 ? "recebeu" : "receberam"} os teus jogos`;
const MSG_VIEW_MEMBERSHIPS = "Os teus campos";
const MSG_NO_MEMBERSHIPS = "Não és membro de nenhum campo, infelizmente. Bora mudar isso!";
const MSG_MEMBER_SINCE = date => `Membro desde ${date}`;
const MSG_NO_EXPIRY = "Sem data de expiração";
const MSG_NO_NEXT_GAME = "Sem jogos agendados";
const MSG_BOOKING_COUNT = n => `${n} ${n === 1 ? "reserva" : "reservas"}`;

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

// ENTRY POINT: REDIRECTS OWNERS, ROUTES NEW USERS TO ONBOARDING, RETURNING USERS TO PROFILE
async function loadProfile(user) {
	// LETS login.html GREET THIS DEVICE AS RETURNING NEXT TIME
	try { localStorage.setItem("hasLoggedIn", "1"); } catch {}
	await claimDeviceWalkIns(user);

	// OWNERS NEVER LAND ON THE PLAYER PROFILE — SEND THEM TO THEIR DASHBOARD.
	// MUST FILTER BY owner_id — MEMBERS CAN ALSO READ court_groups (FOR SLOT RULES),
	// SO WITHOUT THE FILTER ANY APPROVED MEMBER WOULD BE WRONGLY REDIRECTED TO owner.html.
	const { data: ownedGroups } = await db.from("court_groups").select("id").eq("owner_id", user.id).limit(1);
	if (ownedGroups && ownedGroups.length > 0) {
		takeOnce("returnTo");
		takeOnce("justLoggedIn");
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
	const games = [
		// A WALK-IN STOPPED EARLY STILL CARRIES ITS ORIGINAL (FUTURE) ends_at, SO manual_finished_at WINS
		...(walkInRows ?? []).map(w => ({ courtId: w.court_id, start: w.started_at, end: w.manual_finished_at ?? w.ends_at, kind: MSG_KIND_WALKIN })),
		...(bookingRows ?? []).map(b => ({ courtId: b.court_id, start: b.start_at, end: b.end_at, kind: MSG_KIND_BOOKING })),
	]
		.map(game => ({ ...game, mins: Math.round((new Date(game.end) - new Date(game.start)) / 60000) }))
		// A GAME OF 10 MIN OR LESS IS A MIS-TAP OR A WALK-IN ENDED RIGHT AWAY — NOT LISTED, AND NOT COUNTED IN PROGRESS
		.filter(game => new Date(game.end).getTime() < now && game.mins > 10)
		.sort((a, b) => new Date(b.start) - new Date(a.start));
	if (!games.length) return games;

	// COURTS IN ONE QUERY INSTEAD OF AN EMBEDDED JOIN, WHICH WOULD NEED AN FK ON BOTH SOURCE TABLES
	const ids = [...new Set(games.map(game => game.courtId))];
	const { data: courts } = await db.from("courts").select("id, name").in("id", ids);
	const byId = Object.fromEntries((courts ?? []).map(court => [court.id, court]));
	return games.map(game => ({ ...game, court: byId[game.courtId] ?? null }));
}

// TICKET CARDS REUSING THE OWNER DASHBOARD'S MARKUP, SO A GAME LOOKS THE SAME ON BOTH SIDES OF THE APP.
// TAKES THE fetchHistory PROMISE SO THE PROGRESS VIEW CAN SHARE ONE FETCH
async function loadHistory(container, gamesPromise) {
	const games = await gamesPromise;
	if (!games.length) {
		setPigAppearance(container, MSG_HISTORY_EMPTY, "pig_serving");
		return 0;
	}

	container.innerHTML = games.map(game => {
		const mins = game.mins;
		const title = MSG_GAME_TITLE(game.court?.name ?? MSG_COURT_UNKNOWN);
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

// XP ONLY EVER GROWS, SO IT COMES FROM LIFETIME EVENTS, NOT FROM THE SKILLS' ROLLING VALUES. +XP_PER_INCREMENT FOR EACH GAME,
// EACH DISTINCT COURT, AND EACH WEEK THAT EXTENDS A STREAK (A WEEK WITH A GAME RIGHT AFTER ANOTHER ONE — A LONE WEEK IS ALREADY PAID BY ITS GAMES)
// INFLATED ×10 ON PURPOSE — BIG NUMBERS FEEL MORE REWARDING; THE LEVEL ENDS ARE ×10 TOO, SO DIFFICULTY IS UNCHANGED
const XP_PER_INCREMENT = 500;
function playerXp(games) {
	const past = games.filter(game => new Date(game.start) < new Date());
	const courts = new Set(past.map(game => game.courtId)).size;
	const weeks = new Set(past.map(game => weekStart(game.start)));
	const streakWeeks = [...weeks].filter(week => {
		const previous = new Date(week);
		previous.setDate(previous.getDate() - 7);
		return weeks.has(previous.getTime());
	}).length;
	return (past.length + courts + streakWeeks) * XP_PER_INCREMENT;
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
	{ title: "Recruta", description: "Ainda a descobrir de que lado se segura a raquete." },
];

// THE TRADING CARD (THINK MAGIC / POKÉMON): LEVEL IN THE BANNER, PLAYER ART, CHARACTER NAME AND FLAVOUR TEXT,
// THE FOUR SKILL RATINGS, THEN THE XP BAR
function xpCard(xp, diamonds, skills) {
	const found = XP_LEVEL_ENDS.findIndex(end => xp < end);
	const index = found === -1 ? XP_LEVEL_ENDS.length - 1 : found;
	const from = index ? XP_LEVEL_ENDS[index - 1] : 0;
	const to = XP_LEVEL_ENDS[index];
	const fill = Math.min((xp - from) / (to - from), 1) * 100;
	const info = XP_LEVEL_INFO[index] ?? XP_LEVEL_INFO[0];
	return `
		<div class="trading-card">
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
			<p class="trading-card-next">${MSG_XP(to)}</p>
			${barHtml(fill, `<span>${MSG_XP(xp)}</span>`, "xp-bar")}
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
async function loadProgress(container, gamesPromise) {
	const games = await gamesPromise;
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
		<div class="membership-card">
			<p class="skill-title"><img src="images/icon_${icon}.svg" class="link-icon" alt="">${metric}</p>
			<p class="membership-player margin-top-5" style="white-space: normal">${value}${diamond ? ` ${DIAMOND_ICON}` : ""}</p>
			<div class="membership-date">${detail}</div>
			<p class="stat-level">${title}</p>
			${bar}
		</div>
	`;
	container.innerHTML = [
		xpCard(playerXp(games), Object.values(diamonds).filter(Boolean).length, [
			{ icon: "fire_color", rating: Math.round(skillRating(LEVELS_GAMES, gamesRecent)) },
			{ icon: "sheriff_color", rating: Math.round(skillRating(LEVELS_TARIMBA, hours)) },
			{ icon: "repeat_color", rating: Math.round(skillRating(LEVELS_STREAK, streak)) },
			{ icon: "globe_color", rating: Math.round(skillRating(LEVELS_TERRITORY, courts)) },
		]),
		statCard("fire", "Momentum", levelTitle(LEVELS_GAMES, gamesRecent) + levelStars(LEVELS_GAMES, gamesRecent), MSG_STAT_GAMES_VALUE(gamesRecent), MSG_STAT_GAMES_HINT, levelBar(LEVELS_GAMES, gamesRecent), diamonds.games),
		statCard("sheriff", "Tarimba", levelTitle(LEVELS_TARIMBA, hours) + levelStars(LEVELS_TARIMBA, hours), MSG_STAT_HOURS(hours), MSG_STAT_HOURS_HINT, levelBar(LEVELS_TARIMBA, hours), diamonds.hours),
		statCard("repeat", "Consistência", levelTitle(LEVELS_STREAK, streak) + levelStars(LEVELS_STREAK, streak), MSG_STAT_STREAK(streak), MSG_STAT_STREAK_HINT, levelBar(LEVELS_STREAK, streak), diamonds.streak),
		statCard("globe", MSG_TITLE_TERRITORY, levelTitle(LEVELS_TERRITORY, courts - 1) + levelStars(LEVELS_TERRITORY, courts - 1), MSG_STAT_COURTS(courts), MSG_STAT_COURTS_HINT(courts), levelBar(LEVELS_TERRITORY, courts), diamonds.courts),
	].join("");
}

// LANYARD STRAP DIPPING INTO THE BADGE SLOT: THE FRONT STRAP, THEN THE FOLD (THE STRAP'S BACK, SEEN AS IT TURNS INTO
// THE SLOT), SHIFTED 4px/4px IN CSS. ITS DARK YELLOW IS HARDCODED ON PURPOSE — THERE'S NO VARIABLE FOR IT.
// INLINE, NOT AN <img>, SO CSS CAN FILL THE STRAP WITH THE COLOUR VARIABLES.
// THE VIEWBOX STARTS AT y -26.5 (= 10px AT THE RENDERED 65px WIDTH) SO THE STRAP RISES 10px ABOVE THE CARD; ITS TOP
// EDGE KEEPS THE SAME SLANT. THE STRAP IS WIDENED ~20px (53 UNITS) ON ITS LEFT ONLY, SO THE FOLD STILL MEETS THE RIGHT EDGE;
// BOTH PUSH THE LEFT CORNER OUTSIDE THE VIEWBOX (x -62.5), HENCE overflow: visible IN CSS.
// THE STRAP'S BOTTOM-LEFT CORNER AND THE FOLD'S TIP ARE ROUNDED ~5px (13 UNITS): EACH CURVE STARTS 13 UNITS BEFORE THE CORNER
// ALONG ONE EDGE AND ENDS 13 AFTER IT. THE STRAP'S BOTTOM-RIGHT STAYS SHARP
const BADGE_RIBBON_SVG = `<svg viewBox="0 -26.5 172 110.5" aria-hidden="true"><path d="M-62.5 -26.5H114.9L157 84H-9.8Q-23 84 -27.4 71.6Z"/><path d="M140 44H172L161.6 71.6Q157 84 151.8 71.9Z" fill="#b08900"/></svg>`;

// THE PLAYER'S APPROVED MEMBERSHIPS AS THE SAME CARD THE OWNER SEES IN THE MEMBERS TAB (owner.js renderMembersView),
// WITH THE GROUP NAME WHERE THE OWNER SEES THE PLAYER'S. NO REVOKE LINK — THAT'S THE OWNER'S CALL, NOT THE PLAYER'S
async function loadMemberships(container, user) {
	const { data: memberships } = await db.from("memberships")
		.select("group_id, approved_at, expires_at")
		.eq("player_id", user.id)
		.eq("status", "approved");
	if (!memberships?.length) {
		setPigAppearance(container, MSG_NO_MEMBERSHIPS, "pig_reaching");
		return;
	}

	const groupIds = memberships.map(m => m.group_id);
	const [{ data: groups }, { data: courts }, { data: bookings }] = await Promise.all([
		db.from("court_groups").select("id, name").in("id", groupIds),
		db.from("courts").select("group_id, name").in("group_id", groupIds).eq("active", true).order("group_position"),
		// ORDERED BY start_at SO THE FIRST NOT-YET-STARTED MATCH PER GROUP IS THE NEXT GAME
		db.from("bookings").select("group_id, start_at, end_at").eq("player_id", user.id).eq("status", "confirmed").in("group_id", groupIds).order("start_at"),
	]);

	const now = new Date();
	container.innerHTML = [...memberships]
		.sort((a, b) => new Date(b.approved_at) - new Date(a.approved_at))
		.map(m => {
			const courtNames = (courts ?? []).filter(c => c.group_id === m.group_id).map(c => c.name).join(", ");
			// MOST GROUPS HAVE NO name IN THE DB, SO THEIR COURTS STAND IN FOR IT
			const groupName = (groups ?? []).find(g => g.id === m.group_id)?.name || courtNames || MSG_COURT_UNKNOWN;
			const groupBookings = (bookings ?? []).filter(b => b.group_id === m.group_id);
			const nextBooking = groupBookings.find(b => new Date(b.start_at) > now);
			const approvedDate = m.approved_at ? new Date(m.approved_at).toLocaleDateString("pt-PT") : "—";
			const expiresDate = m.expires_at ? new Date(m.expires_at).toLocaleDateString("pt-PT") : null;
			return `
			<div class="membership-card">
				<div class="membership-hole"></div>
				${BADGE_RIBBON_SVG}
				<p class="membership-player">${groupName}</p>
				<div class="membership-date-row">
					<p class="membership-date">${MSG_MEMBER_SINCE(approvedDate)}</p>
				</div>
				<div class="divider"></div>
				<div class="membership-data">
					<p class="membership-date">${expiresDate ? `<img src="images/icon_trash.svg" class="link-icon" alt=""> ${expiresDate}` : MSG_NO_EXPIRY}</p>
					<p class="membership-date"><img src="images/icon_calendar_tennis.svg" class="link-icon" alt="">${nextBooking ? gameLabel(nextBooking.start_at, nextBooking.end_at) : MSG_NO_NEXT_GAME}</p>
					<p class="membership-date"><img src="images/icon_history.svg" class="link-icon" alt="">${MSG_BOOKING_COUNT(groupBookings.length)}</p>
				</div>
			</div>
		`;
		}).join("");
}

// VISITORS SEE THEIR DEVICE'S WALK-IN HISTORY INSTEAD OF BEING BOUNCED TO THE LOGIN PAGE — SOMEONE WHO
// ONLY EVER PLAYS WALK-INS STILL HAS A HISTORY WORTH SHOWING, AND LOGGING IN CLAIMS IT (SEE claimDeviceWalkIns)
// SAME TOGGLE AS THE LOGGED-IN PROFILE SO VISITORS SEE WHAT AN ACCOUNT ADDS; THE PANES THEY CAN'T USE HOLD THE LOGIN BUTTON
function showVisitor() {
	const loginBtn = `<button data-action="login" class="margin-top-20"><img src="images/icon_login.svg" class="link-icon" alt="">${MSG_VISITOR_LOGIN}</button>`;
	app.innerHTML = `
		${FOLDER_TABS_HTML}
		<div data-pane-body="history" hidden>
			<div class="bookings-list margin-top-20 margin-bottom-20"></div>
			<!-- HIDDEN UNTIL THE HISTORY LOADS: WITH NO GAMES THE PIG STANDS ALONE -->
			<div id="visitor-history-extra" hidden>
				<p class="card-sub" style="font-size: .7em">${MSG_VISITOR_INTRO}</p>
				${loginBtn}
			</div>
		</div>
		<div data-pane-body="progress">${loginBtn}</div>
		<div data-pane-body="memberships" hidden>${loginBtn}</div>
		<div data-pane-body="info" hidden>${loginBtn}</div>
	`;

	loadHistory(app.querySelector(".bookings-list"), fetchHistory(null)).then(count => {
		document.getElementById("visitor-history-extra").hidden = !count;
	});
	wireFolderTabs();
	app.querySelectorAll('[data-action="login"]').forEach(btn => btn.addEventListener("click", () => { location.href = "login.html"; }));
}

// PROGRESS IS THE DEFAULT PANE FOR PLAYERS AND VISITORS ALIKE (A VISITOR TEASER WILL FILL THEIRS LATER)
const FOLDER_TABS_HTML = `
	<div class="folder-tabs">
		<button class="folder-tab active" data-pane="progress" aria-label="${MSG_VIEW_PROGRESS}"><img src="images/icon_medal.svg" alt=""><span>Progresso</span></button>
		<button class="folder-tab" data-pane="history" aria-label="${MSG_HISTORY_TITLE}"><img src="images/icon_history.svg" alt=""><span>Histórico</span></button>
		<button class="folder-tab" data-pane="memberships" aria-label="${MSG_VIEW_MEMBERSHIPS}"><img src="images/icon_id.svg" alt=""><span>Passes</span></button>
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

// RENDERS THE PLAYER PROFILE: A TOGGLE BETWEEN FOUR PANES — PAST GAMES, PROGRESS, MEMBERSHIPS, AND INFO
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
		<div data-pane-body="memberships" hidden>
			<div class="bookings-list margin-top-20"></div>
		</div>
	`;

	const games = fetchHistory(user);
	loadHistory(app.querySelector('[data-pane-body="history"] .bookings-list'), games);
	loadProgress(app.querySelector('[data-pane-body="progress"] .bookings-list'), games);
	loadMemberships(app.querySelector('[data-pane-body="memberships"] .bookings-list'), user);

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
