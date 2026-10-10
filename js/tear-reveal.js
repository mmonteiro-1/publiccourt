// TEAR-STRIP REVEAL: A FULL-SCREEN "PARCEL" ON TOP OF EVERYTHING, PACKED WITH STYROFOAM PEANUTS. THE PLAYER DRAGS THE TEAR
// STRIP UP FROM THE BOTTOM; ONCE TORN, THE STRIP FLIES OFF, THE BOX VANISHES AS THE PACKING BURSTS OUT AT THE VIEWER OVER
// THE PAGE BEHIND IT, AND ONCE THE PEANUTS HAVE FADED THE OVERLAY REMOVES ITSELF. USAGE: showTearReveal() OR showTearReveal({ label: "…", onBurst: () => …, onDone: () => … }). onBurst FIRES THE INSTANT THE BOX BURSTS (FOR WHAT'S REVEALED TO START MOVING), onDone ONCE THE OVERLAY IS GONE.
// STYLES: THE "TEAR-STRIP REVEAL" BLOCK IN styles.css

const MSG_TEAR_LABEL = "Recebeste encomenda. Tu sabes o que fazer.";

function showTearReveal({ label = MSG_TEAR_LABEL, onBurst, onDone } = {}) {
	const overlay = document.createElement("div");
	overlay.className = "tear-reveal";
	overlay.setAttribute("aria-hidden", "true");
	overlay.innerHTML = `
		<div class="tear-fill"></div>
		<div class="tear-half tear-half-left"><div class="tear-box"></div><div class="tear-slot"></div></div>
		<div class="tear-half tear-half-right"><div class="tear-box"></div><div class="tear-slot"></div></div>
		<div class="tear-chain"></div>
		<div class="tear-tab"></div>
	`;
	document.body.appendChild(overlay);

	// THE TEAR RUNS BOTTOM TO TOP; SLICES ABOVE THE TEAR LINE LIE FLAT, THOSE BELOW IT FOLLOW A BEND PROFILE: OVER THE FIRST
	// CURL_LENGTH px PAST THE LINE THE STRIP TURNS STEADILY UP TO CURL_ANGLE (A ROLL OF CONSTANT RADIUS) AND TWISTS RIGHT; THE
	// TAIL THEN KEEPS CURLING, EVER MORE GENTLY, TOWARDS TAIL_CURL MORE. EACH HINGE GETS THE BEND ADDED SINCE THE PREVIOUS ONE

	// ENOUGH SLICES TO FILL THE SCREEN (THE OVERLAY COVERS IT), THEN THE STRIP IS SHIFTED UP BY THE LEFTOVER (STRIP_TOP ≤ 0)
	// SO ITS BOTTOM — THE PULL END — SITS EXACTLY ON THE PAGE'S BOTTOM EDGE, SEEN IN FULL; THE TOP SLICE MAY RUN OFF-SCREEN.
	// THE BOTTOM SLICE (WHAT THE FINGER GRABS) IS BOTTOM_H TALL; EVERY OTHER SLICE IS SLICE_H. IT HANGS OFF NOTHING, SO ONLY
	// ITS FACE GROWS — THE JOINTS ABOVE IT KEEP THEIR SPACING
	const SLICE_H = 40, BOTTOM_H = SLICE_H * 2;
	const SCREEN_W = overlay.clientWidth, SCREEN_H = overlay.clientHeight;
	const SLICES = Math.ceil((SCREEN_H - BOTTOM_H) / SLICE_H) + 1;
	const STRIP_H = (SLICES - 1) * SLICE_H + BOTTOM_H;
	const STRIP_TOP = SCREEN_H - STRIP_H;
	// THE CURL SPANS CURL_SLICES SLICES, SO EACH HINGE TURNS ONLY ~CURL_ANGLE / CURL_SLICES BEFORE THE NEXT ONE STARTS;
	// TIED TO SLICE_H SO THE HANDOVER STAYS THIS QUICK WHATEVER THE SLICE LENGTH
	const CURL_SLICES = 4;
	const CURL_LENGTH = SLICE_H * CURL_SLICES, CURL_ANGLE = 130, CURL_TWIST = -50;
	const TAIL_CURL = 80;
	// THE DRAG STOPS SHORT OF THE TOP SO THE LAST BIT STAYS ATTACHED, OR THE WHOLE STRIP WOULD SWING FREE FROM ITS TOP HINGE;
	// THE AUTO-COMPLETE TEARS THAT LAST BIT ON ITS OWN
	const MAX_TEAR = 0.85;
	// RELEASED PAST THIS (OR DRAGGED TO THE END), THE STRIP AUTO-COMPLETES; BELOW IT, IT SNAPS BACK SEALED
	const COMMIT_AT = 0.7;
	// EACH PEANUT FLIES FOR UP TO FLIGHT_MS AFTER UP TO FLIGHT_DELAY_MS; THE OVERLAY GOES ONCE THE LAST ONE IS OFF-SCREEN
	const SETTLE_MS = 250, FINISH_MS = 400, FLY_MS = 600;
	const FLIGHT_MS = 1100, FLIGHT_DELAY_MS = 100;

	const chain = overlay.querySelector(".tear-chain");
	const tab = overlay.querySelector(".tear-tab");
	chain.style.top = `${STRIP_TOP}px`;
	// THE GRAB AREA: FULL WIDTH (CSS), TWICE THE BOTTOM SLICE'S HEIGHT
	tab.style.height = `${BOTTOM_H * 2}px`;

	// THE FACE'S HEXAGON — SHOULDERS NOTCH px DOWN, FLAT TOP INSET px IN. ONE SET OF POINTS FEEDS THE CLIP SHAPE, THE CUT LINES
	// AND THE SLOT'S MASK, SO THEY ALWAYS LINE UP. SHAPES TAKE THE FACE'S HEIGHT h (THE BOTTOM SLICE IS TALLER). 70 = THE
	// STRIP'S CSS WIDTH
	const STRIP_W = 70, NOTCH = 8, INSET = 15;
	const faceShape = h => `M0 ${h}V${NOTCH}L${INSET} 0H${STRIP_W - INSET}L${STRIP_W} ${NOTCH}V${h}Z`;
	// CUT LINES: BOTH EDGES, NOTHING ACROSS THE STRIP, SO THE NOTCHES STAY OPEN V's LIKE A REAL PERFORATION.
	// THE BOTTOM SLICE (THE PULL END) ALSO GETS ITS BASE LINE, CLOSING THE STRIP OFF
	const edges = h => `M0 ${h}V${NOTCH}L${INSET} 0M${STRIP_W} ${h}V${NOTCH}L${STRIP_W - INSET} 0`;
	const cutLinesSvg = (h, withBase) => `<svg viewBox="0 0 ${STRIP_W} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${edges(h)}${withBase ? `M0 ${h}H${STRIP_W}` : ""}"/></svg>`;

	// THE SLOT'S SHADOW: A BLACK BAND ALONG ITS LEFT EDGES, DENTS INCLUDED. ITS MASK IS THE STRIP'S SEGMENTED SHAPE (THE FACE
	// SHAPE AS A TILE, REPEATED DOWN FROM THE STRIP'S TOP, SO ITS NOTCHES LINE UP SLICE FOR SLICE) MINUS THE SAME SHAPE SHIFTED
	// SHADOW_X px RIGHT AND SHADOW_Y px DOWN — WHAT'S LEFT IS THE BAND, AND THE REST OF THE HOLE STAYS SEE-THROUGH. THE DOWNWARD
	// PART OF THE SHIFT THICKENS THE BAND ON THE SLOPED DENTS, WHERE A SIDEWAYS SHIFT ALONE THINS OUT. IT STAYS PUT; render()
	// REVEALS IT FROM THE TEAR LINE DOWN WITH A clip-path. ONE PER HALF, SO IT SPLITS WITH THE BOX
	const SHADOW_X = 4, SHADOW_Y = 4;
	const slots = [...overlay.querySelectorAll(".tear-slot")];
	const slotTile = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${STRIP_W} ${SLICE_H}"><path d="${faceShape(SLICE_H)}"/></svg>`)}")`;
	slots.forEach(slot => Object.assign(slot.style, {
		top: `${STRIP_TOP}px`,
		maskImage: `${slotTile}, ${slotTile}`, webkitMaskImage: `${slotTile}, ${slotTile}`,
		maskSize: `${STRIP_W}px ${SLICE_H}px`, webkitMaskSize: `${STRIP_W}px ${SLICE_H}px`,
		maskRepeat: "repeat-y", webkitMaskRepeat: "repeat-y",
		maskPosition: `0 0, ${SHADOW_X}px ${SHADOW_Y}px`, webkitMaskPosition: `0 0, ${SHADOW_X}px ${SHADOW_Y}px`,
		// THE TOP LAYER MINUS THE ONE BELOW; source-out IS WEBKIT'S NAME FOR THE SAME
		maskComposite: "subtract", webkitMaskComposite: "source-out",
	}));

	// THE HOLE IN THE BOX: THE STRIP'S NOTCHED OUTLINE FROM THE TEAR LINE DOWN TO ITS END, CUT OUT OF A FULL-SCREEN RECTANGLE
	// WITH evenodd. notchX IS THE OUTLINE'S LEFT x AT y (BOTH ON THE STRIP): IT RUNS IN FROM INSET TO 0 ACROSS THE FIRST NOTCH px
	// OF EACH SLICE, THEN STAYS AT 0; THE RIGHT SIDE MIRRORS IT. ONLY SLICE TOPS HAVE NOTCHES (THE TALL BOTTOM SLICE HAS ONE)
	const boxes = [...overlay.querySelectorAll(".tear-box")];
	const STRIP_X = (SCREEN_W - STRIP_W) / 2;
	const sliceTop = y => Math.min(Math.floor(y / SLICE_H), SLICES - 1) * SLICE_H;
	const notchX = y => {
		const t = y - sliceTop(y);
		return t < NOTCH ? INSET * (1 - t / NOTCH) : 0;
	};
	function holePath(tearLine) {
		const screen = `M0 0H${SCREEN_W}V${SCREEN_H}H0Z`;
		if (tearLine >= STRIP_H) return screen;
		const left = [[notchX(tearLine), tearLine]];
		const firstTop = sliceTop(tearLine);
		if (tearLine - firstTop < NOTCH) left.push([0, firstTop + NOTCH]);
		for (let y = firstTop + SLICE_H; y < STRIP_H - BOTTOM_H + SLICE_H; y += SLICE_H) left.push([0, y], [INSET, y], [0, y + NOTCH]);
		left.push([0, STRIP_H]);
		const right = left.map(([x, y]) => [STRIP_W - x, y]).reverse();
		const points = [...left, ...right].map(([x, y]) => `${STRIP_X + x} ${STRIP_TOP + y}`);
		return `${screen}M${points.join("L")}Z`;
	}

	// THE PACKING: A COLUMN THE STRIP'S SIZE BEHIND BOTH BOX HALVES, SO THE HOLE SHOWS PEANUTS INSTEAD OF THE PAGE. TWO PER ROW,
	// JITTERED AND TURNED AT RANDOM SO THEY READ AS LOOSE FILL; THE COLUMN'S OWN BACKGROUND (THE BOX'S INSIDE) FILLS THE GAPS
	const PEANUTS = 80, PEANUTS_PER_ROW = 2;
	const fill = overlay.querySelector(".tear-fill");
	Object.assign(fill.style, { left: `${STRIP_X}px`, top: `${STRIP_TOP}px`, width: `${STRIP_W}px`, height: `${STRIP_H}px` });
	const rowH = STRIP_H / (PEANUTS / PEANUTS_PER_ROW);
	// THE SAME LIST OF TRANSFORM FUNCTIONS AT REST AND IN FLIGHT, SO THE ANIMATION INTERPOLATES EACH ONE (FULL SPINS INCLUDED)
	// INSTEAD OF FALLING BACK TO MATRIX INTERPOLATION
	const peanutTransform = (dx, dy, dz, turn, flip) => `translate(-50%, -50%) translate3d(${dx}px, ${dy}px, ${dz}px) rotate(${turn}deg) rotateX(${flip}deg)`;
	const peanuts = Array.from({ length: PEANUTS }, (_, i) => {
		const peanut = document.createElement("div");
		peanut.className = "tear-peanut";
		const x = (i % PEANUTS_PER_ROW + 0.5) * STRIP_W / PEANUTS_PER_ROW + (Math.random() - 0.5) * 20;
		const y = (Math.floor(i / PEANUTS_PER_ROW) + 0.5) * rowH + (Math.random() - 0.5) * 10;
		const turn = Math.random() * 180;
		Object.assign(peanut.style, { left: `${x}px`, top: `${y}px`, transform: peanutTransform(0, 0, 0, turn, 0) });
		fill.appendChild(peanut);
		return { peanut, x, y, turn };
	});

	// THE BURST: THE PACKING COMES TO THE FRONT AND EVERY PEANUT FLIES UP, OUT (AWAY FROM THE COLUMN'S MIDDLE) AND AT THE VIEWER:
	// translateZ UNDER THE OVERLAY'S perspective MAKES IT GROW AS IT NEARS. Z STAYS WELL SHORT OF THE 500px perspective, OR A
	// PEANUT WOULD PASS THE VIEWER AND FLIP. EACH LEAVES THROUGH ITS OWN SIDE OF THE SCREEN AT ROUGHLY ITS OWN HEIGHT (A SLIGHT
	// UPWARD DRIFT), SO THE BURST COMES FROM ALL ALONG THE STRIP. dx RUNS FROM ITS SPOT PAST THE SCREEN'S EDGE BY MORE THAN ITS
	// SIZE; THE perspective ONLY PUSHES IT FURTHER OUT, SINCE IT MAGNIFIES AWAY FROM THE SCREEN'S CENTRE
	function burst() {
		overlay.appendChild(fill);
		overlay.classList.add("burst");
		const rand = (min, max) => min + Math.random() * (max - min);
		peanuts.forEach(({ peanut, x, y, turn }) => {
			const screenX = STRIP_X + x;
			const dx = x < STRIP_W / 2 ? -screenX - rand(100, 300) : SCREEN_W - screenX + rand(100, 300);
			const end = peanutTransform(dx, -rand(0, 200), rand(150, 400), turn + rand(-360, 360), rand(-180, 180));
			peanut.animate(
				[{ transform: peanut.style.transform }, { transform: end }],
				{ duration: rand(FLIGHT_MS * 2 / 3, FLIGHT_MS), delay: rand(0, FLIGHT_DELAY_MS), easing: "cubic-bezier(0.2, 0.5, 0.5, 1)", fill: "forwards" },
			);
		});
	}

	// THE LABEL TEARS WITH THE STRIP: EVERY FACE HOLDS A COPY LAID OUT ON THE WHOLE STRIP (SHIFTED UP BY THE SLICE'S OWN
	// POSITION), AND THE FACE'S clip-path KEEPS ONLY ITS OWN PIECE — WHICH THEN CURLS WITH IT. textContent, NOT innerHTML,
	// SO ANY LABEL IS SAFE TO PASS IN
	const labelTemplate = document.createElement("div");
	labelTemplate.className = "tear-text";
	Object.assign(labelTemplate.style, { height: `${STRIP_H}px`, paddingBottom: `${BOTTOM_H + 20}px` });
	labelTemplate.appendChild(document.createElement("span")).textContent = label;

	// EACH SLICE = A HINGE (.tear-seg) HOLDING ITS FRONT (.tear-face), ITS BACK (.tear-back) AND THE NEXT HINGE
	const slices = [];
	let parent = chain;
	for (let i = 0; i < SLICES; i++) {
		const slice = document.createElement("div");
		slice.className = "tear-seg";
		// THE BOTTOM SLICE HANGS OFF NOTHING, SO IT CAN SIMPLY BE TALLER; ITS FACES FILL IT (inset: 0 IN CSS)
		const isBottom = i === SLICES - 1;
		const h = isBottom ? BOTTOM_H : SLICE_H;
		if (isBottom) slice.style.height = `${BOTTOM_H}px`;
		const clip = `path('${faceShape(h)}')`;

		const face = document.createElement("div");
		face.className = "tear-face";
		face.style.clipPath = clip;
		const text = labelTemplate.cloneNode(true);
		text.style.top = `${-i * SLICE_H}px`;
		face.appendChild(text);
		face.insertAdjacentHTML("beforeend", cutLinesSvg(h, isBottom));

		// THE STRIP'S BACK: A PLAIN DARK PINK FACE TURNED TO FACE AWAY. FRONT AND BACK BOTH HIDE WHEN TURNED FROM THE VIEWER,
		// SO A CURLED SLICE SHOWS ITS BACK INSTEAD OF THE FRONT'S MIRRORED LABEL. THE HEXAGON IS SYMMETRIC, SO THE SAME SHAPE
		// FITS THE FLIPPED SIDE
		const back = document.createElement("div");
		back.className = "tear-back";
		back.style.clipPath = clip;
		// THE SAME CUT LINES, HEAVIER (CSS): CURLED, THE BACK'S THICK BLACK RIM READS AS THE STRIP'S THICKNESS — WITHOUT THE 3D
		// LAYERS A REAL THICKNESS NEEDED, WHICH TANKED THE iPHONE
		back.insertAdjacentHTML("beforeend", cutLinesSvg(h, isBottom));

		slice.append(face, back);
		parent.appendChild(slice);
		slices.push(slice);
		parent = slice;
	}

	// BEND IN UNITS OF CURL_ANGLE: LINEAR THROUGH THE ROLL, THEN AN EASING-OUT TAIL. THE TAIL'S LENGTH SCALE IS PICKED SO IT
	// STARTS BENDING AT THE ROLL'S RATE — NO KINK WHERE ONE HANDS OVER TO THE OTHER
	const TAIL = TAIL_CURL / CURL_ANGLE;
	const bend = s => s < CURL_LENGTH
		? s / CURL_LENGTH
		: 1 + TAIL * (1 - Math.exp(-(s - CURL_LENGTH) / (TAIL * CURL_LENGTH)));
	const ease = t => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

	function render(progress) {
		const tearLine = STRIP_H * (1 - progress * MAX_TEAR);
		// THE SHADOW STARTS AT THE STRIP'S TOP, SO tearLine (ON THE STRIP) IS ALSO THE INSET FROM ITS TOP
		const line = Math.max(tearLine, 0);
		slots.forEach(slot => { slot.style.clipPath = `inset(${line}px 0 0 0)`; });
		const hole = `path(evenodd, '${holePath(line)}')`;
		boxes.forEach(box => { box.style.clipPath = hole; });
		let previous = 0;
		slices.forEach((slice, i) => {
			const b = bend(Math.max(0, i * SLICE_H - tearLine));
			slice.style.transform = `rotateX(${(b - previous) * CURL_ANGLE}deg) rotateZ(${(b - previous) * CURL_TWIST}deg)`;
			previous = b;
		});
	}

	let progress = 0;
	let settling = null, completing = false;

	// EASES progress TO target OVER duration; A NEW DRAG CANCELS IT
	function settleTo(target, done, duration = SETTLE_MS) {
		const from = progress, start = performance.now();
		const step = now => {
			const t = Math.min((now - start) / duration, 1);
			progress = from + (target - from) * ease(t);
			render(progress);
			if (t < 1) settling = requestAnimationFrame(step);
			else { settling = null; done?.(); }
		};
		settling = requestAnimationFrame(step);
	}

	// THE SUCCESS TEAR: RUN THE TEAR LINE TO THE VERY TOP (progress 1 / MAX_TEAR = TEAR LINE AT 0), THEN THROW THE WHOLE STRIP
	// OFF UP AND TO THE RIGHT, THE WAY IT CURLS (THE INLINE transform KEEPS THE CSS translateX(-50%) CENTRING). ONCE IT HAS
	// FLOWN THE PACKING BURSTS OUT AND THE BOX VANISHES WITH IT (.burst); ONCE THE LAST PEANUT HAS FADED THE OVERLAY IS REMOVED
	function complete() {
		completing = true;
		dragging = false;
		settleTo(1 / MAX_TEAR, () => {
			chain.style.transition = `transform ${FLY_MS}ms ease-in`;
			chain.style.transform = "translateX(-50%) translate3d(100px, -110vh, 0) rotate(20deg)";
			tab.remove();
			setTimeout(() => {
				burst();
				onBurst?.();
				setTimeout(() => {
					overlay.remove();
					onDone?.();
				}, FLIGHT_DELAY_MS + FLIGHT_MS);
			}, FLY_MS);
		}, FINISH_MS);
	}

	// ONLY A DRAG THAT STARTS ON THE GRAB AREA TEARS; POINTER CAPTURE KEEPS THE MOVES COMING WHEN THE FINGER LEAVES IT.
	// THE TEAR LINE KEEPS THE GAP IT HAD TO THE FINGER AT THE GRAB (grabOffset) AND MOVES WITH THE FINGER FROM THERE: THE GRAB
	// AREA IS FAR TALLER THAN THE STRIP'S END, SO PUTTING THE LINE RIGHT AT THE FINGER WOULD TEAR A CHUNK AT ONCE ON A HIGH
	// GRAB. CLAMPED TO THE DRAGGABLE RANGE; progress IS THAT POSITION ON THE 0–1 SCALE render() USES
	let dragging = false, grabOffset = 0;
	const fingerOnStrip = e => e.clientY - chain.getBoundingClientRect().top;
	function followFinger(e) {
		const tearLine = fingerOnStrip(e) + grabOffset;
		progress = Math.min(Math.max((1 - tearLine / STRIP_H) / MAX_TEAR, 0), 1);
		render(progress);
		if (progress === 1) complete();
	}
	tab.addEventListener("pointerdown", e => {
		if (completing) return;
		cancelAnimationFrame(settling);
		settling = null;
		tab.setPointerCapture(e.pointerId);
		dragging = true;
		grabOffset = STRIP_H * (1 - progress * MAX_TEAR) - fingerOnStrip(e);
	});
	tab.addEventListener("pointermove", e => {
		if (dragging) followFinger(e);
	});
	const release = () => {
		if (!dragging) return;
		dragging = false;
		if (progress >= COMMIT_AT) complete();
		else settleTo(0);
	};
	tab.addEventListener("pointerup", release);
	tab.addEventListener("pointercancel", release);

	render(0);
}
