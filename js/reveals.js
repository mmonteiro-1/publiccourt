// SURPRISES: RARE, IMPORTANT MOMENTS PLAYED ONCE — A SCENE OF THEIR OWN, SEALED UNDER THE TEAR-STRIP PARCEL (tear-reveal.js).
// THE SCENE IS A FULL-SCREEN LAYER, NEVER THE PAGE UNDERNEATH, SO A SURPRISE CAN PLAY ON ANY PAGE. ONE PRESET PER KIND IN
// REVEALS, LIKE SUCCESS IN success.js. "PLAYED ONCE" LIVES IN revealed_surprises (kind + ref), WRITTEN ONLY AFTER THE STRIP
// IS TORN, SO A PARCEL LEFT UNOPENED WAITS FOR THE NEXT VISIT. SEE "SURPRISES" IN CLAUDE.md.
// NEEDS config.js, utils.js, tear-reveal.js AND pass-card.js LOADED FIRST; RUNS ITS OWN CHECK ON LOAD

const MSG_REVEAL_PASS_HEADER = "O teu passe foi aprovado";

// THE PIG'S HAND HOLDING A PRIZE: THE HAND BEHIND IT, THE THUMB IN FRONT — TWO HALVES OF ONE DRAWING, AND THE ORDER IN THE PAGE IS
// THE LAYERING, SO NO z-index. BUMP ?v= WHENEVER pig_hand.svg CHANGES — BROWSERS CACHE IT HARD
const liftedPrize = prize => `
	<div class="prize-lift">
		<div class="prize-bob">
			<svg class="prize-arm" viewBox="0 0 1527 3291" aria-hidden="true"><use href="images/pig_hand.svg?v=3#hand"/></svg>
			${prize}
			<svg class="prize-arm" viewBox="0 0 1527 3291" aria-hidden="true"><use href="images/pig_hand.svg?v=3#thumb"/></svg>
		</div>
	</div>
`;

const REVEALS = {
	// THE END OF THE ONBOARDING: THE CROMO CARD RISES ON ITS OWN WITH THE PEANUTS. NOTHING TO GO BACK TO, SO NO "PRA JÁ NÃO":
	// A BUTTON UNDER THE CARD COLLECTS IT AND GOES ON TO THE PROFILE, WHERE THE CARD LIVES
	onboarded: ({ card }) => ({
		kind: "onboarded",
		ref: "1",
		text: "",
		prize: `<div class="prize-lift"><div class="prize-bob">${card}</div></div>`,
		next: null,
		exit: { label: "Colar cromo na caderneta", icon: "icon_hand_rock", href: "profile.html#album", button: true },
		// NO TEXT AND NO HAND RUNNING OFF THE BOTTOM: THE CARD AND ITS BUTTON SIT IN THE MIDDLE OF THE SCREEN
		centered: true,
		// THE SAME HEAVEN AS BEHOLDING THE CROMO CARD IN THE ALBUM (beholdCard): THE CLOUDS PART, THE CARD ASCENDS — FROM THE BURST
		heavenly: true,
	}),
	// THE PIG LIFTS THE PASS TICKET — EXACTLY AS THE PROFILE DRAWS IT — LIKE A CHAMPION. A PRESET GIVES ITS text AND ITS prize
	// SEPARATELY; showReveal LAYS THEM OUT (TEXT, THEN THE NEXT-STEP BUTTON, THEN THE PRIZE)
	passApproved: ({ passId, card, courtId }) => ({
		kind: "pass_approved",
		ref: passId,
		text: `
			<p class="info-heading">${MSG_REVEAL_PASS_HEADER}</p>
		`,
		prize: liftedPrize(passCard(card)),
		// TO THE GROUP'S FIRST COURT, WHERE THE NEW MEMBER CAN BOOK RIGHT AWAY; NO BUTTON IF THE GROUP HAS NO ACTIVE COURT
		next: courtId ? { label: "Reserva o teu primeiro jogo", icon: "icon_court", href: `court?court=${courtId}` } : null,
	}),
};

