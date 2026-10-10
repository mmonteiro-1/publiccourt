// THE PROFILE'S PROGRESS TAB: THE STATS (ESTILO DE JOGO), DIAMONDS, THE TRADING CARD AND THE STAT CARDS.
// THE XP LEVELS THEMSELVES ARE IN utils.js, SHARED WITH THE HEADER'S LEVEL RING

// "ATIVIDADE", NEVER "SAÚDE" — SEE "ACTIVITY, NEVER HEALTH" IN CLAUDE.md
// "NENHUMA" FOR ZERO: SPACE GROTESK'S ROUND 0 READ AS AN "o" ("o jogos"), AND IT HAS NO SLASHED ZERO
const MSG_STAT_WEEKS = n => n === 0 ? "Nenhuma semana com partidas" : `${n} ${n === 1 ? "semana" : "semanas"} com partidas`;
const MSG_STAT_GAMES_VALUE = n => n === 0 ? "Nenhuma partida" : `${n} ${n === 1 ? "partida" : "partidas"}`;
const MSG_STAT_RATING = n => `${n}%`;
const MSG_STAT_HINT = "nos últimos 6 meses";
const MSG_XP_LEVEL = n => `Nível ${n}`;
const MSG_CROMO_DEBUT = date => `Estreia: ${date}`;
const MSG_LEVEL_REACHED = date => `Conquista: ${date}`;
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
const MSG_PROGRESS_RULES = `<b>Estilo de jogo:</b> mostra como tens jogado nos últimos 6 meses. <img src="images/icon_fire_color.svg" class="link-icon" alt="">Frequência, <img src="images/icon_repeat_color.svg" class="link-icon" alt="">Consistência e <img src="images/icon_globe_color.svg" class="link-icon" alt="">Território são medidos aqui. Cada um recebe uma nota de 0 a 100%.<br><br><b>Diamantes:</b> são as conquistas mais valiosas do Campo Livre: 100 partidas, ou 10 campos diferentes, ou jogar todas as semanas durante 6 meses, ou vencer uma <a href="#" data-pane-link="ranking">época</a>.<br><br><b>Caderneta:</b> ao longo da tua jornada no Campo Livre vais acumular cromos. Visita a caderneta quando ficares nostálgico.<br><br>Partidas com menos de 10 min não são registadas.`;
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

// THE ALBUM'S CARDS LEAN AS THE ROW SWIPES, CARTOON STYLE: THE LEGS (THE BOTTOM EDGE) GO WITH THE FINGER, THE LAZY BODY (THE
// TOP) LAGS BEHIND, THEN CATCHES UP — AND WHEN THE ROW STOPS IT SWINGS PAST UPRIGHT AND SWAYS BACK. THE SCROLL SPEED SETS HOW
// FAR THE CARDS SHOULD LEAN; AN UNDERDAMPED SPRING FOLLOWS IT, WHICH IS WHAT LAGS AND OVERSHOOTS. ONE --lean ON THE ROW, A
// skewX ON EACH CARD (CSS), transform ONLY. THE LOOP RUNS ONLY WHILE SOMETHING MOVES; NONE UNDER REDUCED MOTION
// DEGREES OF LEAN PER PX/ms OF SCROLL, AND THE MOST IT LEANS
const SWAY_PER_SPEED = 6;
const SWAY_MAX = 12;
const SWAY_STIFFNESS = 180;
const SWAY_DAMPING = 20;

