// THE PROFILE'S PROGRESS TAB: THE STATS (ESTILO DE JOGO), DIAMONDS, THE TRADING CARD AND THE STAT CARDS.
// THE XP LEVELS THEMSELVES ARE IN utils.js, SHARED WITH THE HEADER'S LEVEL RING

// "ATIVIDADE", NEVER "SAÚDE" — SEE "ACTIVITY, NEVER HEALTH" IN CLAUDE.md
const MSG_PROGRESS_EMPTY = "O teu progresso aparece aqui depois do primeiro jogo.";
// "NENHUMA" FOR ZERO: SPACE GROTESK'S ROUND 0 READ AS AN "o" ("o jogos"), AND IT HAS NO SLASHED ZERO
const MSG_STAT_WEEKS = n => n === 0 ? "Nenhuma semana com partidas" : `${n} ${n === 1 ? "semana" : "semanas"} com partidas`;
const MSG_STAT_GAMES_VALUE = n => n === 0 ? "Nenhuma partida" : `${n} ${n === 1 ? "partida" : "partidas"}`;
const MSG_STAT_RATING = n => `${n}%`;
const MSG_STAT_HINT = "nos últimos 6 meses";
const MSG_XP_LEVEL = n => `Nível ${n}`;
// EACH STAT'S 100 MARK: THE COUNT OVER THE LAST 6 MONTHS THAT RATES 100 (ANYTHING ABOVE IS CAPPED)
const STAT_GAMES = 40;
const STAT_WEEKS = 20;
const STAT_TERRITORY = 5;
const MSG_TITLE_TERRITORY = "Território";
const MSG_STAT_COURTS = n => n === 0 ? "Nenhum campo" : `${n} ${n === 1 ? "campo diferente" : "campos diferentes"}`;
// DIAMONDS: LIFETIME FEATS, NOT FULL BARS. CAMPEÃO (A SEASON WIN) WAITS FOR league_results
const DIAMOND_GAMES = 100;
const DIAMOND_COURTS = 10;
const DIAMOND_STREAK = 26;
const MSG_PROGRESS_INFO = "Entende o progresso";
// "ENTENDE O PROGRESSO": XP ABOVE THE ROWS; BELOW THEM ESTILO DE JOGO AND DIAMONDS — THREE SEPARATE THINGS THAT NEVER FEED
// EACH OTHER (SEE "THE PROGRESS MODEL" IN CLAUDE.md)
const MSG_PROGRESS_INTRO = `Cada partida dá-te XP, e acumular XP faz-te subir do nível 1 ao 10. Estas são as formas de ganhar XP:`;
const MSG_PROGRESS_RULES = `<b>Estilo de jogo:</b> mostra como tens jogado nos últimos 6 meses. <img src="images/icon_fire_color.svg" class="link-icon" alt="">Frequência, <img src="images/icon_repeat_color.svg" class="link-icon" alt="">Consistência e <img src="images/icon_globe_color.svg" class="link-icon" alt="">Território são medidos aqui. Cada um recebe uma nota de 0 a 100%.<br><br><b>Diamantes:</b> são as conquistas mais valiosas do Campo Livre: 100 partidas, ou 10 campos diferentes, ou jogar todas as semanas durante 6 meses, ou vencer uma <a href="#" data-pane-link="ranking">época</a>.<br><br>Partidas com menos de 10 min não são registadas.`;
// THE WAYS TO EARN XP, ONE LIST FOR BOTH "ENTENDE O PROGRESSO" AND "ENTENDE O RANKING" (ranking.js), SO THE TWO CAN NEVER WORD THEM
// DIFFERENTLY. DISPLAY ONLY — THE RULES LIVE IN games_xp (supabase/sql/xp.sql). THE PASS IS POSTPONED, SO ITS ROW SAYS "EM BREVE"
const XP_RULES = [
	["Cada partida", 500],
	["Cada campo novo", 500],
	["Cada semana seguida a jogar", 500],
	[`Obter passe <span class="badge">Em breve</span>`, XP_PER_PASS],
];

