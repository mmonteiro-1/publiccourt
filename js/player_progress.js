// THE PROFILE'S PROGRESS TAB: THE SKILLS (LEVEL SCALES, STREAK AND PEAK MATHS), DIAMONDS, THE TRADING CARD AND THE SKILL CARDS.
// THE XP LEVELS THEMSELVES ARE IN utils.js, SHARED WITH THE HEADER'S LEVEL RING

// "ATIVIDADE", NEVER "SAÚDE" — SEE "ACTIVITY, NEVER HEALTH" IN CLAUDE.md
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
const MSG_PROGRESS_INFO = "Entende o progresso";
// "ENTENDE O PROGRESSO": XP AND LEVELS (LIFETIME) ABOVE THE ROWS, WHICH SHOW WHAT EACH SKILL BRINGS IN; BELOW THEM, WHY THE
// SKILLS AND THE XP MOVE TOGETHER WITHOUT ONE PAYING THE OTHER — AND TARIMBA, THE ONE SKILL WITH NO XP OF ITS OWN
const MSG_PROGRESS_INTRO = `O XP é o teu progresso de sempre: nunca diminui, nem quando paras. É ele que te faz subir de nível, do 1 ao 10.<br><br>Para além do XP tens também 4 atributos, que mostram os teus hábitos de jogo.`;
const MSG_PROGRESS_RULES = `Cada atributo tem o seu progresso de 0 a 100. Este progresso é representado pelos números grandes do cartão e pela barra de progresso azul. Quem enche uma barra ganha um diamante, que fica para sempre — mesmo que a barra volte a descer.<br><br>Os atributos não dão XP por si: o XP vem das mesmas partidas que os fazem subir, como mostra a lista acima. Tarimba é a exceção, não tem XP próprio: uma partida de 2h vale o mesmo que uma de 30 min.<br><br>Partidas com menos de 10 minutos não contam.`;
// WHICH SKILL EACH XP INCREMENT RIDES ON. DISPLAY ONLY — THE RULES THEMSELVES LIVE IN games_xp (supabase/sql/xp.sql), SO KEEP
// THESE IN STEP WITH IT (AND WITH POINTS_RULES IN ranking.js)
const PROGRESS_RULES = [
	[`<img src="images/icon_fire_color.svg" class="link-icon" alt="">Momentum: cada partida`, 500],
	[`<img src="images/icon_globe_color.svg" class="link-icon" alt="">${MSG_TITLE_TERRITORY}: cada campo novo`, 500],
	[`<img src="images/icon_repeat_color.svg" class="link-icon" alt="">Consistência: cada semana seguida`, 500],
	[`<img src="images/icon_id.svg" class="link-icon" alt="">Passe aprovado`, XP_PER_PASS],
];

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

// XP ITSELF IS COMPUTED IN THE DATABASE (games_xp, player_xp), NOT HERE — THE RANKING READS THE SAME FUNCTIONS
function sumXp(games) {
	return games.reduce((sum, game) => sum + game.xp, 0);
}

// THE LEVELS THEMSELVES (XP_LEVEL_ENDS, xpLevel) ARE IN utils.js, SHARED WITH THE HEADER'S LEVEL RING
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
	const { level, fill } = xpLevel(xp);
	const index = level - 1;
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
		appendRulesCard(container, MSG_PROGRESS_INFO, PROGRESS_RULES, MSG_PROGRESS_RULES, MSG_PROGRESS_INTRO);
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
		statCard("fire_color", "Momentum", levelTitle(LEVELS_GAMES, gamesRecent), MSG_STAT_GAMES_VALUE(shown(gamesRecent)), MSG_STAT_GAMES_HINT, levelBar(LEVELS_GAMES, gamesRecent), diamonds.games),
		statCard("sheriff_color", "Tarimba", levelTitle(LEVELS_TARIMBA, hours), MSG_STAT_HOURS(shown(hours)), MSG_STAT_HOURS_HINT, levelBar(LEVELS_TARIMBA, hours), diamonds.hours),
		statCard("repeat_color", "Consistência", levelTitle(LEVELS_STREAK, streak), MSG_STAT_STREAK(shown(streak)), MSG_STAT_STREAK_HINT, levelBar(LEVELS_STREAK, streak), diamonds.streak),
		statCard("globe_color", MSG_TITLE_TERRITORY, levelTitle(LEVELS_TERRITORY, courts - 1), MSG_STAT_COURTS(shown(courts)), MSG_STAT_COURTS_HINT(shown(courts)), levelBar(LEVELS_TERRITORY, courts), diamonds.courts),
	].join("");
	appendRulesCard(container, MSG_PROGRESS_INFO, PROGRESS_RULES, MSG_PROGRESS_RULES, MSG_PROGRESS_INTRO);
}

// "ENTENDE O …": THE RULES OF A TAB, FOLDED AWAY UNTIL ASKED FOR — THE SAME COLLAPSIBLE CARD AS THE ADMIN'S COURT RULES
// (admin.js), STARTING CLOSED: THE TRIANGLE TURNED -90deg, AS admin.js TURNS IT WHEN A CARD IS FOLDED. rows ARE [label, xp];
// A data-pane-link IN THE TEXT OPENS THAT PROFILE TAB. AN intro GOES ABOVE THE ROWS. SHARED WITH THE RANKING TAB (ranking.js)
function appendRulesCard(container, title, rows, text, intro) {
	container.insertAdjacentHTML("beforeend", `
		<div class="court-rules-card">
			<div class="court-rules-toggle">
				<p class="court-rules-title"><img src="images/icon_info.svg" class="link-icon" alt="">${title}</p>
				<img src="images/icon_triangle.svg" class="card-toggle-icon" alt="" style="transform: rotate(-90deg)">
			</div>
			<div class="court-rules-body" hidden>
				${intro ? `<p class="card-sub">${intro}</p>` : ""}
				${rows.map(([label, xp]) => `<p class="ranking-row"><span>${label}</span><span>+${MSG_XP(xp)}</span></p>`).join("")}
				<p class="card-sub margin-top-10">${text}</p>
			</div>
		</div>
	`);
	const card = container.lastElementChild;
	card.querySelectorAll("[data-pane-link]").forEach(link => link.addEventListener("click", event => {
		event.preventDefault();
		document.querySelector(`.folder-tab[data-pane="${link.dataset.paneLink}"]`).click();
	}));
	card.querySelector(".court-rules-toggle").addEventListener("click", () => {
		const body = card.querySelector(".court-rules-body");
		body.hidden = !body.hidden;
		card.querySelector(".card-toggle-icon").style.transform = body.hidden ? "rotate(-90deg)" : "";
	});
}


// THE PLAYER'S WHOLE XP, PASSES INCLUDED (FROM pass_awards, SO REVOKING NEVER LOWERS IT)
async function fetchXp() {
	const { data } = await db.rpc("my_xp");
	return data ?? 0;
}
