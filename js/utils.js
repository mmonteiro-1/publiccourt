// REPLACE pig <img> TAGS WITH INLINE SVG SO CSS ANIMATIONS REPLAY ON EVERY PAGE LOAD
fetch("css/pig.svg")
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
