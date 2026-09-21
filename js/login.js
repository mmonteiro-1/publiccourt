const app = document.getElementById("app");
const form = document.getElementById("login-form");

// ALREADY LOGGED IN — SKIP THE FORM AND GO STRAIGHT TO PROFILE
db.auth.getSession().then(({ data: { session } }) => {
	if (session) location.href = "profile.html";
});

form.addEventListener("submit", async (e) => {
	e.preventDefault();

	const email = document.getElementById("email-input").value.trim();
	const btn = form.querySelector("button");

	btn.disabled = true;
	btn.textContent = "A enviar...";

	const { error } = await db.auth.signInWithOtp({
		email,
		options: { emailRedirectTo: `${location.origin}/profile.html` },
	});

	if (error) {
		btn.disabled = false;
		btn.textContent = "Entrar";
		app.innerHTML = `<p class="form-error">Algo correu mal. Tenta outra vez.</p>`;
		return;
	}

	app.innerHTML = `
		<p class="form-sent">Enviámos um link de acesso para <strong>${email}</strong>. Abre o email e clica no link para entrar.</p>
	`;
});
