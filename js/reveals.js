// SURPRISES: RARE, IMPORTANT MOMENTS PLAYED ONCE — A SCENE OF THEIR OWN, SEALED UNDER THE TEAR-STRIP PARCEL (tear-reveal.js).
// THE SCENE IS A FULL-SCREEN LAYER, NEVER THE PAGE UNDERNEATH, SO A SURPRISE CAN PLAY ON ANY PAGE. ONE PRESET PER KIND IN
// REVEALS, LIKE SUCCESS IN success.js. "PLAYED ONCE" LIVES IN revealed_surprises (kind + ref), WRITTEN ONLY AFTER THE STRIP
// IS TORN, SO A PARCEL LEFT UNOPENED WAITS FOR THE NEXT VISIT. SEE "SURPRISES" IN CLAUDE.md.
// NEEDS config.js, utils.js, tear-reveal.js AND pass-card.js LOADED FIRST; RUNS ITS OWN CHECK ON LOAD

const MSG_REVEAL_PASS_HEADER = "Passe aprovado";
const MSG_REVEAL_PASS_SUB = "Já és membro. Bora jogar?";

const REVEALS = {
	// THE PIG LIFTS THE PASS TICKET — EXACTLY AS THE PROFILE DRAWS IT — LIKE A CHAMPION. A PRESET GIVES ITS text AND ITS prize
	// SEPARATELY; showReveal LAYS THEM OUT (TEXT, THEN THE NEXT-STEP BUTTON, THEN THE PRIZE)
	passApproved: ({ passId, card, courtId }) => ({
		kind: "pass_approved",
		ref: passId,
		text: `
			<p class="info-heading">${MSG_REVEAL_PASS_HEADER}</p>
			<p class="info-sub1 margin-top-10">${MSG_REVEAL_PASS_SUB}</p>
		`,
		prize: `
			<div class="prize-lift">
				<div class="prize-bob">
					<!-- THE PRIZE SITS BETWEEN THE TWO HALVES OF ONE DRAWING: THE HAND BEHIND IT, THE THUMB IN FRONT. THE ORDER IN THE
					     PAGE IS THE LAYERING, SO NO z-index -->
					<svg class="prize-arm" viewBox="0 0 1527 3291" aria-hidden="true"><use href="images/pig_hand.svg#hand"/></svg>
					${passCard(card)}
					<svg class="prize-arm" viewBox="0 0 1527 3291" aria-hidden="true"><use href="images/pig_hand.svg#thumb"/></svg>
				</div>
			</div>
		`,
		// "Reservar agora" IS HIDDEN FOR NOW; TO BRING IT BACK: courtId ? { label: "Reservar agora", href: `court?court=${courtId}` } : null
		next: null,
	}),
};

// record: false IS FOR debugSurprise — PLAYS THE SAME, WRITES NOTHING
// TEXT AND THE NEXT STEP UP TOP, THE PRIZE BELOW THEM — THE LOWER PART OF THE SCREEN IS LEFT FOR THE PRIZE AND THE HAND
function showReveal({ kind, ref, text, prize, next }, { record = true } = {}) {
	const layer = document.createElement("div");
	layer.className = "reveal-scene";
	layer.innerHTML = `
		<div class="reveal-stage">${text}</div>
		${next ? `<button data-action="reveal-next" class="margin-top-20">${next.label}</button>` : ""}
		<div class="reveal-stage margin-top-20">${prize}</div>
		<a href="#" data-action="reveal-close" class="info-link">Agora não</a>
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
	layer.querySelector('[data-action="reveal-close"]').addEventListener("click", e => {
		e.preventDefault();
		layer.remove();
	});

	// AWAITED: A SUPABASE QUERY ONLY GOES OUT WHEN SOMETHING WAITS FOR IT — A BARE .insert() IS NEVER SENT
	// .opened STARTS THE SCENE'S MOTION THE INSTANT THE BOX BURSTS — BUILT UNDER THE SEALED PARCEL, IT WOULD OTHERWISE HAVE BEEN
	// PLAYING FOR AS LONG AS THE PLAYER TOOK TO TEAR THE STRIP. THE SCENE'S OWN CSS DELAYS TIME EACH BEAT FROM THAT MOMENT
	showTearReveal({
		onBurst: () => layer.classList.add("opened"),
		onDone: async () => { if (record) await db.from("revealed_surprises").insert({ kind, ref }); },
	});
}

// DEBUG: PLAYS A SURPRISE WITH DUMMY DATA, ON DEMAND — ADD ?surprise TO ANY PAGE THAT LOADS THIS FILE (?surprise=passApproved
// TO PICK ONE), OR CALL debugSurprise() FROM THE CONSOLE. NEVER RECORDED, SO IT REPLAYS EVERY TIME AND REAL SURPRISES STAY
// UNTOUCHED. DUMMY DATES ARE 30/02, A DAY THAT DOESN'T EXIST. "Reservar agora" GOES TO THE FIRST BOOKABLE COURT, SO THE NEXT
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
};

async function debugSurprise(kind = "passApproved") {
	showReveal(await DEBUG_SURPRISES[kind](), { record: false });
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

const debugKind = new URLSearchParams(location.search).get("surprise");
if (debugKind !== null) debugSurprise(debugKind || undefined);
else checkSurprises();