function swayAlbum(row) {
	if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	let lean = 0, speed = 0, target = 0, lastScroll = row.scrollLeft, frame = null, last = 0;

	function step(time) {
		// CAPPED SO A BACKGROUND TAB COMING BACK DOESN'T FLING THE CARDS
		const dt = Math.min(time - last, 50);
		last = time;
		// SCROLLING RIGHT (CARDS MOVING LEFT) LEAVES THE TOPS BEHIND, TO THE RIGHT: A NEGATIVE skewX ABOUT THE BOTTOM EDGE.
		// SMOOTHED, SO ONE JUMPY FRAME DOESN'T JERK THE CARDS
		const scrolled = row.scrollLeft - lastScroll;
		lastScroll = row.scrollLeft;
		const wanted = Math.max(-SWAY_MAX, Math.min(SWAY_MAX, -scrolled / (dt || 16) * SWAY_PER_SPEED));
		target += (wanted - target) * 0.3;
		speed += (SWAY_STIFFNESS * (target - lean) - SWAY_DAMPING * speed) * dt / 1000;
		lean += speed * dt / 1000;
		row.style.setProperty("--lean", `${lean}deg`);
		const still = !scrolled && Math.abs(target) < 0.05 && Math.abs(lean) < 0.05 && Math.abs(speed) < 0.05;
		frame = still ? null : requestAnimationFrame(step);
	}

	row.addEventListener("scroll", () => {
		if (frame) return;
		last = performance.now();
		frame = requestAnimationFrame(step);
	}, { passive: true });
}

// THE CARD TILTS LIKE A REAL ONE: A PRESS PUSHES THAT SPOT AWAY, AND LETTING GO DROPS IT BACK ON A SPRING, SO IT WOBBLES
// AND SETTLES. EACH TIME IT COMES INTO VIEW IT GETS A FLICK, SO PLAYERS SEE IT MOVES. THE GLARE RIDES ON THE ANGLE.
// THE LOOP ONLY RUNS UNTIL THE CARD IS STILL
const TILT_MAX = 15;
const TILT_STIFFNESS = 120;
const TILT_DAMPING = 8;
const TILT_FLICK = 150;
// PX OF SHADOW PER DEGREE OF TILT: AT 15deg THE 4px SHADOW REACHES 10px, OR VANISHES
const TILT_SHADOW = 0.4;
// PX THE PIG SLIDES PER DEGREE OF TILT (THE PARALLAX): AT 15deg, 3px
const TILT_DEPTH = 0.2;

