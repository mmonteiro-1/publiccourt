const app = document.getElementById("app");

const MSG_ASK_SINCE = "Há quanto tempo jogas ténis?";
const MSG_SINCE_1M = "Há 1 mês";
const MSG_SINCE_1Y = "Há 1 ano";
const MSG_SINCE_10Y = "Há 10 anos";
const MSG_ASK_ABILITY = "De 0 a 100, quão profissional és?";
const MSG_ABILITY_BEGINNER = "Sei segurar a raquete";
const MSG_ABILITY_INTERMEDIATE = "Devolvo quase todas as bolas";
const MSG_ABILITY_ADVANCED = "Treino o serviço sozinho aos domingos";
const MSG_ASK_SUMMER = "Quantas vezes jogas no verão?";
const MSG_SUMMER_RARE = "Só quando os primos de França vêm de férias";
const MSG_SUMMER_OFTEN = "Quando me lembro de praticar exercício";
const MSG_SUMMER_ALWAYS = "Mais vezes do que vejo a família";
const MSG_ASK_TAKEN = "Quando dás de cara com um campo ocupado";
const MSG_TAKEN_GIVE_UP = "Deixo para a próxima e vou aos copos";
const MSG_TAKEN_ASK = "Pergunto aos jogadores se ainda demoram";
const MSG_TAKEN_ELSEWHERE = "Vou logo tentar a sorte noutro campo";
const MSG_ASK_COMPETITIVE = "Os teus jogos costumam ser competitivos?";
const MSG_COMPETITIVE_EXERCISE = "Jogo mais para praticar exercício";
const MSG_COMPETITIVE_SERIOUS = "Não conto pontuação, mas levo a sério";
const MSG_COMPETITIVE_TIEBREAK = "Vou até ao tie-break se precisar";
const MSG_ASK_PAYS = "Já pagaste por aulas ou para jogar?";
const MSG_PAYS_NO = "Tenho mais que fazer, pá";
const MSG_PAYS_MAYBE = "Até pagava, se calhar";
const MSG_PAYS_YES = "Pago com gosto";
const MSG_ASK_PARTNERS = "Com quantos jogadores diferentes costumas jogar?";
const MSG_PARTNERS_ONE = "1: nem conheço outros jogadores";
const MSG_PARTNERS_FEW = "2 ou 3: tenho um backup ou outro";
const MSG_PARTNERS_MANY = "Nem sei dizer, são muitos";
const MSG_ASK_FOUND = "Como descobriste o Campo Livre?";
const MSG_FOUND_QR = "Esbarrei com o QR Code no campo";
const MSG_FOUND_FRIEND = "Um amigo obrigou-me";
const MSG_FOUND_WEB = "Na rede mundial de computadores";
const MSG_ASK_NAME = "Como te devemos chamar?";
const MSG_ONBOARDING_RESUME = "Saíste a meio do questionário, pá.<br>Por pouco não ficámos ofendidos.";
const MSG_ONBOARDING_ERROR = "Erro ao guardar. Tenta outra vez.";
const MSG_SILLY_NAME = name => `Enquanto não escolheres um nome, serás o digníssimo <b>${name}</b>`;

// THE NAME A PLAYER GETS IF THEY LEAVE THE FIELD EMPTY: A TENNIS WORD, A SURNAME, THEN THE TWIST — THE RANKING SHOWS THE INITIAL
// AND THE LAST WORD, SO THE JOKE REACHES THE BOARD ("B. PERDIDA"). SURNAMES KEPT CLEAR OF THE EXAMPLE BOARD'S (DUMMY_RANKING)
const SILLY_NAMES = [
	"Bola Figueiredo Perdida", "Raquete Brandão Torta", "Rede Gouveia Rasgada", "Ace Tavares Falhado",
	"Slice Pinheiro Duvidoso", "Grip Fonseca Suado", "Linha Cardoso Fora", "Smash Teixeira Tímido",
];

// ONE PER PLAYER, FROM THEIR ID, SO IT'S THE SAME ON EVERY VISIT
function sillyName(userId) {
	const sum = [...userId].reduce((total, char) => total + char.charCodeAt(0), 0);
	return SILLY_NAMES[sum % SILLY_NAMES.length];
}

// DEBUG (DEV SERVER ONLY, IS_DEV): ?force ON onboarding.html RUNS THE ONBOARDING FOR A PLAYER WHO ALREADY FINISHED IT, FROM
// THE FIRST STEP, WITH THEIR ANSWERS PICKED. NOTHING IS SAVED; CONCLUIR GOES ON TO THE PROFILE AS USUAL
const FORCE_ONBOARDING = IS_DEV && new URLSearchParams(location.search).has("force");

