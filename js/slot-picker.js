// DAY ABBREVIATIONS INDEXED BY JS getDay() (0 = SUNDAY)
const DAY_NAMES = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

// RETURNS AN ARRAY OF 7 DATE OBJECTS STARTING FROM TODAY
function getDays() {
	const today = new Date();
	return Array.from({ length: 7 }, (_, i) => {
		const d = new Date(today);
		d.setDate(today.getDate() + i);
		return d;
	});
}

// BUILDS THE HORIZONTAL STRIP OF DAY CELLS; CLOSED DAYS GET day-cell--closed (0.4 OPACITY, NO TAP)
function buildDayStrip(days, selectedIndex, openingHours) {
	const cells = days.map((d, i) => {
		// A day is closed if it has no entry in opening_hours OR if its closed flag is true
		const dayHours = (openingHours || []).find(h => h.day_of_week === d.getDay());
		const isClosed = !dayHours || dayHours.closed;
		const cls = ['day-cell', i === selectedIndex ? 'day-cell--active' : '', isClosed ? 'day-cell--closed' : ''].filter(Boolean).join(' ');
		return `
			<div class="${cls}" data-index="${i}">
				<span class="day-name">${DAY_NAMES[d.getDay()]}</span>
				<span class="day-number">${d.getDate()}</span>
				<img src="images/icon_cloudy.svg" class="day-weather" alt="">
			</div>
		`;
	});
	return `<div class="day-strip">${cells.join('')}</div>`;
}

// BUILDS THE SLOT TIME GRID FOR A GIVEN DAY; ALSO APPENDS THE LEGEND BELOW THE GRID
function buildSlotGrid(day, dayIndex, groupRules, openingHours, selectionStart, selectionEnd, existingBookings, userId, locked) {
	const dow = day.getDay();
	const dayHours = (openingHours || []).find(h => h.day_of_week === dow);

	if (!dayHours || dayHours.closed) {
		return `<p class="card-sub">Hoje não há ténis cá, o campo está encerrado.</p>`;
	}

	const slotMin = groupRules?.slot_duration_minutes;
	if (!slotMin || !dayHours.open || !dayHours.close) {
		return `<p class="card-sub">Horário não configurado.</p>`;
	}

	// HELPERS: CONVERT "HH:MM" TIME STRINGS TO MINUTES, AND BACK TO A DISPLAY LABEL
	const toMins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
	const toLabel = m => `${String(Math.floor(m / 60)).padStart(2, '0')}${String(m % 60).padStart(2, '0')}`;

	const openMins = toMins(dayHours.open);
	const closeMins = toMins(dayHours.close);
	const pauseStart = dayHours.pause_start ? toMins(dayHours.pause_start) : null;
	const pauseEnd = dayHours.pause_end ? toMins(dayHours.pause_end) : null;

	// ONLY TODAY HAS PAST SLOTS; FUTURE DAYS USE -1 SO THE isPast CHECK NEVER FIRES
	const now = new Date();
	const nowMins = dayIndex === 0 ? now.getHours() * 60 + now.getMinutes() : -1;

	// PRE-PROCESS BOOKINGS FOR THIS DAY INTO {startMins, endMins, playerId} FOR O(1) OVERLAP CHECKS
	const dayBookings = (existingBookings || [])
		.filter(b => new Date(b.start_at).toDateString() === day.toDateString())
		.map(b => {
			const s = new Date(b.start_at);
			const e = new Date(b.end_at);
			return {
				startMins: s.getHours() * 60 + s.getMinutes(),
				endMins: e.getHours() * 60 + e.getMinutes(),
				playerId: b.player_id,
			};
		});

	// GENERATE ONE CELL PER SLOT FROM OPEN TO CLOSE; LAST SLOT MUST END BY closeMins
	const cells = [];
	for (let t = openMins; t + slotMin <= closeMins; t += slotMin) {
		const isPast = t <= nowMins;
		const isBreak = pauseStart != null && t >= pauseStart && t < pauseEnd;
		// A BOOKING OVERLAPS THIS SLOT IF ITS RANGE INTERSECTS [t, t+slotMin)
		const overlapping = dayBookings.filter(b => b.startMins < t + slotMin && b.endMins > t);
		const isMine = overlapping.some(b => b.playerId === userId);
		const isOccupied = !isMine && overlapping.length > 0;
		// slot-cell--tappable DRIVES BOTH TAP HANDLING AND BLOCKER DETECTION IN clampEnd
		const isTappable = !isPast && !isBreak && !isOccupied && !isMine;
		const isSelected = selectionStart !== null && (
			selectionEnd !== null ? t >= selectionStart && t <= selectionEnd : t === selectionStart
		);
		const cls = ['slot-cell',
			isPast ? 'slot-past' : '',
			isBreak ? 'slot-break' : '',
			isOccupied ? 'slot-occupied' : '',
			(isMine || isSelected) ? 'slot-mine' : '',
			isTappable ? 'slot-cell--tappable' : '',
		].filter(Boolean).join(' ');
		cells.push(`<div class="${cls}" data-mins="${t}">${toLabel(t)}</div>`);
	}

	// LEGEND KEYS: HATCHED = ALMOÇO, ORANGE = OCUPADO, GREEN = LIVRE, WHITE = TEU JOGO
	const legend = `
		<div class="chart-legend slot-legend">
			<span class="legend-item"><span class="legend-dot legend-slot-free"></span>Livre</span>
			<span class="legend-item"><span class="legend-dot legend-slot-occupied"></span>Ocupado</span>
			<span class="legend-item"><span class="legend-dot legend-slot-break"></span>Almoço</span>
			<span class="legend-item"><span class="legend-dot legend-slot-mine"></span>Teu jogo</span>
		</div>`;

	// LOCKED (PLAYER ALREADY HAS A BOOKING HERE) SWAPS THE CONFIRM BUTTON FOR A SHALLOW CANCEL BUTTON.
	// CANCEL-BOOKING-CONFIRM STARTS HIDDEN; SAME REVEAL/BACK PATTERN AS THE OWNER'S REVOKE-MEMBERSHIP FLOW.
	const actionButton = locked
		? `<button class="slot-confirm-btn button-shallow" id="cancel-booking-btn"><img src="images/icon_fall.svg" class="link-icon" alt="">Cancelar reserva</button>
			<div class="membership-actions" id="cancel-booking-confirm" hidden>
				<button id="confirm-cancel-booking-btn"><img src="images/icon_skull.svg" class="link-icon" alt="">Cancelar</button>
				<button class="button-shallow" id="back-cancel-booking-btn">Voltar</button>
			</div>`
		: `<button class="slot-confirm-btn" disabled><img src="images/icon_handshake.svg" class="link-icon" alt="">Confirmar reserva</button>`;
	return `${legend}<div class="slot-grid">${cells.join('')}</div><div class="slot-summary-wrap" hidden><div class="slot-summary"></div><div class="slot-min-warning" hidden></div></div>${actionButton}`;
}

