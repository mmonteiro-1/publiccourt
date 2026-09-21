import { renderSlotPicker } from './slot-picker.js';

// ENTRY POINT: RENDERS THE FULL BOOKABLE COURT VIEW, BRANCHING ON AUTH AND MEMBERSHIP STATUS
export async function renderBookable(court) {
	const app = document.getElementById("app");
	app.classList.add("available");
	app.classList.remove("inuse");

	const { data: { session } } = await db.auth.getSession();
	const user = session?.user ?? null;

	const descriptionLine = court.description ? `<p class="card-sub">${court.description}</p>` : "";
	const flipLink = `<a class="card-sub deck-flip-link" data-action="flip-deck" href="#">Mais informações deste campo<img src="images/icon_info.svg" class="link-icon" alt=""></a>`;

	const header = `
		<div class="card-header">
			${cityHtml(court.city)}
			<span class="badge">RESERVAS</span>
		</div>
		<p class="card-status">${court.name}</p>
		${descriptionLine}
		<div class="divider"></div>
	`;

	document.getElementById("court-footer").innerHTML = `
		<a class="info-link" id="back-link" href="index.html">
			<img src="images/icon_back.svg" class="link-icon" alt="">
			Voltar
		</a>`;

	// NOT LOGGED IN → PROMPT TO LOGIN; NO MEMBERSHIP CHECK NEEDED
	if (!user) {
		app.innerHTML = `${header}
			<p class="card-sub margin-bottom-20">Este campo <b>requer reservas</b> para poderes jogar. <br><br> Para fazeres reserva, o Campo Livre irá repassar as tuas informações aos administradores do campo. Após aceite, já podes reservar e jogar.</p>
			${flipLink}
			<button id="login-btn"><img src="images/icon_login.svg" alt=""> Fazer login</button>
		`;
		document.getElementById("login-btn").addEventListener("click", () => { location.href = "login.html"; });
		return;
	}

	const { data: profile } = await db.from("profiles").select("name").eq("id", user.id).single();
	const name = profile?.name || user.user_metadata?.name || "jogador";

	// FETCH SIBLING COURTS, GROUP RULES AND OPENING HOURS IN PARALLEL; ALL ARE GROUP-SCOPED
	let siblingCourts = [];
	let groupRules = null;
	let openingHours = [];
	let existingBookings = [];
	let playerActiveBooking = null;
	if (court.group_id) {
		// FETCH WINDOW: TODAY MIDNIGHT → 7 DAYS OUT, COVERING ALL DAY STRIP SLOTS
		const fetchStart = new Date();
		fetchStart.setHours(0, 0, 0, 0);
		const fetchEnd = new Date(fetchStart);
		fetchEnd.setDate(fetchEnd.getDate() + 7);

		const [{ data: siblings }, { data: rules }, { data: hours }, { data: bookings }, { data: activeBooking }] = await Promise.all([
			db.from("courts")
				.select("id, name")
				.eq("group_id", court.group_id)
				.eq("active", true)
				.neq("id", court.id)
				.order("group_position"),
			db.from("court_groups")
				.select("slot_duration_minutes, min_game_duration_minutes, price_per_slot_cents")
				.eq("id", court.group_id)
				.single(),
			db.from("court_opening_hours")
				.select("day_of_week, open, close, closed, pause_start, pause_end")
				.eq("group_id", court.group_id),
			db.from("bookings")
				.select("start_at, end_at, player_id")
				.eq("court_id", court.id)
				.eq("status", "confirmed")
				.gte("start_at", fetchStart.toISOString())
				.lt("start_at", fetchEnd.toISOString()),
			// CHECK IF THIS PLAYER ALREADY HAS A FUTURE BOOKING ANYWHERE IN THE GROUP
			// court_id IS NEEDED TO DISTINGUISH "THIS COURT" (SHOW LOCKED PICKER) VS "SIBLING" (BLOCK)
			db.from("bookings")
				.select("start_at, end_at, court_id")
				.eq("player_id", user.id)
				.eq("group_id", court.group_id)
				.eq("status", "confirmed")
				.gt("end_at", new Date().toISOString())
				.order("start_at")
				.limit(1)
				.maybeSingle(),
		]);
		siblingCourts = siblings || [];
		groupRules = rules;
		openingHours = hours || [];
		existingBookings = bookings || [];
		playerActiveBooking = activeBooking;
	}

	// NOTE SHOWN TO MEMBERS: LISTS OTHER COURTS IN THE SAME GROUP COVERED BY THIS MEMBERSHIP
	const siblingNote = siblingCourts.length > 0
		? `<p class="card-sub margin-bottom-20">Este membership é também válido para: ${siblingCourts.map(c => c.name).join(", ")}.</p>`
		: "";

	// RULES SUMMARY LINE SHOWN ABOVE THE SLOT PICKER (SLOT SIZE, PRICE, MIN DURATION)
	const rulesHtml = (() => {
		if (!groupRules) return "";
		const items = [];
		if (groupRules.slot_duration_minutes) items.push(`Slots de ${groupRules.slot_duration_minutes} min`);
		if (groupRules.price_per_slot_cents != null) items.push(`€${(groupRules.price_per_slot_cents / 100).toFixed(2)} por slot`);
		if (groupRules.min_game_duration_minutes) items.push(`Mínimo ${groupRules.min_game_duration_minutes} min`);
		if (items.length === 0) return "";
		return `<p class="card-sub margin-bottom-20">${items.join(" · ")}</p>`;
	})();

	// MEMBERSHIP IS GROUP-SCOPED IF THE COURT BELONGS TO A GROUP, OTHERWISE COURT-SCOPED
	const membershipQuery = court.group_id
		? db.from("memberships").select("status, denied_reason").eq("player_id", user.id).eq("group_id", court.group_id)
		: db.from("memberships").select("status, denied_reason").eq("player_id", user.id).eq("court_id", court.id);

	const { data: membership } = await membershipQuery.maybeSingle();

	if (membership?.status === "pending") {
		app.innerHTML = `${header}
			<p class="card-sub"><b>Olá, ${name}.</b> A tua solicitação de membership está pendente de aprovação.</p>
			${siblingNote}
		`;
		return;
	}

	if (membership?.status === "denied") {
		const reason = membership.denied_reason ? ` Motivo: ${membership.denied_reason}.` : "";
		app.innerHTML = `${header}
			<p class="card-sub margin-bottom-20"><b>Olá, ${name}.</b> A tua solicitação foi recusada.${reason} Podes solicitar novamente.</p>
			${siblingNote}
			${flipLink}
			<button id="reapply-btn">Solicitar novamente</button>
		`;
		document.getElementById("reapply-btn").addEventListener("click", () => requestMembership(court, user, name, app, header, siblingNote, true));
		return;
	}

	// APPROVED MEMBER → SHOW THE SLOT PICKER, UNLESS THEY ALREADY HAVE AN ACTIVE BOOKING IN THIS GROUP
	if (membership?.status === "approved") {
		// PLAYER HAS A FUTURE BOOKING IN THE GROUP — CHECK WHICH COURT
		if (playerActiveBooking) {
			const s = new Date(playerActiveBooking.start_at);
			const e = new Date(playerActiveBooking.end_at);
			const dayLabel = s.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' });
			const fmt = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

			if (playerActiveBooking.court_id !== court.id) {
				// BOOKING IS ON A SIBLING COURT — BLOCK ENTIRELY, SHOW DETAILS
				app.innerHTML = `${header}
					<p class="card-sub"><b>Olá, ${name}.</b> És membro deste campo.</p>
					<p class="card-sub">${siblingCourts.length > 0 ? 'Já tens uma reserva ativa neste grupo de campos' : 'Já tens uma reserva ativa'}:</p>
					<p class="card-sub margin-bottom-20"><b>${dayLabel}, ${fmt(s)}–${fmt(e)}</b></p>
					${siblingNote}
				`;
				return;
			}

			// BOOKING IS ON THIS COURT — RENDER LOCKED PICKER SO PLAYER SEES THEIR CONFIRMED SLOT
			app.innerHTML = `${header}
				<p class="card-sub"><b>Olá, ${name}.</b> És membro deste campo.</p>
				<p class="card-sub margin-bottom-20">Reserva: ${dayLabel}, ${fmt(s)}–${fmt(e)}</p>
				${rulesHtml}
				${siblingNote}
				<div id="slot-picker"></div>
			`;
			renderSlotPicker(document.getElementById("slot-picker"), groupRules, openingHours, null, existingBookings, user.id, true);
			return;
		}

		app.innerHTML = `${header}
			<p class="card-sub"><b>Olá, ${name}.</b> És membro deste campo.</p>
			<p class="card-sub margin-bottom-20" id="booking-feedback" hidden></p>
			${rulesHtml}
			${siblingNote}
			<div id="slot-picker"></div>
		`;

		// INSERT INTO bookings ON CONFIRM; ON SUCCESS UPDATES booking-feedback WITH DAY AND TIME.
		// RETURNS error SO THE SLOT PICKER CAN HANDLE RETRY ON FAILURE.
		const onConfirm = async (startAt, endAt) => {
			const { error } = await db.from("bookings").insert({
				group_id: court.group_id,
				player_id: user.id,
				court_id: court.id,
				start_at: startAt,
				end_at: endAt,
			});
			if (!error) {
				const s = new Date(startAt);
				const e = new Date(endAt);
				const dayLabel = s.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' });
				const fmt = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
				const feedback = document.getElementById("booking-feedback");
				if (feedback) {
					feedback.textContent = `Reserva: ${dayLabel}, ${fmt(s)}–${fmt(e)}`;
					feedback.hidden = false;
				}
			}
			return error;
		};

		renderSlotPicker(document.getElementById("slot-picker"), groupRules, openingHours, onConfirm, existingBookings, user.id);
		return;
	}

	// NO MEMBERSHIP YET → OFFER TO REQUEST ONE
	app.innerHTML = `${header}
		<p class="card-sub margin-bottom-20"><b>Olá, ${name}.</b> Reservas neste campo estão destinadas a membros. Quer solicitar um membership?</p>
		${rulesHtml}
		${siblingNote}
		${flipLink}
		<button id="membership-btn">Solicitar membership</button>
	`;
	document.getElementById("membership-btn").addEventListener("click", () => requestMembership(court, user, name, app, header, siblingNote, false));
}

// SUBMIT A MEMBERSHIP REQUEST; ON RE-APPLY, DELETES THE DENIED ROW FIRST SO INSERT IS CLEAN
async function requestMembership(court, user, name, app, header, siblingNote, isReapply) {
	const btn = document.getElementById("membership-btn") || document.getElementById("reapply-btn");
	if (btn) { btn.disabled = true; btn.textContent = "A enviar..."; }

	if (isReapply) {
		const deleteQuery = court.group_id
			? db.from("memberships").delete().eq("player_id", user.id).eq("group_id", court.group_id)
			: db.from("memberships").delete().eq("player_id", user.id).eq("court_id", court.id);
		await deleteQuery;
	}

	const scope = court.group_id
		? { player_id: user.id, group_id: court.group_id }
		: { player_id: user.id, court_id: court.id };

	const { error } = await db.from("memberships").insert(scope);

	if (error) {
		if (btn) { btn.disabled = false; btn.textContent = isReapply ? "Solicitar novamente" : "Solicitar membership"; }
		return;
	}

	app.innerHTML = `${header}
		<p class="card-sub"><b>Olá, ${name}.</b> A tua solicitação de membership está pendente de aprovação.</p>
		${siblingNote}
	`;
}
