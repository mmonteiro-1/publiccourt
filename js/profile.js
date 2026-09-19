const app = document.getElementById("app");

async function loadProfile(user) {
	let { data: profile } = await db
		.from("profiles")
		.select("name")
		.eq("id", user.id)
		.single();

	if (!profile) {
		const name = user.user_metadata?.name || "";
		const { data: created } = await db
			.from("profiles")
			.insert({ id: user.id, name })
			.select("name")
			.single();
		profile = created;
	}

	if (!profile) {
		app.innerHTML = `<p class="form-error">Erro ao carregar perfil.</p>`;
		return;
	}

	app.innerHTML = `
		<p class="profile-name">Olá, ${profile.name}</p>
		<p class="profile-email">${user.email}</p>
		<button class="form-btn" id="logout-btn">Sair</button>
	`;
	document.getElementById("logout-btn").addEventListener("click", async () => {
		await db.auth.signOut();
		location.href = "login.html";
	});
}

db.auth.onAuthStateChange((event, session) => {
	if (session) {
		loadProfile(session.user);
	} else if (event === "INITIAL_SESSION") {
		location.href = "login.html";
	}
});
