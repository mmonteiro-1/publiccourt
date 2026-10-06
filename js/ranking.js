// THE RANKING TAB ON THE PROFILE: THE GOLF-TOURNAMENT BOARD, ITS UPDATES AND "ENTENDE O RANKING".
// LOADED BEFORE profile.js, WHOSE AUTH CALLBACK CAN CALL loadRanking AS SOON AS IT LOADS. IT REACHES THE PROFILE'S app AND FOLDER TABS ONLY WHEN CALLED

// THE RANKING MEASURES WHO PLAYS THE MOST, NOT WHO PLAYS THE BEST. THE PIG TEASES, NEVER SHAMES
const MSG_SEASON = name => `Época de ${name}`;
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
// THE WHOLE TEXT UNDER THE POINTS ROWS IN "ENTENDE O RANKING": THE SEASONS, THE RESET AND WHY THE BOARD CAN SHOW LESS THAN THE
// TRADING CARD (IT ONLY COUNTS THIS SEASON'S XP), WHAT DOESN'T COUNT, AND THE OPT-OUT. "DADOS" OPENS THAT TAB (data-pane-link)
const MSG_RANKING_INFO = `Há duas épocas por ano: Época de Verão: de 01/04 a 30/09. Época de Inverno: de 01/10 a 31/03<br><br>Os pontos voltam a zero no início de cada época. O teu XP de progresso geral nunca diminui. Se não vês todo o teu XP no ranking, é porque parte dele foi ganho em épocas anteriores.<br><br>Partidas com menos de 10 minutos não contam.<br><br>O ranking mostra todos os jogadores do Campo Livre. Se preferires ficar de fora, podes sair em <a href="#" data-pane-link="info">Dados</a>.`;
const MSG_POINTS_INFO = "Entende o ranking";
// DISPLAY ONLY — THE RULES THEMSELVES LIVE IN games_xp / season_ranking (supabase/sql), SO KEEP THESE IN STEP WITH THEM
const POINTS_RULES = [
	["Cada partida", 500],
	["Primeira partida num campo novo", 500],
	["Semana com partida novamente", 500],
	[`Obter passe <span class="badge">Em breve</span>`, XP_PER_PASS],
];
// IN THE BOARD'S "R. BARBOSA" FORMAT, SO IT READS LIKE A NAME ALREADY ON A PLAQUE
const MSG_VISITOR_RANK_NAME = "O. Teu Nome";
// 1000 IS THE FIRST GAME'S XP (+500 FOR THE GAME, +500 FOR THE NEW COURT), THE SAME AS DUMMY_GAME_XP IN profile.js
const MSG_VISITOR_RANKING = `Os melhores jogadores de cada época aparecem aqui. ${MSG_LOGIN_LINK} para participar. O teu primeiro jogo vale logo ${MSG_XP(1000)}.`;

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

// THE VISITOR'S LOCKED PREVIEW: EXAMPLE PLAYERS ON THE STANDARD BOARD. season_ranking IS FOR LOGGED-IN PLAYERS ONLY, AND REAL
// NAMES SHOULDN'T REACH SOMEONE WITHOUT AN ACCOUNT
const DUMMY_RANKING = [
	{ name: "R. Barbosa", points: 2230 },
	{ name: "M. Valadares", points: 2000 },
	{ name: "J. Costa", points: 1850 },
	{ name: "A. Quintela", points: 1500 },
	{ name: "T. Lopes", points: 1350 },
	{ name: "S. Meireles", points: 1000 },
	{ name: "C. Ferreira", points: 850 },
	{ name: "P. Sampaio", points: 500 },
	{ name: "L. Vilela", points: 350 },
];

// THE VISITOR SITS AMONG THEM AS "O TEU NOME" — A PLAQUE WAITING FOR THEIRS — WHITE LIKE ANY PLAYER'S OWN ROW. A TEASER, LIKE THE PROGRESS TAB'S DUMMY CARDS: ALWAYS THE
// EXAMPLE FIRST GAME'S XP, NEVER THE VISITOR'S REAL WALK-INS. AHEAD OF ANYONE ON THE SAME POINTS, AND ONE PLACE PER ROW (NO SHARED PLACES HERE)
function visitorRanking(xp) {
	const players = DUMMY_RANKING.map(row => ({ ...row, is_me: false }));
	const at = players.findIndex(row => row.points <= xp);
	players.splice(at === -1 ? players.length : at, 0, { name: MSG_VISITOR_RANK_NAME, points: xp, is_me: true });
	return players.map((row, i) => ({ ...row, place: i + 1 }));
}