// MONDAY 00:00 OF THE WEEK date FALLS IN, AS A TIMESTAMP — THE KEY FOR THE WEEKLY STREAK
function weekStart(date) {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
	return d.getTime();
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

const DIAMOND_ICON = `<img src="images/icon_diamond_color.svg" class="link-icon" alt="">`;
// XP ITSELF IS COMPUTED IN THE DATABASE (games_xp, player_xp), NOT HERE — THE RANKING READS THE SAME FUNCTIONS
function sumXp(games) {
	return games.reduce((sum, game) => sum + game.xp, 0);
}

// THE LEVELS THEMSELVES (XP_LEVEL_ENDS, xpLevel) ARE IN utils.js, SHARED WITH THE HEADER'S LEVEL RING
// CHARACTER ART PER XP LEVEL (INDEX 0 = LEVEL 1), GETTING MORE "PRO" AS THE PLAYER LEVELS UP.
// PLACEHOLDERS FOR NOW — ONE ENTRY PER LEVEL SO EACH CAN GET ITS OWN IMAGE LATER WITHOUT TOUCHING THE LOGIC
const XP_LEVEL_IMAGES = [
	"pig_vans", "pig_egg", "pig_selfie",
	"pig_stretching", "pig_sitting", "pig_sitting",
	"pig_serving", "pig_serving", "pig_serving", "pig_serving",
];

// THE FRAME BEHIND THE ART PER XP LEVEL (INDEX 0 = LEVEL 1); null KEEPS THE PLAIN YELLOW
const XP_LEVEL_BACKGROUNDS = [
	"bg_level1_loop", "bg_level2", "bg_level3",
	"bg_level4", null, null,
	null, null, null, null,
];

// CHARACTER NAME + FLAVOUR TEXT PER XP LEVEL (INDEX 0 = LEVEL 1) — THE CHARACTER ARC IN CLAUDE.md, ONE JOKE PER CARD.
// VISITORS ARE LEVEL 1 TOO: THEIR LOCKED CARD SHOWS RAQUETE EMPRESTADA, LIKE A REAL LEVEL-1 PLAYER'S.
// LEVEL 10 AND THE BRANDS IN 1, 3 AND 7 ARE KEPT AS WRITTEN; IF ANYONE OBJECTS, 10 BECOMES "LENDA DO BAIRRO"
const XP_LEVEL_INFO = [
	{ title: "Raquete emprestada", description: "Aparece para jogar com a raquete do primo e sapatilhas da Vans. Não tem absoluta certeza se aceitou o convite para jogar ténis ou padel." },
	{ title: "Pega de frigideira", description: "Segura a raquete como quem vai estrelar um ovo. É comum parar o jogo para ir buscar bolas ao terreno vizinho." },
	{ title: "Influencer de campo", description: "Se não há post, não há ténis. Os followers acreditam que tem patrocínio da Lacoste." },
	{ title: "O Aquecedor", description: "Começa a aquecer em frente ao campo ocupado, como quem não quer nada. Faz quarenta minutos de aquecimento e joga dez. Diz que o segredo está na preparação." },
	{ title: "Pavio curto", description: "Acha que devia jogar como na televisão. Cada bola na rede é uma ofensa pessoal." },
	{ title: "Juiz de linha", description: "Nenhuma bola do adversário cai dentro. Tem vista de águia, mas só para um dos lados." },
	{ title: "Cortador de fiambre", description: "Desde que aprendeu o slice não bate outra coisa. Era perfeito para cortar jamón no Mercadona." },
	{ title: "Servidor público", description: "Serve tão rápido que ninguém lhe devolve uma bola. Perde os jogos todos por duplas faltas." },
	{ title: "Supersticioso", description: "Ajeita a fita, limpa os punhos e bate a bola sete vezes antes de cada serviço. Em equipa que ganha não se mexe." },
	{ title: "Roger Manel Federer", description: "Joga de olhos fechados e ainda dá conselhos a quem não pediu. Diz a lenda que já lhe pediram um autógrafo." },
];

// THE CAMERA FLASH ON THE INFLUENCER'S CARD (LEVEL 3): THE CARD GOES WHITE AND, WHILE IT IS, THE ART SWAPS TO THIS ONE
const XP_FLASH_LEVEL = 3;
const XP_FLASH_IMAGE = "pig_selfie2";
// THE PHONE'S FLASH IN THE FIRST IMAGE, AS A SHARE OF ITS SIZE: THE #flash CIRCLE IN pig_selfie.svg (92.33, 24.81 OF 677.85 × 858.1)
const XP_FLASH_SOURCE = { x: 92.33 / 677.85, y: 24.81 / 858.1, ratio: 677.85 / 858.1 };

// CENTRES THE BURST ON THE PHONE. MEASURED WHEN THE FLASH STARTS, NOT ON RENDER: THE PROGRESS TAB MAY BE HIDDEN THEN, AND
// object-fit: contain MAKES THE DRAWING SMALLER THAN THE <img> BOX, SO THE POINT COMES FROM THE DRAWN AREA
function aimCameraFlash(card) {
	const img = card.querySelector(".trading-card-art img");
	const box = img.getBoundingClientRect();
	// THE DRAWING'S OWN RATIO, NOT naturalWidth: AN SVG WITH ONLY A viewBox HAS NO RELIABLE NATURAL SIZE
	const width = Math.min(box.width, box.height * XP_FLASH_SOURCE.ratio);
	const height = width / XP_FLASH_SOURCE.ratio;
	// ::after SITS IN THE PADDING BOX, INSIDE THE CARD'S BORDER
	const origin = card.getBoundingClientRect();
	const x = box.left + (box.width - width) / 2 + XP_FLASH_SOURCE.x * width - origin.left - card.clientLeft;
	const y = box.top + (box.height - height) / 2 + XP_FLASH_SOURCE.y * height - origin.top - card.clientTop;
	// THE SOLID WHITE IS 60% OF THE RADIUS, AND IT HAS TO REACH THE FARTHEST CORNER
	const reach = Math.max(...[[0, 0], [card.clientWidth, 0], [0, card.clientHeight], [card.clientWidth, card.clientHeight]]
		.map(([cx, cy]) => Math.hypot(cx - x, cy - y)));
	card.style.setProperty("--flash-x", `${x}px`);
	card.style.setProperty("--flash-y", `${y}px`);
	card.style.setProperty("--flash-r", `${reach / 0.6}px`);
}

// THE TRADING CARD (THINK MAGIC / POKÉMON): LEVEL IN THE BANNER, PLAYER ART, CHARACTER NAME AND FLAVOUR TEXT,
// THE THREE STAT RATINGS, THEN THE XP BAR. A teaser MAKES IT THE VISITOR'S LOCKED PREVIEW: THE FILL
// GROWING IN (.locked), AND THE TEASER UNDER THE BAR
function xpCard(xp, diamonds, stats, teaser) {
	const { level, fill } = xpLevel(xp);
	const index = level - 1;
	const info = XP_LEVEL_INFO[index];
	return `
		<div class="trading-card${teaser ? " locked" : ""}${level === XP_FLASH_LEVEL ? " flash" : ""}">
			<p class="trading-card-level">${MSG_XP_LEVEL(index + 1)}<span>${DIAMOND_ICON} ${diamonds}</span></p>
			<div class="trading-card-art">
				<div class="trading-card-frame"${XP_LEVEL_BACKGROUNDS[index] ? ` style="background-image: url('images/${XP_LEVEL_BACKGROUNDS[index]}.svg')"` : ""}></div>
				<img src="images/${XP_LEVEL_IMAGES[index]}.svg" alt="">
				${level === XP_FLASH_LEVEL ? `<img src="images/${XP_FLASH_IMAGE}.svg" alt="">` : ""}
			</div>
			<p class="trading-card-name">${info.title}</p>
			<p class="trading-card-text">${info.description}</p>
			<div class="trading-card-stats">${stats.map(stat => `
				<div class="trading-card-stat">
					${stat.rating}
					<img src="images/icon_${stat.icon}.svg" class="link-icon" alt="">
				</div>
			`).join("")}</div>
			<div class="xp-bar" style="--fill: ${fill}%"><div></div><span>${MSG_XP(xp)}</span></div>
			${teaser ? `<p class="trading-card-text">${teaser}</p>` : ""}
		</div>
	`;
}

// DEBUG (DEV SERVER ONLY, IS_DEV): ?level=N ON profile.html DRAWS THE TRADING CARD AT LEVEL N (1–10), HALFWAY THROUGH IT —
// ITS PIG, CHARACTER, BACKGROUND AND XP. ONLY THE XP IS FAKED, NOTHING IS SAVED; THE STATS STAY THE PLAYER'S OWN
const DEBUG_LEVEL = IS_DEV ? Math.min(Math.max(parseInt(new URLSearchParams(location.search).get("level")) || 0, 0), 10) : 0;

function debugLevelXp(level) {
	const from = level > 1 ? XP_LEVEL_ENDS[level - 2] : 0;
	return Math.round((from + XP_LEVEL_ENDS[level - 1]) / 2);
}

// THE STAT AGAINST ITS 100 MARK, CAPPED, SO THE TRADING CARD'S NUMBERS SHARE ONE SCALE (THINK FIFA CARD RATINGS)
function statRating(max, value) {
	return Math.min(value / max, 1) * 100;
}

// PROGRESS FROM THE SAME GAMES AS THE HISTORY (ALREADY WITHOUT THE ≤10 MIN ONES). DECLARED TIME ON COURT,
// NOT TIME PLAYED: A WALK-IN LASTS WHAT THE PLAYER CHOSE UNLESS ENDED EARLY, AND A BOOKING DOESN'T PROVE A SHOW-UP
// A teaser MAKES THIS THE VISITOR'S LOCKED PREVIEW: IT PINS EVERY RATING AND THE STAT CARDS' COUNTS AT 0 —
// AN EMPTY STARTING POINT RATHER THAN THE DUMMY FIRST GAME'S REAL VALUES. THE XP STILL COMES FROM THAT GAME
// xpPromise IS THE TRADING CARD'S TOTAL: THE GAMES' XP PLUS +3000 PER PASS EVER AWARDED, AS player_xp COUNTS IT
async function loadProgress(container, gamesPromise, teaserPromise, xpPromise) {
	const games = await gamesPromise;
	const teaser = await teaserPromise;
	const xp = DEBUG_LEVEL ? debugLevelXp(DEBUG_LEVEL) : await xpPromise;
	if (!games.length) {
		setPigAppearance(container, MSG_PROGRESS_EMPTY, "pig_reaching");
		appendRulesCard(container, MSG_PROGRESS_INFO, XP_RULES, MSG_PROGRESS_RULES, MSG_PROGRESS_INTRO);
		return;
	}

	// ALL THREE STATS SHARE ONE ROLLING 6-MONTH WINDOW — NOT A CALENDAR PERIOD, SO NOTHING RESETS TO ZERO ON A FIXED DATE
	const now = new Date();
	const recentStart = new Date(now);
	recentStart.setMonth(recentStart.getMonth() - 6);
	const past = games.filter(game => new Date(game.start) < now);
	const recent = past.filter(game => new Date(game.start) >= recentStart);
	const gamesRecent = recent.length;
	// WEEKS WITH A GAME, NOT A STREAK: ONE MISSED WEEK DOESN'T WIPE IT OUT. THE STREAK ONLY PAYS XP AND THE INQUEBRÁVEL DIAMOND
	const weeks = new Set(recent.map(game => weekStart(game.start))).size;
	const courts = new Set(recent.map(game => game.courtId)).size;

	// LIFETIME FEATS, KEPT FOREVER. KEYED BY STAT SO EACH SHOWS ON ITS CARD
	const diamonds = {
		games: past.length >= DIAMOND_GAMES,
		weeks: longestStreak(past) >= DIAMOND_STREAK,
		courts: new Set(past.map(game => game.courtId)).size >= DIAMOND_COURTS,
	};

	// NO BAR: THE XP BAR IS THE ONLY ONE ON THE PROFILE, SO A STAT NEVER READS AS A SECOND PROGRESS
	const rating = (max, value) => teaser ? 0 : Math.round(statRating(max, value));
	const shown = value => teaser ? 0 : value;
	const statCard = (icon, metric, max, value, count, diamond) => `
		<div class="ticket">
			<p class="stat-name"><img src="images/icon_${icon}.svg" class="link-icon" alt="">${metric}</p>
			<p class="ticket-title margin-top-5">${MSG_STAT_RATING(rating(max, value))}${diamond ? ` ${DIAMOND_ICON}` : ""}</p>
			<div class="ticket-date">${count} ${MSG_STAT_HINT}</div>
		</div>
	`;
	container.innerHTML = [
		xpCard(xp, Object.values(diamonds).filter(Boolean).length, [
			{ icon: "fire_color", rating: rating(STAT_GAMES, gamesRecent) },
			{ icon: "repeat_color", rating: rating(STAT_WEEKS, weeks) },
			{ icon: "globe_color", rating: rating(STAT_TERRITORY, courts) },
		], teaser),
		statCard("fire_color", "Frequência", STAT_GAMES, gamesRecent, MSG_STAT_GAMES_VALUE(shown(gamesRecent)), diamonds.games),
		statCard("repeat_color", "Consistência", STAT_WEEKS, weeks, MSG_STAT_WEEKS(shown(weeks)), diamonds.weeks),
		statCard("globe_color", MSG_TITLE_TERRITORY, STAT_TERRITORY, courts, MSG_STAT_COURTS(shown(courts)), diamonds.courts),
	].join("");
	const flashCard = container.querySelector(".trading-card.flash");
	flashCard?.addEventListener("animationstart", () => aimCameraFlash(flashCard));
	appendRulesCard(container, MSG_PROGRESS_INFO, XP_RULES, MSG_PROGRESS_RULES, MSG_PROGRESS_INTRO);
}

// "ENTENDE O …": THE RULES OF A TAB, FOLDED AWAY UNTIL ASKED FOR — THE SAME COLLAPSIBLE CARD AS THE ADMIN'S COURT RULES
// (admin.js), STARTING CLOSED: THE TRIANGLE TURNED -90deg, AS admin.js TURNS IT WHEN A CARD IS FOLDED. rows ARE [label, xp];
// A data-pane-link IN THE TEXT OPENS THAT PROFILE TAB. AN intro GOES ABOVE THE ROWS. SHARED WITH THE RANKING TAB (ranking.js)
function appendRulesCard(container, title, rows, text, intro) {
	container.insertAdjacentHTML("beforeend", `
		<div class="card-collapsible">
			<div class="card-collapsible-toggle">
				<p class="court-rules-title"><img src="images/icon_info.svg" class="link-icon" alt="">${title}</p>
				<img src="images/icon_triangle.svg" class="card-toggle-icon" alt="" style="transform: rotate(-90deg)">
			</div>
			<div class="card-collapsible-body" hidden>
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
	card.querySelector(".card-collapsible-toggle").addEventListener("click", () => {
		const body = card.querySelector(".card-collapsible-body");
		body.hidden = !body.hidden;
		card.querySelector(".card-toggle-icon").style.transform = body.hidden ? "rotate(-90deg)" : "";
	});
}


// THE PLAYER'S WHOLE XP, FROM player_xp (PASS XP POSTPONED)
async function fetchXp() {
	const { data } = await db.rpc("my_xp");
	return data ?? 0;
}
