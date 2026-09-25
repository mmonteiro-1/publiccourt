import { renderSlotPicker } from './slot-picker.js';
import { setSecondaryCardInfo } from './secondary-card.js';

const hi = name => `<b>Olá, ${name}.</b>`;
const MSG_PENDING = "Espetáculo! Enviámos a solicitação para os administradores do campo. <br><br>Vamos avisar no email e aqui quando tivermos novidade.";
const MSG_DENIED = "A tua solicitação foi recusada.";
const MSG_MEMBER = "És membro deste campo.";
const MSG_NO_MEMBERSHIP = "Este campo é exclusivo para membros registados. Podes solicitar acesso agora.";
const MSG_NOT_LOGGED = `Este campo opera sob o <b>sistema de reservas</b>. <br><br> Para fazeres reserva, o Campo Livre precisa repassar as tuas informações aos administradores do campo. Após aceite, já podes reservar e jogar.`;

// ENTRY POINT: RENDERS THE FULL BOOKABLE COURT VIEW, BRANCHING ON AUTH AND MEMBERSHIP STATUS
export async function renderBookable(court) {
	const app = document.getElementById("app");
	app.classList.add("available");
	app.classList.remove("inuse");

	const { data: { session } } = await db.auth.getSession();
	const user = session?.user ?? null;

	const descriptionLine = court.description ? `<p class="card-sub">${court.description}</p>` : "";
	const flipLink = `<a class="card-sub deck-flip-link" data-action="flip-deck" href="#">Mais informações<img src="images/icon_info.svg" class="link-icon" alt=""></a>`;

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

	// FETCH GROUP DATA FOR SECONDARY CARD — DONE UPFRONT SO NON-LOGGED-IN PLAYERS SEE IT TOO
	let siblingCourts = [];
	let groupRules = null;
	let openingHours = [];
	if (court.group_id) {
		const [{ data: siblings }, { data: rules }, { data: hours }] = await Promise.all([
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
		]);
		siblingCourts = siblings || [];
		groupRules = rules;
		openingHours = hours || [];
	}

	// FETCH BOOKING DATA — ONLY NEEDED WHEN LOGGED IN
	let existingBookings = [];
	let playerActiveBooking = null;
	if (user && court.group_id) {
		const fetchStart = new Date();
		fetchStart.setHours(0, 0, 0, 0);
		const fetchEnd = new Date(fetchStart);
		fetchEnd.setDate(fetchEnd.getDate() + 7);

		const [{ data: bookings }, { data: activeBooking }] = await Promise.all([
			db.from("bookings")
				.select("start_at, end_at, player_id")
				.eq("court_id", court.id)
				.eq("status", "confirmed")
				.gte("start_at", fetchStart.toISOString())
				.lt("start_at", fetchEnd.toISOString()),
			// CHECK IF THIS PLAYER ALREADY HAS A FUTURE BOOKING ANYWHERE IN THE GROUP
			// court_id IS NEEDED TO DISTINGUISH "THIS COURT" (SHOW LOCKED PICKER) VS "SIBLING" (BLOCK)
			db.from("bookings")
				.select("id, start_at, end_at, court_id")
				.eq("player_id", user.id)
				.eq("group_id", court.group_id)
				.eq("status", "confirmed")
				.gt("end_at", new Date().toISOString())
				.order("start_at")
				.limit(1)
				.maybeSingle(),
		]);
		existingBookings = bookings || [];
		playerActiveBooking = activeBooking;
	}

	const rulesHtml = (() => {
		if (!groupRules) return "";
		const items = [];
		if (groupRules.slot_duration_minutes) items.push({ value: `${groupRules.slot_duration_minutes}min`, label: "slots" });
		// != null SO 0 (FREE COURTS) ISN'T DROPPED BY A TRUTHINESS CHECK
		if (groupRules.price_per_slot_cents != null) items.push({ value: `€${(groupRules.price_per_slot_cents / 100).toFixed(2)}`, label: "preço por slot" });
		if (groupRules.min_game_duration_minutes) items.push({ value: `${groupRules.min_game_duration_minutes}min`, label: "duração mínima" });
		if (items.length === 0) return "";
		return `<div class="rules-grid">${items.map(i => `<div class="rules-item"><span class="rules-value">${i.value}</span><span class="rules-label">${i.label}</span></div>`).join("")}</div>`;
	})();

	const siblingSubtitle = siblingCourts.length > 0
		? `<p class="secondary-card-subtitle">Válido também para o campo: ${siblingCourts.map(c => c.name).join(", ")}.</p>`
		: "";

	const openingHoursHtml = (() => {
		if (!openingHours.length) return "";
		const dayNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
		const fmt = t => t ? t.slice(0, 5) : "";
		const rows = [...openingHours]
			.sort((a, b) => a.day_of_week - b.day_of_week)
			.map(h => {
				const day = dayNames[h.day_of_week] ?? h.day_of_week;
				const hours = h.closed
					? "Fechado"
					: h.pause_start
						? `${fmt(h.open)} – ${fmt(h.pause_start)}<br>${fmt(h.pause_end)} – ${fmt(h.close)}`
						: `${fmt(h.open)} – ${fmt(h.close)}`;
				return `<div class="hours-item"><div class="hours-day">${day}</div><div class="hours-time">${hours}</div></div>`;
			});
		return `<p class="secondary-card-title">Horário</p><div class="hours-grid">${rows.join("")}</div>`;
	})();

	setSecondaryCardInfo({ siblingSubtitle, rulesHtml, openingHoursHtml });

	// NOT LOGGED IN → PROMPT TO LOGIN; NO MEMBERSHIP CHECK NEEDED
	if (!user) {
		app.innerHTML = `${header}
			<p class="card-sub margin-bottom-20">${MSG_NOT_LOGGED}</p>
			${flipLink}
			<button id="login-btn"><img src="images/icon_login.svg" alt=""> Fazer login</button>
		`;
		document.getElementById("login-btn").addEventListener("click", () => { location.href = "login.html"; });
		return;
	}

	const { data: profile } = await db.from("profiles").select("name").eq("id", user.id).single();
	const playerName = profile?.name || user.user_metadata?.name || "jogador";
	const greeting = `<p class="card-sub">${hi(playerName)} ${MSG_MEMBER}</p>`;

	// MEMBERSHIP IS GROUP-SCOPED IF THE COURT BELONGS TO A GROUP, OTHERWISE COURT-SCOPED
	const membershipQuery = court.group_id
		? db.from("memberships").select("status, denied_reason").eq("player_id", user.id).eq("group_id", court.group_id)
		: db.from("memberships").select("status, denied_reason").eq("player_id", user.id).eq("court_id", court.id);

	const { data: membership } = await membershipQuery.maybeSingle();

	if (membership?.status === "pending") {
		app.innerHTML = `${header}
			<p class="card-sub margin-bottom-20">${MSG_PENDING}</p>
			${flipLink}
		`;
		return;
	}

	if (membership?.status === "denied") {
		const reason = membership.denied_reason ? ` Motivo: ${membership.denied_reason}.` : "";
		app.innerHTML = `${header}
			<p class="card-sub margin-bottom-20">${hi(playerName)} ${MSG_DENIED}${reason} Podes solicitar novamente.</p>
			${flipLink}
			<button id="reapply-btn">Solicitar novamente</button>
		`;
		document.getElementById("reapply-btn").addEventListener("click", () => requestMembership(court, user, app, header, true));
		return;
	}

	// APPROVED MEMBER → SHOW THE SLOT PICKER, UNLESS THEY ALREADY HAVE AN ACTIVE BOOKING IN THIS GROUP
	if (membership?.status === "approved") {
		// PLAYER HAS A FUTURE BOOKING IN THE GROUP — CHECK WHICH COURT
		if (playerActiveBooking) {
			const s = new Date(playerActiveBooking.start_at);
			const e = new Date(playerActiveBooking.end_at);
			const weekday = s.toLocaleDateString('pt-PT', { weekday: 'long' });
			const dateLabel = `${String(s.getDate()).padStart(2, '0')}/${String(s.getMonth() + 1).padStart(2, '0')}`;
			const fmt = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
			const bookingGreeting = `<p class="card-sub">${hi(playerName)} Tens reserva ${weekday} ${dateLabel} às ${fmt(s)}–${fmt(e)}</p>`;

			if (playerActiveBooking.court_id !== court.id) {
				// BOOKING IS ON A SIBLING COURT — BLOCK ENTIRELY, SHOW DETAILS
				app.innerHTML = `${header}
					${bookingGreeting}
					<p class="card-sub">${siblingCourts.length > 0 ? 'Já tens uma reserva ativa neste grupo de campos.' : 'Já tens uma reserva ativa.'}</p>
				`;
				return;
			}

			// BOOKING IS ON THIS COURT — RENDER LOCKED PICKER SO PLAYER SEES THEIR CONFIRMED SLOT
			app.innerHTML = `${header}
				${bookingGreeting}
				<div id="slot-picker"></div>
			`;
			// SETS status TO cancelled; RLS ONLY ALLOWS THIS WHILE start_at IS STILL IN THE FUTURE
			const onCancel = async () => {
				const { error } = await db.from("bookings").update({ status: "cancelled" }).eq("id", playerActiveBooking.id);
				if (!error) location.reload();
				return error;
			};
			// RLS BLOCKS CANCELLING ONCE start_at HAS PASSED, SO A GAME IN PROGRESS GETS NO CANCEL BUTTON
			const hasStarted = new Date(playerActiveBooking.start_at) <= new Date();
			renderSlotPicker(document.getElementById("slot-picker"), groupRules, openingHours, null, existingBookings, user.id, true, hasStarted ? null : onCancel, false, court);
			return;
		}

		app.innerHTML = `${header}
			${greeting}
			<div id="slot-picker"></div>
		`;

		// INSERT INTO bookings ON CONFIRM; RELOADS ON SUCCESS SO THE PAGE PICKS UP THE LOCKED STATE.
		// RETURNS error SO THE SLOT PICKER CAN HANDLE RETRY ON FAILURE.
		const onConfirm = async (startAt, endAt) => {
			const { error } = await db.from("bookings").insert({
				group_id: court.group_id,
				player_id: user.id,
				court_id: court.id,
				start_at: startAt,
				end_at: endAt,
			});
			if (!error) location.reload();
			return error;
		};

		renderSlotPicker(document.getElementById("slot-picker"), groupRules, openingHours, onConfirm, existingBookings, user.id, false, null, false, court);
		return;
	}

	// NO MEMBERSHIP YET → OFFER TO REQUEST ONE
	app.innerHTML = `${header}
		<p class="card-sub margin-bottom-20">${hi(playerName)} ${MSG_NO_MEMBERSHIP}</p>
		${flipLink}
		<button id="membership-btn"><img src="images/icon_asking.svg" class="link-icon" alt="">Solicitar acesso</button>
	`;
	document.getElementById("membership-btn").addEventListener("click", () => requestMembership(court, user, app, header, false));
}

// SUBMIT A MEMBERSHIP REQUEST; ON RE-APPLY, DELETES THE DENIED ROW FIRST SO INSERT IS CLEAN
async function requestMembership(court, user, app, header, isReapply) {
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
		<p class="card-sub">${MSG_PENDING}</p>
	`;
}