// HOW LONG THE PARCEL TAKES TO SLIDE IN WITH push — parcel-in / page-out IN styles.css, DELAY INCLUDED
const PARCEL_ARRIVE_MS = 2200;

// record: false IS FOR debugSurprise — PLAYS THE SAME, WRITES NOTHING
// TEXT AND THE NEXT STEP UP TOP, THE PRIZE BELOW THEM — THE LOWER PART OF THE SCREEN IS LEFT FOR THE PRIZE AND THE HAND
// exit TURNS "PRA JÁ NÃO" INTO A LINK ON, FOR A SCENE WITH NOTHING BEHIND IT TO GO BACK TO — OR, WITH button, INTO A BUTTON
// UNDER THE PRIZE
// push SLIDES THE PARCEL IN FROM THE RIGHT, PUSHING THE PAGE OUT TO THE LEFT (THE ONBOARDING'S LAST STEP), INSTEAD OF A CUT.
// .parcel-arriving ON body RUNS IT (CSS) AND KEEPS THE STRIP FROM BEING GRABBED UNTIL THE BOX HAS STOPPED
function showReveal({ kind, ref, text, prize, next, exit = null, centered = false, heavenly = false }, { record = true, push = false } = {}) {
	if (push && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
		document.body.classList.add("parcel-arriving");
		setTimeout(() => document.body.classList.remove("parcel-arriving"), PARCEL_ARRIVE_MS);
	}
	const layer = document.createElement("div");
	layer.className = `reveal-scene${centered ? " centered" : ""}${heavenly ? " heavenly" : ""}`;
	layer.innerHTML = `
		${heavenly ? `<div class="behold-clouds">${BEHOLD_CLOUDS}</div>` : ""}
		<div class="reveal-stage">${text}</div>
		${next ? `<button data-action="reveal-next" class="margin-top-10"><img src="images/${next.icon}.svg" class="link-icon" alt="">${next.label}</button>` : ""}
		<div class="reveal-stage margin-top-30">${prize}</div>
		${exit?.button ? `<button data-action="reveal-exit" class="margin-top-30"><img src="images/${exit.icon}.svg" class="link-icon" alt="">${exit.label}</button>`
			: exit ? `<a href="${exit.href}" class="info-link">${exit.label}</a>`
			: `<a href="#" data-action="reveal-close" class="info-link">Pra já não</a>`}
	`;
	document.body.appendChild(layer);
	// A LIFTED PRIZE STARTS JUST OUT OF SIGHT — ITS TOP EDGE ON THE SCREEN'S BOTTOM EDGE — SO IT ENTERS THE MOMENT IT MOVES.
	// A FIXED 100vh LEFT THE SLOW START OF THE EASE-IN PLAYING BELOW THE SCREEN, WHERE NOBODY SEES IT. MEASURED ON THE PRIZE
	// ITSELF, SO ANY OFFSET GIVEN TO IT COUNTS: offsetTop IGNORES TRANSFORMS BUT INCLUDES A top ON A position: relative;
	// .prize-bob's offsetTop COUNTS FROM THE FIXED SCENE, I.E. FROM THE TOP OF THE SCREEN
	const lift = layer.querySelector(".prize-lift");
	if (lift) {
		const bob = lift.querySelector(".prize-bob");
		const prize = bob.querySelector(":scope > :not(.prize-arm)");
		lift.style.setProperty("--lift-from", `${innerHeight - (bob.offsetTop + prize.offsetTop)}px`);
	}
	layer.querySelector('[data-action="reveal-next"]')?.addEventListener("click", () => { location.href = next.href; });
	layer.querySelector('[data-action="reveal-exit"]')?.addEventListener("click", () => { location.href = exit.href; });
	layer.querySelector('[data-action="reveal-close"]')?.addEventListener("click", e => {
		e.preventDefault();
		layer.remove();
	});

	// AWAITED: A SUPABASE QUERY ONLY GOES OUT WHEN SOMETHING WAITS FOR IT — A BARE .insert() IS NEVER SENT
	// .opened STARTS THE SCENE'S MOTION THE INSTANT THE BOX BURSTS — BUILT UNDER THE SEALED PARCEL, IT WOULD OTHERWISE HAVE BEEN
	// PLAYING FOR AS LONG AS THE PLAYER TOOK TO TEAR THE STRIP. THE SCENE'S OWN CSS DELAYS TIME EACH BEAT FROM THAT MOMENT
	// THE FANFARE (utils.js) PLAYS AT THE BURST; THE FIRST TOUCH ON THE PARCEL PRIMES IT, OR SAFARI WOULD BLOCK A SOUND THAT
	// STARTS AFTER THE FINGER HAS LET GO
	addEventListener("pointerdown", primeFanfare, { once: true, capture: true });
	showTearReveal({
		onBurst: () => {
			layer.classList.add("opened");
			rainPeanuts(layer);
			// IN THE HEAVEN, AS LATE AS ON THE ALBUM'S BEHOLD: THE CLOUDS PART FIRST
			playFanfare(heavenly ? 500 : 0);
		},
		onDone: async () => { if (record) await db.from("revealed_surprises").insert({ kind, ref }); },
	});
}

