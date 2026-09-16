function playBallAnimation(targetEl) {
	let canvas = document.getElementById('ballCanvas');
	if (!canvas) {
		canvas = document.createElement('canvas');
		canvas.id = 'ballCanvas';
		canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
		document.body.appendChild(canvas);
	}

	const ctx = canvas.getContext('2d');
	const dpr = window.devicePixelRatio || 1;

	canvas.width = window.innerWidth * dpr;
	canvas.height = window.innerHeight * dpr;
	ctx.scale(dpr, dpr);

	const img = new Image();
	img.src = 'images/icon_ball.svg';

	const hitmark = new Image();
	hitmark.src = 'images/hitmark.svg';

	const R = 15;

	// Derive hit coords from the pig element's layout; fall back to screen-based defaults
	let hitX, hitY;
	if (targetEl) {
		const rect = targetEl.getBoundingClientRect();
		hitX = rect.left + rect.width * 0.5;
		hitY = rect.top + rect.height * 0.45;
	} else {
		hitX = window.innerWidth / 2;
		hitY = window.innerHeight - 470;
	}

	const BARRIER_X = () => hitX;
	const HIT_Y = () => hitY;
	const FLOOR = () => HIT_Y() + 130;
	const START_Y = () => HIT_Y() + 80; // ball enters lower, rises diagonally to HIT_Y

	const T_FLY = 200;
	const T_DROP = 350;
	const T_BOUNCE = 1000;
	const T_ROLL = 1000;

	let start = null;

	function easeIn(t) { return t * t; }

	function draw(ts) {
		if (!start) start = ts;
		const elapsed = ts - start;
		ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

		let x, y, done = false;

		if (elapsed < T_FLY) {
			// Diagonal: starts lower (START_Y), rises to HIT_Y, with a slight arc peak
			const t = elapsed / T_FLY;
			x = -R + (BARRIER_X() + R) * easeIn(t);
			y = START_Y() + (HIT_Y() - START_Y()) * t - Math.sin(t * Math.PI) * 20;

		} else if (elapsed < T_FLY + T_DROP) {
			const t = (elapsed - T_FLY) / T_DROP;
			x = BARRIER_X();
			y = HIT_Y() + (FLOOR() - HIT_Y()) * easeIn(t);

		} else if (elapsed < T_FLY + T_DROP + T_BOUNCE) {
			const t = (elapsed - T_FLY - T_DROP) / T_BOUNCE;
			x = BARRIER_X() - t * 100;
			const bounceHeights = [75, 38, 16];
			const splits = [0, 0.42, 0.68, 0.88, 1];
			let seg = 0;
			for (let i = 0; i < splits.length - 1; i++) {
				if (t >= splits[i] && t < splits[i + 1]) { seg = i; break; }
			}
			const segT = (t - splits[seg]) / (splits[seg + 1] - splits[seg]);
			const h = seg < bounceHeights.length ? bounceHeights[seg] : 0;
			const arc = 4 * segT * (1 - segT);
			y = FLOOR() - h * arc;

		} else if (elapsed < T_FLY + T_DROP + T_BOUNCE + T_ROLL) {
			// Roll-out: decelerates to a stop over 1s
			const t = (elapsed - T_FLY - T_DROP - T_BOUNCE) / T_ROLL;
			const ease = 1 - (1 - t) * (1 - t);
			x = BARRIER_X() - 100 - ease * 50;
			y = FLOOR();
		} else {
			x = BARRIER_X() - 150;
			y = FLOOR();
			done = true;
		}

		// Hit mark: show hitmark.svg at barrier impact point, fades over 200ms from drop start
		const dropElapsed = elapsed - T_FLY;
		if (dropElapsed >= 0 && dropElapsed < 100) {
			const hmSize = 30;
			const hmOffsetX = 10;
			const hmOffsetY = 0;
			ctx.drawImage(hitmark, BARRIER_X() - hmSize / 2 + hmOffsetX, HIT_Y() - hmSize / 2 + hmOffsetY, hmSize, hmSize);
		}

		const bounceElapsed = elapsed - T_FLY - T_DROP;
		let angle = 0;
		if (bounceElapsed > 0 && bounceElapsed <= T_BOUNCE) {
			angle = -(bounceElapsed / 1000) * Math.PI * 1.5;
		} else if (bounceElapsed > T_BOUNCE) {
			const rollT = Math.min((bounceElapsed - T_BOUNCE) / T_ROLL, 1);
			angle = -((T_BOUNCE / 1000) * Math.PI * 1.5 + (1 - (1 - rollT) * (1 - rollT)) * Math.PI);
		}
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(angle);
		ctx.drawImage(img, -R, -R, R * 2, R * 2);
		ctx.restore();

		if (!done) requestAnimationFrame(draw);
	}

	function startWhenReady() {
		setTimeout(() => requestAnimationFrame(draw), 2000);
	}

	let ballReady = img.complete;
	let pigReady = !targetEl || targetEl.complete;

	function checkReady() {
		if (ballReady && pigReady) startWhenReady();
	}

	if (!ballReady) img.onload = () => { ballReady = true; checkReady(); };
	if (targetEl && !pigReady) targetEl.addEventListener('load', () => { pigReady = true; checkReady(); });

	checkReady();
}