// THE TOP THREE FOR THE ASPIRATION, THEN THE PLAYER WITH WHOEVER IS JUST ABOVE AND BELOW — NEVER THE WHOLE TABLE.
// preset (THE VISITOR'S EXAMPLE ROWS) SKIPS THE DATABASE ENTIRELY: NO LIVE RANKING, NO SNAPSHOT, NOTHING SAVED OR ANIMATED
async function loadRanking(container, user, preset) {
	const season = currentSeason();
	const { data } = preset ? { data: preset } : await db.rpc("season_ranking");
	const debug = new URLSearchParams(location.search).get("board");
	// before IS THE BOARD AS THE PLAYER LAST SAW IT THIS SEASON (ranking_views), after THE LIVE RANKING. NO SNAPSHOT YET (FIRST
	// LOOK THIS SEASON) MEANS NOTHING TO ANIMATE: THE BOARD JUST SHOWS
	let before, after;
	if (preset) {
		before = after = preset;
	} else if (debug) {
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
	// THE VISITOR'S EXAMPLE BOARD SHOWS EVERY ROW: A FULL SIGN SELLS IT BETTER THAN A NEIGHBOURHOOD THEY AREN'T PART OF YET
	const indices = preset ? after.map((_, i) => i) : [...shown].filter(i => i >= 0 && i < after.length).sort((a, b) => a - b);

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

	// THE VISITOR'S OWN PLAQUES ARE SLID INTO THEIR EMPTY SLOTS EVERY TIME THE TAB OPENS — THEIR NAME FIRST, THEN THE XP DIGITS LEFT
	// TO RIGHT, 0.5s APART — AS IF THE SIGN WERE BEING SET UP FOR THEM. THEY START OUT OF THEIR SLOTS (.plaque-gone), AND GO BACK OUT
	// BEFORE EACH REPLAY. run DROPS A REPLAY THAT A QUICK TAB SWITCH CUT SHORT. NONE OF IT UNDER REDUCED MOTION
	if (preset && meIndex !== -1 && !reducedMotion()) {
		const mine = rowEls[meIndex];
		const plaques = [mine.name, ...mine.xp.querySelectorAll(".plaque")].filter(plaque => plaque.textContent);
		const takeOut = () => plaques.forEach(plaque => {
			plaque.classList.remove("plaque-in");
			plaque.classList.add("plaque-gone");
		});
		takeOut();
		let run = 0;
		new IntersectionObserver(entries => {
			if (!entries[0].isIntersecting) return;
			const token = ++run;
			takeOut();
			plaques.forEach((plaque, n) => wait(500 + n * 500).then(() => {
				if (token !== run) return;
				plaque.classList.remove("plaque-gone");
				playPlaque(plaque, "plaque-in");
			}));
		}).observe(board);
	}

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
	if (preset) {
		// THE VISITOR'S LINE, WITH ITS LOGIN LINK — NO PLAYER NAMES IN IT, SO IT CAN GO IN AS HTML
		line.innerHTML = MSG_VISITOR_RANKING;
	} else if (meIndex === -1) {
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
	// season_ranking ALREADY SHOWED THEM. NEVER IN DEBUG, AND NEVER FOR THE VISITOR'S EXAMPLE BOARD
	const save = () => {
		if (debug || preset) return;
		const snapshot = after.map(({ place, name, points, is_me, ref }) => ({ place, name, points, is_me, ref }));
		// .then() BECAUSE A SUPABASE QUERY IS ONLY SENT WHEN AWAITED OR THEN-ED — NOTHING HERE WAITS ON IT
		db.from("ranking_views").upsert({ player_id: user.id, season_start: season.startDate, board: snapshot, seen_at: new Date().toISOString() }, { onConflict: "player_id,season_start" }).then(({ error }) => { if (error) console.error(error); });
	};
	const changed = indices.some(i => start(i).name !== after[i].name || start(i).points !== after[i].points);
	if (!changed) {
		if (before === after) save();
		return appendRulesCard(container, MSG_POINTS_INFO, POINTS_RULES, MSG_RANKING_INFO);
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
	appendRulesCard(container, MSG_POINTS_INFO, POINTS_RULES, MSG_RANKING_INFO);
}