// EIGHT TAPS, THEN THE NAME. THE CODES ARE WHAT'S STORED (supabase/sql/onboarding.sql), NEVER THE COPY, SO THE WORDING CAN CHANGE
const STEPS = [
	{ field: "playing_since", question: MSG_ASK_SINCE, options: [["1m", MSG_SINCE_1M], ["1y", MSG_SINCE_1Y], ["10y", MSG_SINCE_10Y]] },
	{ field: "ability", question: MSG_ASK_ABILITY, options: [["beginner", MSG_ABILITY_BEGINNER], ["intermediate", MSG_ABILITY_INTERMEDIATE], ["advanced", MSG_ABILITY_ADVANCED]] },
	{ field: "summer_play", question: MSG_ASK_SUMMER, options: [["rare", MSG_SUMMER_RARE], ["often", MSG_SUMMER_OFTEN], ["always", MSG_SUMMER_ALWAYS]] },
	{ field: "court_taken", question: MSG_ASK_TAKEN, options: [["give_up", MSG_TAKEN_GIVE_UP], ["ask", MSG_TAKEN_ASK], ["elsewhere", MSG_TAKEN_ELSEWHERE]] },
	{ field: "competitiveness", question: MSG_ASK_COMPETITIVE, options: [["exercise", MSG_COMPETITIVE_EXERCISE], ["serious", MSG_COMPETITIVE_SERIOUS], ["competitive", MSG_COMPETITIVE_TIEBREAK]] },
	{ field: "pays_to_play", question: MSG_ASK_PAYS, options: [["no", MSG_PAYS_NO], ["maybe", MSG_PAYS_MAYBE], ["yes", MSG_PAYS_YES]] },
	{ field: "partner_count", question: MSG_ASK_PARTNERS, options: [["one", MSG_PARTNERS_ONE], ["few", MSG_PARTNERS_FEW], ["many", MSG_PARTNERS_MANY]] },
	{ field: "found_via", question: MSG_ASK_FOUND, options: [["qr", MSG_FOUND_QR], ["friend", MSG_FOUND_FRIEND], ["web", MSG_FOUND_WEB]] },
	{ field: "name", question: MSG_ASK_NAME },
];