// THE LAST OF THE PACKING: ONCE THE HAND IS UP AND THE BURST HAS CLEARED (1s), PEANUTS FALL FROM ABOVE THE SCREEN TO BELOW IT —
// THE SAME PEANUT AS THE BURST (.tear-peanut). TWO LAYERS FOR DEPTH: 60 SMALL ONES BEHIND THE PRIZE, 20 BIG ONES IN FRONT OF IT.
// EASED IN LIKE GRAVITY, STAGGERED SO THEY DON'T LAND AS A ROW. fill: "both" KEEPS EACH ONE ABOVE THE SCREEN DURING ITS DELAY;
// EACH IS REMOVED ONCE IT HAS FALLEN OUT OF SIGHT
function rainPeanuts(layer) {
	if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	const rand = (min, max) => min + Math.random() * (max - min);
	const drop = (count, minScale, maxScale, where) => {
		const rain = layer.appendChild(document.createElement("div"));
		rain.className = `reveal-rain ${where}`;
		for (let i = 0; i < count; i++) {
			const peanut = rain.appendChild(document.createElement("div"));
			peanut.className = "tear-peanut";
			// ONE PER SLICE OF THE WIDTH, JITTERED, SO THEY SPREAD ACROSS THE SCREEN INSTEAD OF CLUMPING
			peanut.style.left = `${(i + rand(0, 1)) * innerWidth / count}px`;
			const scale = rand(minScale, maxScale), turn = rand(0, 180);
			const at = (y, spin) => `translate(-50%, ${y}px) rotate(${turn + spin}deg) scale(${scale})`;
			peanut.animate(
				[{ transform: at(-100, 0) }, { transform: at(innerHeight + 100, rand(-180, 180)) }],
				{ duration: rand(1200, 1800), delay: 1000 + rand(0, 600), easing: "cubic-bezier(0.4, 0, 0.8, 0.6)", fill: "both" },
			).finished.then(() => peanut.remove());
		}
	};
	drop(60, 0.3, 0.5, "behind");
	drop(20, 0.8, 1, "in-front");
}

// DEBUG (DEV SERVER ONLY, IS_DEV): PLAYS A SURPRISE WITH DUMMY DATA, ON DEMAND — ADD ?surprise TO ANY PAGE THAT LOADS THIS FILE (?surprise=passApproved
// TO PICK ONE), OR CALL debugSurprise() FROM THE CONSOLE. NEVER RECORDED, SO IT REPLAYS EVERY TIME AND REAL SURPRISES STAY
// UNTOUCHED. DUMMY DATES ARE 30/02, A DAY THAT DOESN'T EXIST. "Reserva o teu primeiro jogo" GOES TO THE FIRST BOOKABLE COURT, SO THE NEXT
// STEP CAN BE TRIED TOO
const DEBUG_SURPRISES = {
	passApproved: async () => {
		const { data: court } = await db.from("courts").select("id").eq("bookable", true).eq("active", true).order("id").limit(1).maybeSingle();
		return REVEALS.passApproved({
			passId: "debug",
			courtId: court?.id,
			card: { name: "Campo de teste", since: "30/02", expires: null, nextGame: null, bookings: 0 },
		});
	},
	// THE ONBOARDING'S CROMO CARD WITHOUT A LOGIN: ONLY ON PAGES THAT LOAD player_progress.js (PROFILE, ONBOARDING).
	// THE DUMMY DEBUT IS A REAL DATE: 30/02 WOULD ROLL OVER TO MARCH IN new Date
	onboarded: async () => REVEALS.onboarded({ card: await cromoCard("Rafael Barbosa", new Date().toISOString()) }),
};

