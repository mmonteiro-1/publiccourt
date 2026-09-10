// REPLACE pig <img> TAGS WITH INLINE SVG SO CSS ANIMATIONS REPLAY ON EVERY PAGE LOAD
fetch("images/pig.svg")
	.then(r => r.text())
	.then(svg => {
		document.querySelectorAll("img.logo-pig, img.info-pig").forEach(img => {
			const el = new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;
			el.setAttribute("class", img.className);
			img.replaceWith(el);
			const eye = el.querySelector("#eye");
			if (eye) {
				eye.style.animation = "none";
				el.getBoundingClientRect();
				eye.style.animation = "";
			}
		});
	});

// FORMAT A TIMESTAMP AS HH:MM, SHARED BY EVERY PAGE
function formatTime(ts) {
	return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// MINUTES REMAINING UNTIL A RESERVATION ENDS, SHARED BY EVERY PAGE
function minutesLeft(endsAt) {
	const ms = new Date(endsAt) - Date.now();
	return Math.max(0, Math.ceil(ms / 60000));
}

// PULL-TO-REFRESH FOR IOS STANDALONE MODE
(function () {
	const isStandalone = navigator.standalone || window.matchMedia("(display-mode: standalone)").matches;
	if (!isStandalone) return;

	const THRESHOLD = 100;
	let startY = 0;
	let pulling = false;
	let ghostPig = null;

	function ensureGhostPig() {
		if (ghostPig) return;
		// Match the ghost's position and size to the real header pig.
		const realPig = document.querySelector(".logo-pig");
		const r = realPig ? realPig.getBoundingClientRect() : { top: 12, left: window.innerWidth / 2 - 22, width: 45, height: 45 };
		ghostPig = document.createElement("img");
		ghostPig.src = "images/pig.svg";
		ghostPig.setAttribute("aria-hidden", "true");
		ghostPig.style.cssText = `position:fixed;top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${r.height}px;opacity:0;pointer-events:none;z-index:9999;transform-origin:center`;
		// Must be a child of <html>, not <body> — a CSS transform on body would make
		// position:fixed children relative to body instead of the viewport.
		document.documentElement.appendChild(ghostPig);
	}

	document.addEventListener("touchstart", e => {
		startY = e.touches[0].clientY;
		const mapEl = document.getElementById("map");
		// Only pull when already at the top and not touching the map (which has its own pan gesture).
		pulling = window.scrollY === 0 && !(mapEl && mapEl.contains(e.target));
	}, { passive: true });

	document.addEventListener("touchmove", e => {
		if (!pulling) return;
		const dy = e.touches[0].clientY - startY;
		if (dy <= 0) return;

		ensureGhostPig();

		// Cap displacement so the page doesn't slide past the trigger point.
		const pull = Math.min(dy, THRESHOLD);
		// Snapshot the body color so the strip revealed above the sliding body is seamless.
		document.documentElement.style.background = getComputedStyle(document.body).backgroundColor;
		document.body.style.transition = "none";
		document.body.style.transform = `translateY(${pull}px)`;
		// Spin the ghost pig in proportion to how far the user has pulled.
		ghostPig.style.opacity = "1";
		ghostPig.style.transform = `rotate(${(pull / THRESHOLD) * 360}deg)`;
		// Hide the real pig — it slides away with the body, the ghost covers its original spot.
		const realPig = document.querySelector(".logo-pig");
		if (realPig) realPig.style.visibility = "hidden";
	}, { passive: true });

	document.addEventListener("touchend", e => {
		if (!pulling) return;
		pulling = false;
		const dy = e.changedTouches[0].clientY - startY;

		const realPig = document.querySelector(".logo-pig");
		if (dy >= THRESHOLD) {
			location.reload();
		} else {
			// Animate the page back to its resting position, then clean up all inline styles.
			document.body.style.transition = "transform 0.3s ease";
			document.body.style.transform = "";
			document.body.addEventListener("transitionend", function cleanup() {
				document.body.style.transition = "";
				document.documentElement.style.background = "";
				if (realPig) realPig.style.visibility = "";
				document.body.removeEventListener("transitionend", cleanup);
			}, { once: true });
			if (ghostPig) {
				ghostPig.style.opacity = "0";
				ghostPig.style.transform = "rotate(0deg)";
			}
		}
	}, { passive: true });
})();

// PERSISTENT DEVICE ID FOR TAILORING MESSAGES TO THE RESERVATION OWNER
function getDeviceId() {
	let id = localStorage.getItem("device_id");
	if (!id) { id = crypto.randomUUID(); localStorage.setItem("device_id", id); }
	return id;
}

// CITY LABEL WITH AN OPTIONAL FLAG ICON PREPENDED, SHARED BY EVERY PAGE
function cityHtml(city) {
	const key = city && city.toLowerCase();
	const flag = key === "aveiro" ? `<img src="images/flag_aveiro.svg" class="city-flag" alt="">`
		: key === "vagos" ? `<img src="images/flag_vagos.svg" class="city-flag" alt="">`
		: key === "ílhavo" ? `<img src="images/flag_ilhavo.svg" class="city-flag" alt="">`
		: key === "oliv bairro" ? `<img src="images/flag_ilhavo.svg" class="city-flag" alt="">`
		: "";
	return `<p class="city">${flag}${city || ""}</p>`;
}