// ONE QUESTION PER STEP, EACH SAVED AS IT'S ANSWERED, SO LEAVING NEVER LOSES ANSWERS: THE FIRST ONE CREATES THE profiles ROW
// (NO NAME YET), THE NAME SETS onboarded_at. profile.js SENDS PLAYERS HERE UNTIL IT'S SET, AND THEY GO BACK THERE ONCE IT IS:
// THE ROUTER THEN DOES THE RETURN TO THE COURT OR THE COURT LIST (returnTo / justLoggedIn ARE LEFT UNTOUCHED HERE FOR IT)
function startOnboarding(user, profile) {
	const answers = { ...profile };
	// RESUMES AT THE FIRST UNANSWERED STEP
	let step = FORCE_ONBOARDING ? 0 : Math.max(STEPS.findIndex(s => !answers[s.field]), 0);
	// A PLAYER WHO LEFT HALFWAY IS TOLD SO, ON THE STEP THEY COME BACK TO ONLY — GONE ONCE THEY MOVE
	let resuming = !FORCE_ONBOARDING && STEPS.some(s => answers[s.field]);

	// upsert: THE FIRST SAVE INSERTS THE ROW, EVERY LATER ONE ONLY TOUCHES ITS OWN COLUMNS
	async function save(fields) {
		if (FORCE_ONBOARDING) return true;
		const { error } = await db.from("profiles").upsert({ id: user.id, ...fields });
		if (error && !app.querySelector(".form-error")) {
			app.insertAdjacentHTML("beforeend", `<p class="form-error">${MSG_ONBOARDING_ERROR}</p>`);
		}
		return !error;
	}

	function render() {
		const s = STEPS[step];
		const answer = answers[s.field];
		// THE PICKED ANSWER IS SOLID, THE OTHERS SHALLOW. A STEP OPENS WITH ITS SAVED ANSWER PICKED, OR THE FIRST ONE, SO
		// AVANÇAR IS NEVER DISABLED. PICKING DOESN'T MOVE ON — AVANÇAR SAVES AND MOVES ON, SO A MIS-TAP IS NEVER SAVED
		let picked = s.options ? answer || s.options[0][0] : null;
		const resumeLine = resuming;
		resuming = false;
		// THE PROGRESS, UNDER THE ANSWERS: THE XP BAR'S LOOK, FILLED UP TO THIS STEP
		app.innerHTML = `
			${resumeLine ? `<p class="card-sub">${MSG_ONBOARDING_RESUME}</p>` : ""}
			<p class="onboarding-question">${s.question}</p>
			${s.options ? `
				<div class="onboarding-options">
					${s.options.map(([code, label]) => `
						<button data-code="${code}" class="${code === picked ? "" : "button-shallow"}">${label}</button>
					`).join("")}
				</div>
			` : `
				<input class="form-input" type="text" id="onboarding-input" placeholder="${sillyName(user.id)}" autocomplete="name">
				<p class="card-sub margin-top-10">${MSG_SILLY_NAME(sillyName(user.id))}</p>
			`}
			<div class="xp-bar margin-top-10" style="--fill: ${(step + 1) / STEPS.length * 100}%"><div></div></div>
			<div class="onboarding-actions">
				${step > 0 ? `<button id="back-btn" class="button-shallow">Voltar</button>` : ""}
				<button id="next-btn">${s.options ? "Avançar" : "Concluir"}</button>
			</div>
		`;

		const nextBtn = document.getElementById("next-btn");

		document.getElementById("back-btn")?.addEventListener("click", () => {
			step--;
			render();
		});

		if (s.options) {
			const buttons = app.querySelectorAll("[data-code]");
			buttons.forEach(btn => btn.addEventListener("click", () => {
				picked = btn.dataset.code;
				buttons.forEach(b => b.classList.toggle("button-shallow", b !== btn));
			}));
			nextBtn.addEventListener("click", async () => {
				if (picked !== answer) {
					nextBtn.disabled = true;
					if (!await save({ [s.field]: picked })) {
						nextBtn.disabled = false;
						return;
					}
					answers[s.field] = picked;
				}
				step++;
				render();
			});
			return;
		}

		const input = document.getElementById("onboarding-input");
		// SET HERE, NOT IN THE value ATTRIBUTE, SO A NAME WITH A " CAN'T BREAK THE MARKUP
		input.value = answer || "";
		input.focus();
		input.addEventListener("keydown", e => {
			if (e.key === "Enter" && !nextBtn.disabled) nextBtn.click();
		});
		// NEVER BLOCKED: AN EMPTY FIELD SAVES THE SILLY NAME IN ITS PLACEHOLDER
		nextBtn.addEventListener("click", async () => {
			nextBtn.disabled = true;
			nextBtn.textContent = "A guardar...";
			if (!await save({ name: input.value.trim() || sillyName(user.id), onboarded_at: new Date().toISOString() })) {
				nextBtn.disabled = false;
				nextBtn.textContent = "Concluir";
				return;
			}
			location.replace("profile.html");
		});
	}

	render();
}

// A PLAYER WHO FINISHED HAS NOTHING TO DO HERE → BACK TO THE ROUTER. A ROW WITHOUT onboarded_at IS A PLAYER WHO LEFT HALFWAY
async function loadOnboarding(user) {
	const { data: profile } = await db.from("profiles")
		.select("playing_since, ability, summer_play, court_taken, competitiveness, pays_to_play, partner_count, found_via, name, onboarded_at")
		.eq("id", user.id)
		.maybeSingle();
	if (profile?.onboarded_at && !FORCE_ONBOARDING) {
		location.replace("profile.html");
		return;
	}
	startOnboarding(user, profile || {});
}

// "CONTINUAR DEPOIS" MAKES THEM A PLAYER WHO LEFT HALFWAY: WITHOUT justLoggedIn THE ROUTER (profile.js) SHOWS THE TEASER
// PROFILE INSTEAD OF SENDING THEM BACK HERE. returnTo GOES TOO — THEY CHOSE THE COURT LIST, NOT THE COURT THEY LOGGED IN FROM
document.getElementById("back-link").addEventListener("click", () => {
	try {
		localStorage.removeItem("justLoggedIn");
		localStorage.removeItem("returnTo");
	} catch {}
});

// SAME SESSION HANDLING AS profile.js: getSession() CAN RETURN null DURING A TOKEN REFRESH, SO WAIT FOR onAuthStateChange.
// NOT AWAITED INSIDE THE CALLBACK — A DATABASE CALL AWAITED THERE CAN DEADLOCK SUPABASE'S AUTH LOCK. NO SESSION → LOGIN
let loaded = false;
db.auth.onAuthStateChange((event, session) => {
	if (session) {
		if (!loaded) {
			loaded = true;
			loadOnboarding(session.user);
		}
	} else if (event === "INITIAL_SESSION" || event === "SIGNED_OUT") {
		location.replace("login.html");
	}
});