async function debugSurprise(kind = "passApproved") {
	if (!IS_DEV) return;
	showReveal(await DEBUG_SURPRISES[kind](), { record: false });
	const card = document.querySelector(".reveal-scene .trading-card");
	if (card && typeof tiltCard === "function") tiltCard(card);
}

// ON EVERY PAGE LOAD: THE NEWEST APPROVED PASS THIS PLAYER HASN'T TORN OPEN YET. ONE SMALL QUERY PAIR — NO REALTIME, THERE
// ARE NO PUSH NOTIFICATIONS AND PLAYERS RARELY WATCH THE MOMENT AN ADMIN ACTS
async function checkSurprises() {
	const { data: { session } } = await db.auth.getSession();
	if (!session) return;
	const playerId = session.user.id;

	const [{ data: passes }, { data: seen }] = await Promise.all([
		db.from("passes").select("id, group_id, approved_at, expires_at")
			.eq("player_id", playerId).eq("status", "approved").not("group_id", "is", null)
			.order("approved_at", { ascending: false }),
		db.from("revealed_surprises").select("ref").eq("kind", "pass_approved"),
	]);
	const seenRefs = new Set((seen ?? []).map(row => row.ref));
	const pass = (passes ?? []).find(p => !seenRefs.has(p.id));
	if (!pass) return;

	const [{ data: group }, { data: courts }, { data: bookings }] = await Promise.all([
		db.from("court_groups").select("name").eq("id", pass.group_id).maybeSingle(),
		db.from("courts").select("id, name").eq("group_id", pass.group_id).eq("active", true).order("group_position"),
		db.from("bookings").select("start_at, end_at").eq("player_id", playerId).eq("group_id", pass.group_id).eq("status", "confirmed").order("start_at"),
	]);
	const date = ts => new Date(ts).toLocaleDateString("pt-PT");
	const nextBooking = (bookings ?? []).find(b => new Date(b.start_at) > new Date());

	showReveal(REVEALS.passApproved({
		passId: pass.id,
		courtId: courts?.[0]?.id,
		card: {
			// MOST GROUPS HAVE NO name IN THE DB YET, SO THEIR COURTS STAND IN FOR IT — SAME AS THE PASSES VIEW
			name: group?.name || (courts ?? []).map(c => c.name).join(", "),
			since: pass.approved_at ? date(pass.approved_at) : "—",
			expires: pass.expires_at ? date(pass.expires_at) : null,
			nextGame: nextBooking ? gameLabel(nextBooking.start_at, nextBooking.end_at) : null,
			bookings: (bookings ?? []).length,
		},
	}));
}

// profile.html IS ALSO THE POST-LOGIN ROUTER, SO IT CHECKS ONLY ONCE IT SHOWS THE PROFILE (showProfile) — CHECKING ON LOAD
// FLASHED THE PARCEL JUST BEFORE THE REDIRECT TO THE COURT LIST, WHERE IT PLAYED AGAIN. THE ONBOARDING NEVER CHECKS: IT LOADS
// THIS FILE ONLY FOR ITS OWN CARD REVEAL
const debugKind = IS_DEV ? new URLSearchParams(location.search).get("surprise") : null;
// ONCE EVERY SCRIPT HAS RUN: SOME DEBUG SURPRISES DRAW WITH FILES LOADED AFTER THIS ONE (cromoCard, player_progress.js)
if (debugKind !== null) addEventListener("DOMContentLoaded", () => debugSurprise(debugKind || undefined));
else if (!document.body.matches(".page-profile, .page-onboarding")) checkSurprises();