// FORMATS MINUTES-SINCE-MIDNIGHT AS "HH:MM" FOR DISPLAY
function toTime(mins) {
	return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

// CONVERTS A DAY DATE AND A MINUTES-SINCE-MIDNIGHT VALUE TO AN ISO DATETIME STRING
function toISODateTime(day, mins) {
	const d = new Date(day);
	d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
	return d.toISOString();
}

// MAIN EXPORT: RENDERS AND MANAGES THE FULL SLOT PICKER INSIDE container.
// onConfirm(startAt, endAt) IS CALLED ON CONFIRM; SHOULD RETURN AN ERROR OR null.
// startLocked=true SKIPS INTERACTION ENTIRELY (USED WHEN PLAYER ALREADY HAS A BOOKING ON THIS COURT).
// onCancel() IS CALLED WHEN THE PLAYER CONFIRMS CANCELLING THEIR BOOKING; SHOULD RETURN AN ERROR OR null.
export function renderSlotPicker(container, groupRules, openingHours, onConfirm, existingBookings, userId, startLocked = false, onCancel = null) {
	const days = getDays();
	let selectedIndex = 0;
	// SELECTION STATE IN MINUTES-SINCE-MIDNIGHT, MATCHING data-mins ON EACH SLOT CELL
	let selectionStart = null;
	let selectionEnd = null;
	// SET TO true AFTER A SUCCESSFUL BOOKING; PREVENTS PICKING ON ANY DAY AFTER THAT
	let locked = startLocked;
	// LOCAL COPY OF BOOKINGS; UPDATED AFTER A SUCCESSFUL INSERT SO Re-RENDERS REFLECT IT
	let localBookings = [...(existingBookings || [])];

	// TOGGLES slot-mine ON TAPPABLE CELLS ONLY — CONFIRMED MINE SLOTS ARE NOT TAPPABLE
	// AND MUST NOT LOSE THEIR slot-mine CLASS WHEN SELECTION CHANGES.
	// ALSO ENABLES / DISABLES THE CONFIRM BUTTON BASED ON SELECTION AND min_game_duration_minutes.
	function updateSlotClasses() {
		container.querySelectorAll('.slot-cell--tappable').forEach(c => {
			const t = parseInt(c.dataset.mins);
			const inRange = selectionStart !== null && (
				selectionEnd !== null ? t >= selectionStart && t <= selectionEnd : t === selectionStart
			);
			c.classList.toggle('slot-mine', inRange);
		});

		const confirmBtn = container.querySelector('.slot-confirm-btn');
		const summaryWrapEl = container.querySelector('.slot-summary-wrap');
		const summaryEl = container.querySelector('.slot-summary');
		const minWarningEl = container.querySelector('.slot-min-warning');

		if (selectionStart === null) {
			if (confirmBtn) confirmBtn.disabled = true;
			if (summaryWrapEl) summaryWrapEl.hidden = true;
			return;
		}

		// SELECTED DURATION = RANGE SPAN + ONE SLOT; COMPARED AGAINST minDuration IF SET
		const slotMin = groupRules?.slot_duration_minutes || 0;
		const endMins = (selectionEnd ?? selectionStart) + slotMin;
		const selectedDuration = endMins - selectionStart;
		const minDuration = groupRules?.min_game_duration_minutes || 0;
		const belowMinDuration = minDuration > 0 && selectedDuration < minDuration;
		if (confirmBtn) confirmBtn.disabled = belowMinDuration;

		// LIVE SUMMARY AND MIN-DURATION WARNING, GROUPED TOGETHER BETWEEN LEGEND AND CONFIRM BUTTON
		if (summaryWrapEl) summaryWrapEl.hidden = false;
		if (summaryEl) summaryEl.textContent = `Teu jogo: ${toTime(selectionStart)} às ${toTime(endMins)}h (${selectedDuration} min)`;
		if (minWarningEl) {
			minWarningEl.hidden = !belowMinDuration;
			if (belowMinDuration) minWarningEl.textContent = `O teu jogo precisa ser de no mínimo ${minDuration} min`;
		}
	}

	// LOCKS THE PICKER AFTER A SUCCESSFUL BOOKING.
	// PUSHES THE NEW BOOKING INTO localBookings AND RE-RENDERS SO isMine REFLECTS IT ON ALL DAYS.
	// render() DETECTS locked AND STRIPS slot-cell--tappable AFTER EVERY SUBSEQUENT RE-RENDER.
	function lockPicker(startAt, endAt) {
		locked = true;
		selectionStart = null;
		selectionEnd = null;
		if (startAt && endAt) {
			localBookings = [...localBookings, { start_at: startAt, end_at: endAt, player_id: userId }];
		}
		render();
	}

	// IF A NON-TAPPABLE SLOT (BREAK, PAST, OCCUPIED) SITS BETWEEN start AND proposed,
	// CLAMP THE END TO THE LAST TAPPABLE SLOT BEFORE THE FIRST BLOCKER.
	// RETURNS null IF THE BLOCKER IS IMMEDIATELY AFTER start (NO VALID END EXISTS).
	function clampEnd(start, proposed) {
		const allCells = [...container.querySelectorAll('.slot-cell')];
		const firstBlocker = allCells.find(c => {
			const t = parseInt(c.dataset.mins);
			return t > start && t <= proposed && !c.classList.contains('slot-cell--tappable');
		});
		if (!firstBlocker) return proposed;
		const blockerMins = parseInt(firstBlocker.dataset.mins);
		const tappableBefore = allCells.filter(c => {
			const t = parseInt(c.dataset.mins);
			return t > start && t < blockerMins && c.classList.contains('slot-cell--tappable');
		});
		return tappableBefore.length > 0
			? parseInt(tappableBefore[tappableBefore.length - 1].dataset.mins)
			: null;
	}

	// ATTACH A SINGLE DELEGATED LISTENER ON THE GRID; HANDLES THE FULL TAP STATE MACHINE
	function attachSlotListeners() {
		const grid = container.querySelector('.slot-grid');
		if (!grid) return;
		grid.addEventListener('click', e => {
			const cell = e.target.closest('.slot-cell--tappable');
			if (!cell) return;
			const mins = parseInt(cell.dataset.mins);

			if (mins === selectionStart) {
				// TAP START AGAIN → DESELECT EVERYTHING
				selectionStart = null;
				selectionEnd = null;
			} else if (selectionEnd !== null) {
				// RANGE ALREADY SET → START A FRESH SELECTION FROM HERE
				selectionStart = mins;
				selectionEnd = null;
			} else if (selectionStart === null) {
				// NOTHING SELECTED YET → SET THE START
				selectionStart = mins;
			} else if (mins > selectionStart) {
				// EXTEND RANGE FORWARD, BLOCKING AT BREAKS / PAST / OCCUPIED SLOTS
				selectionEnd = clampEnd(selectionStart, mins);
			} else {
				// TAPPED BEFORE CURRENT START → RESET START TO THIS SLOT
				selectionStart = mins;
				selectionEnd = null;
			}

			updateSlotClasses();
		});

		// CONFIRM BUTTON: BUILDS start_at / end_at FROM SELECTION AND CALLS onConfirm
		const confirmBtn = container.querySelector('.slot-confirm-btn');
		if (confirmBtn && onConfirm) {
			confirmBtn.addEventListener('click', async () => {
				const slotMin = groupRules?.slot_duration_minutes || 0;
				const endMins = (selectionEnd ?? selectionStart) + slotMin;
				const startAt = toISODateTime(days[selectedIndex], selectionStart);
				const endAt = toISODateTime(days[selectedIndex], endMins);
				confirmBtn.disabled = true;
				confirmBtn.textContent = 'A reservar...';
				const error = await onConfirm(startAt, endAt);
				confirmBtn.innerHTML = '<img src="images/icon_handshake.svg" class="link-icon" alt="">Confirmar reserva';
				if (!error) {
					lockPicker(startAt, endAt);
				} else {
					updateSlotClasses();
				}
			});
		}

		// CANCEL-BOOKING FLOW: "Cancelar reserva" REVEALS A Cancelar/Voltar ROW; ONLY THE ROW'S
		// Cancelar ACTUALLY CANCELS THE BOOKING. SAME REVEAL/BACK PATTERN AS THE OWNER'S REVOKE FLOW.
		const cancelBookingBtn = container.querySelector('#cancel-booking-btn');
		const cancelBookingConfirm = container.querySelector('#cancel-booking-confirm');
		if (cancelBookingBtn && cancelBookingConfirm) {
			cancelBookingBtn.addEventListener('click', () => {
				cancelBookingBtn.hidden = true;
				cancelBookingConfirm.hidden = false;
			});

			container.querySelector('#back-cancel-booking-btn').addEventListener('click', () => {
				cancelBookingConfirm.hidden = true;
				cancelBookingBtn.hidden = false;
			});

			const confirmCancelBtn = container.querySelector('#confirm-cancel-booking-btn');
			if (confirmCancelBtn && onCancel) {
				confirmCancelBtn.addEventListener('click', async () => {
					confirmCancelBtn.disabled = true;
					confirmCancelBtn.textContent = 'A cancelar...';
					const error = await onCancel();
					if (error) {
						confirmCancelBtn.disabled = false;
						confirmCancelBtn.innerHTML = '<img src="images/icon_skull.svg" class="link-icon" alt="">Cancelar';
					}
				});
			}
		}
	}

	// FULL RE-RENDER: USED ON INIT AND WHENEVER THE SELECTED DAY CHANGES
	function render() {
		container.innerHTML = buildDayStrip(days, selectedIndex, openingHours) + buildSlotGrid(days[selectedIndex], selectedIndex, groupRules, openingHours, selectionStart, selectionEnd, localBookings, userId, locked);

		container.querySelectorAll('.day-cell:not(.day-cell--closed)').forEach(cell => {
			cell.addEventListener('click', () => {
				selectedIndex = parseInt(cell.dataset.index);
				// CLEAR SELECTION WHEN SWITCHING DAYS
				selectionStart = null;
				selectionEnd = null;
				render();
			});
		});

		attachSlotListeners();
		// STRIP TAPPABLE ON EVERY RE-RENDER AFTER A BOOKING SO NO DAY ALLOWS NEW PICKING
		if (locked) {
			container.querySelectorAll('.slot-cell--tappable').forEach(c => c.classList.remove('slot-cell--tappable'));
		}
	}

	render();
}