function tiltCard(card) {
	const axes = { x: { angle: 0, speed: 0, target: 0 }, y: { angle: 0, speed: 0, target: 0 } };
	let frame = null;
	let last = 0;

	function step(time) {
		// CAPPED SO A BACKGROUND TAB COMING BACK DOESN'T FLING THE CARD
		const dt = Math.min((time - last) / 1000, 0.05);
		last = time;
		for (const axis of Object.values(axes)) {
			axis.speed += (TILT_STIFFNESS * (axis.target - axis.angle) - TILT_DAMPING * axis.speed) * dt;
			axis.angle += axis.speed * dt;
		}
		const { x, y } = axes;
		card.style.transform = `perspective(800px) rotateX(${x.angle}deg) rotateY(${y.angle}deg)`;
		// THE SHADOW GROWS UNDER THE EDGE THAT LIFTS TOWARDS THE PLAYER AND SHRINKS UNDER THE ONE THAT SINKS, NEVER PAST 0 —
		// A SHADOW ON THE LIT SIDE WOULD MOVE THE LIGHT. box-shadow REPAINTS EVERY FRAME, BUT ONLY UNTIL THE CARD IS STILL
		card.style.boxShadow = `${Math.max(4 - y.angle * TILT_SHADOW, 0)}px ${Math.max(4 + x.angle * TILT_SHADOW, 0)}px 0 var(--black)`;
		// THE PIG STANDS IN FRONT OF THE CARD, SO IT SLIDES TOWARDS THE EDGE THAT SINKS
		card.style.setProperty("--pig-x", `${y.angle * TILT_DEPTH}px`);
		card.style.setProperty("--pig-y", `${-x.angle * TILT_DEPTH}px`);
		// HOW FAR AND HOW MUCH THE CARD IS TILTED, FOR THE HOLO: THE FOIL'S DRIFT AND THE FOIL'S AND SHINE'S STRENGTH
		// CAPPED AT ±60%: BOTH AXES TILTED THE SAME WAY (A PRESS NEAR THE TOP-RIGHT OR BOTTOM-LEFT CORNER) ADD UP TO TWICE THAT,
		// AND THE SPRING OVERSHOOTS — PAST IT THE FOIL SLID OFF ITS OWN TILES AND SHOWED THEIR SEAMS
		card.style.setProperty("--tilt-x", `${Math.max(-60, Math.min(60, -(x.angle + y.angle) / TILT_MAX * 60))}%`);
		card.style.setProperty("--tilt-o", Math.min(Math.hypot(x.angle, y.angle) / TILT_MAX, 1) * 0.4);
		// THE HOLO'S SHINE SITS ON THE PART OF THE CARD TILTED TOWARDS THE PLAYER — THE SAME EDGES THE SHADOW GROWS UNDER
		card.style.setProperty("--shine-x", `${50 - y.angle / TILT_MAX * 50}%`);
		card.style.setProperty("--shine-y", `${50 + x.angle / TILT_MAX * 50}%`);
		// THE SAME DIRECTION AS PLAIN NUMBERS (ABOUT −1 TO 1), WHICH opacity CAN USE: THE CROMO CARD'S SHARDS EACH CATCH THE LIGHT
		// TOWARDS THEIR OWN SIDE
		card.style.setProperty("--tilt-h", -y.angle / TILT_MAX);
		card.style.setProperty("--tilt-v", x.angle / TILT_MAX);
		const still = Object.values(axes).every(axis => Math.abs(axis.target - axis.angle) < 0.05 && Math.abs(axis.speed) < 0.05);
		frame = still ? null : requestAnimationFrame(step);
	}

	function wake() {
		if (frame) return;
		last = performance.now();
		frame = requestAnimationFrame(step);
	}

	function press(event) {
		const box = card.getBoundingClientRect();
		axes.x.target = (0.5 - (event.clientY - box.top) / box.height) * 2 * TILT_MAX;
		axes.y.target = ((event.clientX - box.left) / box.width - 0.5) * 2 * TILT_MAX;
		wake();
	}

	function release() {
		axes.x.target = 0;
		axes.y.target = 0;
		wake();
	}

	card.addEventListener("pointerdown", event => {
		card.setPointerCapture(event.pointerId);
		press(event);
	});
	card.addEventListener("pointermove", event => {
		if (card.hasPointerCapture(event.pointerId)) press(event);
	});
	card.addEventListener("pointerup", release);
	card.addEventListener("pointercancel", release);

	if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	new IntersectionObserver(entries => {
		if (!entries[0].isIntersecting) return;
		axes.y.speed += TILT_FLICK;
		wake();
	}, { threshold: 0.5 }).observe(card);
}

