const app = document.getElementById("app");
const form = document.getElementById("login-form");

const MSG_PIG_NEW = "Já não tás a brincar";
const MSG_INTRO_NEW = "Joga em campos privados, acompanha o teu progresso, guarda o histórico e encontra parceiros de jogo.";
const MSG_LOGIN_OPTIONAL = "O email introduzido abaixo será o teu método de login, e não é necessário se quiseres apenas jogar nos campos abertos.";
const MSG_INTRO_RETURNING = "Bom tê-lo de volta";
const MSG_SENDING = "A enviar...";
const MSG_SEND_ERROR = "Algo correu mal. Tenta outra vez.";
const MSG_SENT = email => `Enviámos um link de acesso para <strong>${email}</strong>. Clica no link para entrar.`;

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

form.addEventListener("submit", async (e) => {
	e.preventDefault();

	const email = document.getElementById("email-input").value.trim();
	const btn = form.querySelector("button");
	const btnHtml = btn.innerHTML;

	btn.disabled = true;
	btn.textContent = MSG_SENDING;
	// LETS profile.js SEND THE PLAYER TO THE COURT LIST WHEN THE MAGIC LINK LANDS, INSTEAD OF THE PROFILE
	try { localStorage.setItem("justLoggedIn", "1"); } catch {}

	const { error } = await db.auth.signInWithOtp({
		email,
		options: { emailRedirectTo: `${location.origin}/profile.html` },
	});

	if (error) {
		btn.disabled = false;
		btn.innerHTML = btnHtml;
		// APPENDED, NOT REPLACING app — OVERWRITING IT WOULD DELETE THE FORM AND LEAVE NOTHING TO RETRY WITH
		form.querySelector(".form-error")?.remove();
		form.insertAdjacentHTML("beforeend", `<p class="form-error">${MSG_SEND_ERROR}</p>`);
		return;
	}

	app.innerHTML = `
		<p class="form-sent">${MSG_SENT(email)}</p>
	`;
});
