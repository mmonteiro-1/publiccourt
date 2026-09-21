// REPLACE pig <img> TAGS WITH INLINE SVG SO CSS ANIMATIONS REPLAY ON EVERY PAGE LOAD
// <img> tags share a cached resource — the browser won't re-run the SVG animation on navigation.
// Swapping to an inline <svg> gives each page its own independent animation timeline.
fetch("images/pig.svg")
	.then(r => r.text())
	.then(svg => {
		document.querySelectorAll("img.logo-pig, img.info-pig").forEach(img => {
			const el = new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;
			el.setAttribute("class", img.className);
			img.replaceWith(el);
			const eye = el.querySelector("#eye");
			if (eye) {
				// Force a style flush before re-enabling the animation so it restarts from frame 0.
				// Without getBoundingClientRect() the browser may batch both writes and skip the restart.
				eye.style.animation = "none";
				el.getBoundingClientRect();
				eye.style.animation = "";
			}
		});
	});