// THE TRADING CARD (THINK MAGIC / POKÉMON): LEVEL IN THE BANNER, PLAYER ART, CHARACTER NAME AND FLAVOUR TEXT,
// THE THREE STAT RATINGS, THEN THE XP BAR. A teaser MAKES IT THE VISITOR'S LOCKED PREVIEW: THE FILL
// GROWING IN (.locked), AND THE TEASER UNDER THE BAR
function xpCard(xp, diamonds, stats, teaser) {
	const { level, fill } = xpLevel(xp);
	const index = level - 1;
	return `
		<div class="trading-card${teaser ? " locked" : ""}${level === XP_FLASH_LEVEL ? " flash" : ""}">
			<p class="trading-card-level">${MSG_XP_LEVEL(index + 1)}<span>${DIAMOND_ICON} ${diamonds}</span></p>
			${levelCharacter(index, level === XP_FLASH_LEVEL ? `<img src="images/${XP_FLASH_IMAGE}.svg" alt="">` : "")}
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

// A LEVEL'S CHARACTER: ITS ART (BACKGROUND AND PIG; extra GOES INSIDE THE ART, LIKE THE LEVEL-3 FLASH'S SECOND IMAGE), NAME
// AND FLAVOUR TEXT — SHARED BY THE CURRENT CARD AND THE COLLECTED LEVEL CARDS. proxy IS THE ALBUM'S VERSION: THE BACKGROUND'S
// FROZEN COPY (bg_*_still.svg: THE SAME FILE WITH ITS ANIMATIONS SWITCHED OFF — PAGE CSS CAN'T REACH INSIDE AN SVG USED AS AN
// IMAGE), SINCE PROXIES NEVER ANIMATE, AND NO FLAVOUR TEXT — UNREADABLE AT THAT SIZE, AND IT LEFT THE PIG NO ROOM; BEHELD, THE
// CARD HAS IT. A NEW BACKGROUND NEEDS ITS _still COPY
function levelCharacter(index, extra = "", proxy = false) {
	const info = XP_LEVEL_INFO[index];
	return `
		<div class="trading-card-art">
			<div class="trading-card-frame"${XP_LEVEL_BACKGROUNDS[index] ? ` style="background-image: url('images/${XP_LEVEL_BACKGROUNDS[index]}${proxy ? "_still" : ""}.svg')"` : ""}></div>
			<img src="images/${XP_LEVEL_IMAGES[index]}.svg" alt="">
			${extra}
		</div>
		<p class="trading-card-name">${info.title}</p>
		${proxy ? "" : `<p class="trading-card-text">${info.description}</p>`}
	`;
}

// A COLLECTED LEVEL CARD: THE LEVEL AND ITS CHARACTER, FROZEN AT THE DAY IT WAS REACHED (collected_cards) — NO STATS, NO XP BAR,
// THOSE STAY ON THE LIVE CURRENT CARD. ALREADY LIGHT (PLAIN IMAGES), SO THE SAME MARKUP IS ITS OWN PROXY IN THE ALBUM —
// WITH proxy, ITS BACKGROUND STILL AND NO FLAVOUR TEXT OR DATE — THE LEVEL, THE PIG AND THE NAME ARE WHAT READS THAT SMALL;
// BEHELD, LIVE AND WHOLE.
// NO collectedAt: THE LOCKED LEVEL-1 TEASER FOR VISITORS AND PLAYERS WHO LEFT THE ONBOARDING HALFWAY, DATED 30/02
function levelCard(level, collectedAt, proxy = false) {
	return `
		<div class="trading-card collected${collectedAt ? "" : " locked"}" data-behold>
			<p class="trading-card-level">${MSG_XP_LEVEL(level)}</p>
			${levelCharacter(level - 1, "", proxy)}
			${proxy ? "" : `<p class="trading-card-text">${MSG_LEVEL_REACHED(collectedAt ? new Date(collectedAt).toLocaleDateString("pt-PT") : "30/02")}</p>`}
		</div>
	`;
}

// THE CROMO CARD, GIVEN FOR FINISHING ONBOARDING: THE DRAWN CARD (images/card_cromo.svg), HOLO, WITH THE PLAYER'S NAME IN
// "R. BARBOSA" FORM AND THE DEBUT DATE (onboarded_at) IN ITS EMPTY #textarea.
// INLINED, NOT AN <img>, SO ITS #pig GROUP CAN TAKE THE TILT'S PARALLAX. THE EXPORT'S CLASSES AND IDS ARE GENERIC (cls-1,
// clippath…) AND ITS <style> IS GLOBAL ONCE INLINED, SO THEY'RE PREFIXED TO KEEP OFF OTHER INLINE SVGs
async function cromoCard(name, debut) {
	const svg = (await (await fetch("images/card_cromo.svg")).text())
		.replace(/<\?xml[^>]*>/, "")
		.replace(/cls-/g, "cromo-cls-")
		.replace(/id="/g, 'id="cromo-')
		.replace(/url\(#/g, "url(#cromo-");
	return `
		<div class="trading-card collected cromo holo">
			${svg}
			${cromoText(name, debut)}
			<div class="trading-card-holo"></div>
		</div>
	`;
}

// THE NAME AND DEBUT DATE, OVER THE DRAWING'S #textarea — SHARED BY THE FULL CARD AND ITS PROXY
function cromoText(name, debut) {
	return `
		<div class="cromo-text">
			<p class="trading-card-name">${shortName(name)}</p>
			<p class="trading-card-text">${MSG_CROMO_DEBUT(new Date(debut).toLocaleDateString("pt-PT"))}</p>
		</div>
	`;
}

// THE CROMO CARD'S PROXY IN THE ALBUM: THE DRAWING AS A PLAIN <img> (LOADED ONCE, REUSED) WITH THE SAME TEXT, AND NO
// HOLO, TILT OR PARALLAX — A PAGE OF LIVE HOLO CARDS, EACH AN INLINED DRAWING, WOULD WEIGH ON THE PROFILE. TAPPING IT
// BEHOLDS THE FULL CARD (beholdCard)
function cromoProxy(name, debut) {
	return `
		<div class="trading-card collected cromo" data-behold>
			<img src="images/card_cromo.svg" alt="">
			${cromoText(name, debut)}
		</div>
	`;
}

// THE CLOUD BANK OVER THE BEHELD CROMO CARD: THE DRAWN CLOUDS (images/cloud26–30.svg) IN TWO SIDES THAT PART — THREE ON THE LEFT,
// TWO ON THE RIGHT, AT DIFFERENT HEIGHTS AND SIZES SO THEY READ AS A BANK. PLACED AND MOVED IN CSS (.behold-clouds)
const BEHOLD_CLOUDS = [[26, 29, 27], [28, 30]]
	.map(side => `<div>${side.map(n => `<img src="images/cloud${n}.svg" alt="">`).join("")}</div>`).join("");

// TAP TO BEHOLD: THE FULL CARD — HOLO, TILT, PARALLAX — LIFTED INTO THE MIDDLE OF THE SCREEN ON A SCENE OF ITS OWN, THE SAME
// CENTRED LAYOUT AND LIFT AS THE ONBOARDING'S REVEAL, WITHOUT THE PARCEL. ONLY "FECHAR" PUTS IT AWAY — A TAP OFF THE CARD
// CLOSED IT BY MISTAKE MID-TILT.
// heavenly (THE CROMO CARD): A BANK OF CLOUDS MEETS AT THE TOP OF THE SCREEN AND PARTS, THEN THE CARD RISES INTO THE GAP AND
// THE CLOUDS DRIFT. CSS DOES THE MOTION (.heavenly, .behold-clouds)
function beholdCard(card, heavenly = false) {
	const layer = document.createElement("div");
	layer.className = `reveal-scene centered opened${heavenly ? " heavenly" : ""}`;
	layer.innerHTML = `
		${heavenly ? `<div class="behold-clouds">${BEHOLD_CLOUDS}</div>` : ""}
		<div class="reveal-stage"><div class="prize-lift"><div class="prize-bob">${card}</div></div></div>
		<a href="#" data-action="behold-close" class="info-link">Fechar</a>
	`;
	document.body.appendChild(layer);
	tiltCard(layer.querySelector(".trading-card"));
	layer.querySelector('[data-action="behold-close"]').addEventListener("click", e => {
		e.preventDefault();
		layer.remove();
	});
}

// DEBUG (DEV SERVER ONLY, IS_DEV): ?level=N ON profile.html DRAWS THE TRADING CARD AT LEVEL N (1–10), HALFWAY THROUGH IT —
// ITS PIG, CHARACTER, BACKGROUND AND XP. ONLY THE XP IS FAKED, NOTHING IS SAVED; THE STATS STAY THE PLAYER'S OWN
// profile.html#album OPENS ON THE ALBUM. READ AS THE PAGE LOADS: THE FOLDER TABS (profile.js) CLEAR THE HASH BEFORE THE
// ALBUM IS DRAWN
const OPEN_ON_ALBUM = location.hash === "#album";

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
// A teaser MAKES THIS THE LOCKED PREVIEW (VISITORS, PLAYERS WITH NO GAMES YET): IT PINS EVERY RATING AND THE STAT CARDS'
// COUNTS AT 0 — AN EMPTY STARTING POINT RATHER THAN THE DUMMY FIRST GAME'S REAL VALUES. THE XP STILL COMES FROM THAT GAME
// xpPromise IS THE TRADING CARD'S TOTAL: THE GAMES' XP PLUS +3000 PER PASS EVER AWARDED, AS player_xp COUNTS IT
// THE STATS AND DIAMONDS FROM A PLAYER'S GAMES ({ start, courtId }). SHARED BY THE PROGRESS TAB AND THE ONBOARDING'S CARD REVEAL.
// ALL THREE STATS SHARE ONE ROLLING 6-MONTH WINDOW — NOT A CALENDAR PERIOD, SO NOTHING RESETS TO ZERO ON A FIXED DATE
function gameStats(games) {
	const now = new Date();
	const recentStart = new Date(now);
	recentStart.setMonth(recentStart.getMonth() - 6);
	const past = games.filter(game => new Date(game.start) < now);
	const recent = past.filter(game => new Date(game.start) >= recentStart);
	return {
		gamesRecent: recent.length,
		// WEEKS WITH A GAME, NOT A STREAK: ONE MISSED WEEK DOESN'T WIPE IT OUT. THE STREAK ONLY PAYS XP AND THE INQUEBRÁVEL DIAMOND
		weeks: new Set(recent.map(game => weekStart(game.start))).size,
		courts: new Set(recent.map(game => game.courtId)).size,
		// LIFETIME FEATS, KEPT FOREVER. KEYED BY STAT SO EACH SHOWS ON ITS CARD
		diamonds: {
			games: past.length >= DIAMOND_GAMES,
			weeks: longestStreak(past) >= DIAMOND_STREAK,
			courts: new Set(past.map(game => game.courtId)).size >= DIAMOND_COURTS,
		},
	};
}

// THE TRADING CARD FOR THESE GAMES AND THIS XP. A teaser PINS THE RATINGS AT 0 (SEE loadProgress)
function tradingCard(xp, stats, teaser) {
	const rating = (max, value) => teaser ? 0 : Math.round(statRating(max, value));
	return xpCard(xp, Object.values(stats.diamonds).filter(Boolean).length, [
		{ icon: "fire_color", rating: rating(STAT_GAMES, stats.gamesRecent) },
		{ icon: "repeat_color", rating: rating(STAT_WEEKS, stats.weeks) },
		{ icon: "globe_color", rating: rating(STAT_TERRITORY, stats.courts) },
	], teaser);
}

// album ({ name, debut, cards: a promise of the collected_cards rows }) FILLS THE ALBUM, AFTER THE STAT CARDS; WITHOUT IT
// (VISITORS, PLAYERS WHO LEFT THE ONBOARDING HALFWAY) THE ALBUM HOLDS THE LEVEL-1 TEASER, LIKE THE TRADING CARD'S
async function loadProgress(container, gamesPromise, teaserPromise, xpPromise, album = {}) {
	const games = await gamesPromise;
	const teaser = await teaserPromise;
	const xp = DEBUG_LEVEL ? debugLevelXp(DEBUG_LEVEL) : await xpPromise;
	const stats = gameStats(games);
	const { gamesRecent, weeks, courts, diamonds } = stats;

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
		tradingCard(xp, stats, teaser),
		statCard("fire_color", "Frequência", STAT_GAMES, gamesRecent, MSG_STAT_GAMES_VALUE(shown(gamesRecent)), diamonds.games),
		statCard("repeat_color", "Consistência", STAT_WEEKS, weeks, MSG_STAT_WEEKS(shown(weeks)), diamonds.weeks),
		statCard("globe_color", MSG_TITLE_TERRITORY, STAT_TERRITORY, courts, MSG_STAT_COURTS(shown(courts)), diamonds.courts),
	].join("");
	tiltCard(container.querySelector(".trading-card"));
	const flashCard = container.querySelector(".trading-card.flash");
	flashCard?.addEventListener("animationstart", () => aimCameraFlash(flashCard));
	// THE ALBUM: THE PLAYER'S COLLECTED CARDS AS PROXIES IN ONE ROW, NEWEST ON THE LEFT, OLDER TO THE RIGHT — ONE SEQUENCE, NO
	// SECTIONS: A CARD PER LEVEL REACHED, BACK TO THE CROMO CARD. WITHOUT AN ALBUM (VISITORS, QUITTERS), THE LEVEL-1 TEASER. THE
	// ROW SWIPES SIDEWAYS AND STARTS ON AN EMPTY SLOT (THE CARD'S DASHED OUTLINE), THE NEXT CARD TO COME, SO EVEN A SHORT ROW
	// SAYS MORE IS COMING — AND IT OPENS ON WHAT CHANGED, NO SCROLLING. A TAP ON A CARD BEHOLDS THE FULL CARD
	const cards = (album.name ? [{ kind: "cromo" }, ...await album.cards] : [{ kind: "level", ref: "1" }]).reverse();
	container.insertAdjacentHTML("beforeend", `
		<p class="info-heading margin-top-40">Caderneta</p>
		<div class="album">
			<div class="album-slot"></div>
			${cards.map(card => card.kind === "cromo" ? cromoProxy(album.name, album.debut) : levelCard(+card.ref, card.collected_at, true)).join("")}
		</div>
	`);
	const row = container.querySelector(".album");
	row.querySelectorAll("[data-behold]").forEach((proxy, i) => proxy.addEventListener("click", async () => {
		const card = cards[i];
		// THE CROMO CARD, THE RAREST, BEHELD WITH THE FANFARE (utils.js) — PRIMED ON THE TAP ITSELF, BEFORE THE DRAWING LOADS,
		// SO SAFARI LETS IT PLAY LATER — HALF A SECOND MORE THAN USUAL (0.8s), AS THE CLOUDS PART, JUST BEFORE THE CARD RISES (styles.css)
		if (card.kind === "cromo") {
			primeFanfare();
			playFanfare(500);
		}
		if (card.kind === "cromo") beholdCard(await cromoCard(album.name, album.debut), true);
		else beholdCard(levelCard(+card.ref, card.collected_at));
	}));
	swayAlbum(row);
	// "COLAR CROMO NA CADERNETA" (THE ONBOARDING'S REVEAL) LANDS HERE: SCROLLED TO THE ALBUM, THEN THE HASH GOES SO A RELOAD
	// STARTS AT THE TOP. ONCE THE PAGE HAS LOADED: THE CARD'S PICTURES ABOVE, STILL LOADING, WOULD PUSH THE ALBUM DOWN AFTER
	if (OPEN_ON_ALBUM) {
		history.replaceState(null, "", location.pathname + location.search);
		const toAlbum = () => row.previousElementSibling.scrollIntoView({ behavior: "smooth", block: "start" });
		if (document.readyState === "complete") toAlbum();
		else addEventListener("load", toAlbum, { once: true });
	}
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
	// OUTSIDE THE PROFILE (info.html SHOWS THESE CARDS TOO) THERE ARE NO TABS, SO THE LINK GOES TO THAT TAB ON THE PROFILE
	card.querySelectorAll("[data-pane-link]").forEach(link => link.addEventListener("click", event => {
		event.preventDefault();
		const tab = document.querySelector(`.folder-tab[data-pane="${link.dataset.paneLink}"]`);
		if (tab) tab.click();
		else location.href = `profile.html#${link.dataset.paneLink}`;
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
