const app = document.getElementById("app");
const form = document.getElementById("login-form");

// Already logged in — go straight to profile
db.auth.getSession().then(({ data: { session } }) => {
	if (session) location.href = "profile.html";
});

form.addEventListener("submit", async (e) => {
	e.preventDefault();

	const name = document.getElementById("name-input").value.trim();
	const email = document.getElementById("email-input").value.trim();
	const btn = form.querySelector("button");

	btn.disabled = true;
	btn.textContent = "A enviar...";

	const { error } = await db.auth.signInWithOtp({
		email,
		options: {
			data: { name },
			emailRedirectTo: `${location.origin}/profile.html`,
		},
	});

	if (error) {
		btn.disabled = false;
		btn.textContent = "Entrar";
		app.innerHTML = `<p class="form-error">Algo correu mal. Tenta outra vez.</p>`;
		return;
	}

	app.innerHTML = `
		<p class="form-sent">Enviámos um link para <strong>${email}</strong>.<br>Clica nele para entrar.</p>
	`;
});
