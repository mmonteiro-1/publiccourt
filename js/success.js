// EVERYTHING ABOUT THE SUCCESS SCREENS LIVES HERE: COPY, PIG, COUNTDOWN AND ANIMATION PER SCREEN, PLUS THE RENDERER.
// OTHER FILES ONLY PICK A PRESET AND PASS ITS DYNAMIC PARTS: showSuccess(SUCCESS.booked(gameLabel(start, end)))

const MSG_WALKIN_STARTED = "Obrigado por avisar os outros jogadores.";
const MSG_WALKIN_FINISHED = "Por avisar que o campo ficou livre.";
const MSG_BOOKED = gameText => `Tens jogo marcado para ${gameText}.`;
const MSG_BOOKING_CANCELLED = gameText => `Cancelaste o jogo marcado para ${gameText}.`;
const MSG_BOOKING_CANCELLED_FREED = "O horário volta a ficar livre para outro jogador.";
const MSG_ONBOARDED = "Já te conhecemos melhor. Agora é ir para o campo e começar a somar XP.";

// ONE PRESET PER SCREEN. sub2 IS OPTIONAL; animation IS "ball" OR OMITTED; next IS WHERE THE COUNTDOWN GOES (A RELOAD IF OMITTED)
const SUCCESS = {
	// THE PROFILE IS THE ROUTER: IT SENDS THEM ON TO THE COURT THEY LOGGED IN FROM, OR THE COURT LIST
	onboarded: () => ({ pig: "pig_serving", header: "Tudo pronto", sub1: MSG_ONBOARDED, seconds: 6, animation: "ball", next: "profile.html" }),
	walkInStarted: () => ({ pig: "pig_sitting", header: "Bom jogo", sub1: MSG_WALKIN_STARTED, seconds: 10, animation: "ball" }),
	walkInFinished: () => ({ pig: "pig_serving", header: "Obrigado", sub1: MSG_WALKIN_FINISHED, seconds: 6 }),
	booked: gameText => ({ pig: "pig_sitting", header: "Jogo reservado", sub1: MSG_BOOKED(gameText), seconds: 10, animation: "ball" }),
	// NO BALL: A CELEBRATION WOULD CLASH WITH THE SAD TONE
	bookingCancelled: gameText => ({ pig: "pig_sitting", header: "Jogo cancelado", sub1: MSG_BOOKING_CANCELLED(gameText), sub2: MSG_BOOKING_CANCELLED_FREED, seconds: 6 }),
};

// FULL-SCREEN VIEW, THEN A COUNTDOWN THAT RELOADS THE PAGE. RELOAD RATHER THAN REDIRECT SO THE PAGE
// RE-FETCHES THE STATE THE ACTION JUST CHANGED — UNLESS THE PRESET SAYS WHERE TO GO NEXT (ONBOARDING HAS NOTHING TO RELOAD)
function showSuccess({ pig, header, sub1, sub2 = "", seconds, animation = null, next = null }) {
	const app = document.getElementById("app");
	document.body.classList.remove("inuse");
	document.body.classList.add("success");
	document.querySelector(".deck")?.classList.remove("flipped");
	app.classList.remove("available", "inuse");
	// THE COURT PAGE'S FOOTER; OTHER PAGES HAVE NONE
	const footer = document.getElementById("court-footer");
	if (footer) footer.innerHTML = "";

	app.innerHTML = `
		<div class="info-hero">
			<img src="images/${pig}.svg" class="info-pig" alt="">
		</div>
		<p class="info-heading">${header}</p>
		<p class="info-sub1 margin-top-10">${sub1}</p>
		${sub2 ? `<p class="info-sub2 margin-top-10">${sub2}</p>` : ""}
	`;
	const bg = document.createElement("div");
	bg.className = "success-bg";
	document.body.appendChild(bg);
	if (animation === "ball") playBallAnimation(app.querySelector(".info-pig"));

	const countdownEl = document.createElement("div");
	countdownEl.className = "bom-jogo-countdown";
	let secs = seconds;
	countdownEl.textContent = secs;
	document.body.appendChild(countdownEl);

	const ticker = setInterval(() => {
		secs--;
		countdownEl.textContent = secs;
	}, 1000);

	// ONE EXTRA SECOND SO "0" IS ACTUALLY SEEN; clearInterval FIRST SO NO TICK FIRES DURING UNLOAD
	setTimeout(() => {
		clearInterval(ticker);
		if (next) location.replace(next);
		else location.reload();
	}, (seconds + 1) * 1000);
}
