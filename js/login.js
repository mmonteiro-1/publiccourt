const app = document.getElementById("app");
const form = document.getElementById("login-form");

const MSG_PIG_NEW = "Já não tás a brincar";
const MSG_INTRO_NEW = "Joga em campos privados, acompanha o teu progresso, guarda o histórico e encontra parceiros de jogo.";
const MSG_LOGIN_OPTIONAL = "O email introduzido abaixo será o teu método de login, e não é necessário se quiseres apenas jogar nos campos abertos.";
const MSG_INTRO_RETURNING = "Bom tê-lo de volta";
const MSG_SENDING = "A enviar...";
const MSG_SEND_ERROR = "Algo correu mal. Tenta outra vez.";
const MSG_SENT = "Enviámos um código para o teu email. Escreve-o abaixo para entrar.";
const MSG_VERIFYING = "A entrar...";
const MSG_CODE_ERROR = "Código errado ou expirado. Confirma-o ou pede um novo.";
const MSG_RESENT = "Enviámos um código novo.";

// SET BY profile.js ONCE A SESSION EXISTS. PER DEVICE ONLY: A RETURNING PLAYER ON A NEW PHONE SEES THE
// NEWCOMER COPY, SO IT MUST STILL MAKE SENSE FOR THEM. ASKING THE SERVER WOULD EXPOSE WHICH EMAILS HAVE ACCOUNTS
let hasLoggedIn = false;
try { hasLoggedIn = localStorage.getItem("hasLoggedIn") === "1"; } catch {}
document.getElementById("login-intro").innerHTML = hasLoggedIn ? MSG_INTRO_RETURNING : MSG_INTRO_NEW;
if (!hasLoggedIn) {
	setPigAppearance(document.getElementById("login-pig"), MSG_PIG_NEW, "pig_reaching");
	const note = document.getElementById("login-note");
	note.textContent = MSG_LOGIN_OPTIONAL;
	note.hidden = false;
}

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
