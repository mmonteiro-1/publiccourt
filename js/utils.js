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
	const THRESHOLD = 80;
	let startY = 0;
	let pulling = false;
	let indicator = null;

	function getIndicator() {
		if (!indicator) {
			indicator = document.createElement("div");
			indicator.style.cssText = "position:fixed;top:0;left:0;right:0;display:flex;justify-content:center;padding:12px;transform:translateY(-100%);transition:transform 0.2s;z-index:9999;pointer-events:none";
			indicator.innerHTML = `<img src="images/icon_refresh.svg" alt="" style="opacity:0.6">`;
			document.body.appendChild(indicator);
		}
		return indicator;
	}

	document.addEventListener("touchstart", e => {
		startY = e.touches[0].clientY;
		pulling = window.scrollY === 0;
	}, { passive: true });

	document.addEventListener("touchmove", e => {
		if (!pulling) return;
		const dy = e.touches[0].clientY - startY;
		if (dy <= 0) return;
		const pct = Math.min(dy / THRESHOLD, 1);
		getIndicator().style.transform = `translateY(${-100 + pct * 100}%)`;
	}, { passive: true });

	document.addEventListener("touchend", e => {
		if (!pulling) return;
		pulling = false;
		const dy = e.changedTouches[0].clientY - startY;
		if (dy >= THRESHOLD) {
			location.reload();
		} else {
			getIndicator().style.transform = "translateY(-100%)";
		}
	}, { passive: true });
})();

// CITY LABEL WITH AN OPTIONAL FLAG ICON PREPENDED, SHARED BY EVERY PAGE
function cityHtml(city) {
	const key = city && city.toLowerCase();
	const flag = key === "aveiro" ? `<img src="images/flag_aveiro.svg" class="city-flag" alt="">`
		: key === "vagos" ? `<img src="images/flag_vagos.svg" class="city-flag" alt="">`
		: key === "ílhavo" ? `<img src="images/flag_ilhavo.svg" class="city-flag" alt="">`
		: "";
	return `<p class="city">${flag}${city || ""}</p>`;
}
