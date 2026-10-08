const app = document.getElementById("app");
const form = document.getElementById("login-form");

// WHAT HAPPENS NEXT, NOT A PITCH — THE PITCH LIVES IN info.html ("PORQUÊ LOGIN")
const MSG_NOTE_NEW = "O email introduzido abaixo será o teu método de login. Enviaremos um código para ser introduzido aqui.";
const MSG_NOTE_RETURNING = "Entra com o email que utilizaste para criar a conta. Vamos enviar o código para lá.";
const MSG_SWITCH_TO_RETURNING = `Já tens conta? Então <a href="#">entra</a>!`;
const MSG_SWITCH_TO_NEW = `Ainda não tens conta? <a href="#">Cria uma</a>`;
const MSG_SENDING = "A enviar...";
const MSG_SEND_ERROR = "Algo correu mal. Tenta outra vez.";
const MSG_SENT = "Enviámos um código para o teu email. Escreve-o abaixo para entrar.";
const MSG_VERIFYING = "A entrar...";
const MSG_CODE_ERROR = "Código errado ou expirado. Confirma-o ou pede um novo.";
const MSG_RESENT = "Enviámos um código novo.";

// CREATE ACCOUNT OR LOG IN: THE PLAYER PICKS, NO FLAG GUESSES. ONLY THE COPY CHANGES — BOTH SEND THE SAME signInWithOtp, WHICH
// CREATES THE ACCOUNT FOR A NEW EMAIL, SO THE WRONG CHOICE STILL WORKS. NEVER shouldCreateUser: false FOR "ENTRA": A NEWCOMER
// WHO PICKED IT WOULD HIT AN ERROR, AND THE REFUSAL WOULD TELL ANYONE WHICH EMAILS HAVE ACCOUNTS. WHETHER THE PLAYER IS NEW IS
// DECIDED AFTER THE CODE, BY THE profiles ROW (profile.js → onboarding). OPENS ON CREATE: AT LAUNCH EVERY ACCOUNT IS NEW
const loginSwitch = document.getElementById("login-switch");

function showMode(isNew) {
	document.getElementById("login-title").textContent = isNew ? "Criar conta" : "Entrar";
	document.getElementById("login-note").textContent = isNew ? MSG_NOTE_NEW : MSG_NOTE_RETURNING;
	loginSwitch.innerHTML = isNew ? MSG_SWITCH_TO_RETURNING : MSG_SWITCH_TO_NEW;
	loginSwitch.querySelector("a").addEventListener("click", event => {
		event.preventDefault();
		showMode(!isNew);
	});
}
showMode(true);

// ALREADY LOGGED IN — SKIP THE FORM AND GO STRAIGHT TO PROFILE
db.auth.getSession().then(({ data: { session } }) => {
	if (session) location.href = "profile.html";
});

// ONE MESSAGE AT A TIME UNDER THE FORM: AN ERROR (ORANGE) OR A NEUTRAL NOTE
function showMessage(container, message, cls = "form-error") {
	container.querySelector("[data-message]")?.remove();
	container.insertAdjacentHTML("beforeend", `<p class="${cls}" data-message>${message}</p>`);
}

// A CODE, NOT A MAGIC LINK: THE PLAYER TYPES IT WHERE THEY ASKED FOR IT, SO THE SESSION LANDS THERE. A LINK OPENS IN
// WHATEVER BROWSER THE MAIL APP PICKS — ON iOS NEVER THE INSTALLED APP, WHICH KEEPS ITS OWN STORAGE AND STAYED LOGGED OUT.
// THE EMAIL TEMPLATES ("Magic Link" AND "Confirm signup") CARRY {{ .Token }}, NOT A LINK
form.addEventListener("submit", async (e) => {
	e.preventDefault();

	const email = document.getElementById("email-input").value.trim();
	const btn = form.querySelector("button");
	const btnHtml = btn.innerHTML;

	btn.disabled = true;
	btn.textContent = MSG_SENDING;

	const { error } = await db.auth.signInWithOtp({ email });

	if (error) {
		btn.disabled = false;
		btn.innerHTML = btnHtml;
		// APPENDED, NOT REPLACING app — OVERWRITING IT WOULD DELETE THE FORM AND LEAVE NOTHING TO RETRY WITH
		showMessage(form, MSG_SEND_ERROR);
		return;
	}

	showCodeForm(email);
});

function showCodeForm(email) {
	app.innerHTML = `
		<form id="code-form">
			<p class="info-sub1">${MSG_SENT}</p>
			<input class="form-input" type="text" id="code-input" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="Código" required>
			<button type="submit"><img src="images/icon_login.svg" alt="">Entrar</button>
			<button type="button" class="button-shallow" id="resend-btn">Pedir novo código</button>
		</form>
	`;
	const codeForm = document.getElementById("code-form");
	const input = document.getElementById("code-input");
	input.focus();

	codeForm.addEventListener("submit", async (e) => {
		e.preventDefault();
		const btn = codeForm.querySelector('button[type="submit"]');
		const btnHtml = btn.innerHTML;
		btn.disabled = true;
		btn.textContent = MSG_VERIFYING;

		const { error } = await db.auth.verifyOtp({ email, token: input.value.replace(/\D/g, ""), type: "email" });

		if (error) {
			btn.disabled = false;
			btn.innerHTML = btnHtml;
			showMessage(codeForm, MSG_CODE_ERROR);
			return;
		}
		// SET ONLY ONCE THE LOGIN REALLY HAPPENED, SO A CODE NEVER TYPED LEAVES NO STALE FLAG BEHIND.
		// profile.js THEN ROUTES: ADMIN DASHBOARD, ONBOARDING, BACK TO THE COURT (returnTo) OR THE COURT LIST
		try { localStorage.setItem("justLoggedIn", "1"); } catch {}
		location.href = "profile.html";
	});

	document.getElementById("resend-btn").addEventListener("click", async () => {
		const { error } = await db.auth.signInWithOtp({ email });
		if (error) showMessage(codeForm, MSG_SEND_ERROR);
		else showMessage(codeForm, MSG_RESENT, "info-sub2");
	});
}
