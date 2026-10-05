const app = document.getElementById("app");

const MSG_ASK_NAME = "Como devemos chamar-te?";
const MSG_ASK_PHONE = "Queres deixar o telefone registado?";
const MSG_ASK_NIF = "Queres deixar o NIF registado?";
const MSG_ONBOARDING_ERROR = "Erro ao guardar. Tenta outra vez.";

// ONBOARDING SLIDESHOW FOR NEW PLAYERS — ONE QUESTION PER STEP, ALL SAVED IN A SINGLE INSERT AT THE END.
// profile.js SENDS PLAYERS HERE WHEN THEY HAVE NO profiles ROW, AND THEY GO BACK THERE ONCE IT EXISTS: THE ROUTER THEN DOES THE
// RETURN TO THE COURT OR THE COURT LIST (returnTo / justLoggedIn ARE LEFT UNTOUCHED HERE FOR IT)
function startOnboarding(user) {
	const collected = { name: '', phone: '', nif: '' };
	let step = 0;

	// NAME IS REQUIRED; PHONE AND NIF ARE OPTIONAL
	const steps = [
		{ question: MSG_ASK_NAME, field: 'name', type: 'text', placeholder: 'Nome', autocomplete: 'name', required: true },
		{ question: MSG_ASK_PHONE, field: 'phone', type: 'tel', placeholder: 'Telefone (opcional)', autocomplete: 'tel', required: false },
		{ question: MSG_ASK_NIF, field: 'nif', type: 'number', placeholder: 'NIF (opcional)', autocomplete: 'off', required: false },
	];

	function render() {
		const s = steps[step];
		const isLast = step === steps.length - 1;
		const isFirst = step === 0;
		// CONTINUE IS BLOCKED ONLY ON THE NAME STEP IF THE FIELD IS EMPTY
		const canAdvance = !s.required || collected[s.field].length > 0;

		app.innerHTML = `
			<p class="card-sub onboarding-step">${step + 1} / ${steps.length}</p>
			<p class="onboarding-question">${s.question}</p>
			<input class="form-input" type="${s.type}" id="onboarding-input"
				placeholder="${s.placeholder}"
				autocomplete="${s.autocomplete}"
				value="${collected[s.field]}">
			<div class="onboarding-actions margin-top-10">
				${!isFirst ? `<button id="back-btn" class="button-shallow">Voltar</button>` : ''}
				<button id="next-btn" ${canAdvance ? '' : 'disabled'}>${isLast ? 'Concluir' : 'Continuar'}</button>
			</div>
			<p class="card-sub margin-top-10 margin-bottom-10" style="font-size: .7em; color: var(--black)">${MSG_DATA_DISCLAIMER}</p>
		`;

		const input = document.getElementById('onboarding-input');
		const nextBtn = document.getElementById('next-btn');

		input.focus();

		// RE-CHECK disabled STATE AS THE USER TYPES ON REQUIRED STEPS
		if (s.required) {
			input.addEventListener('input', () => {
				nextBtn.disabled = !input.value.trim();
			});
		}

		// ENTER KEY ADVANCES LIKE TAPPING CONTINUAR
		input.addEventListener('keydown', e => {
			if (e.key === 'Enter' && !nextBtn.disabled) nextBtn.click();
		});

		if (!isFirst) {
			document.getElementById('back-btn').addEventListener('click', () => {
				// SAVE THE CURRENT FIELD VALUE BEFORE GOING BACK SO IT'S RESTORED ON RETURN
				collected[s.field] = input.value.trim();
				step--;
				render();
			});
		}

		nextBtn.addEventListener('click', async () => {
			collected[s.field] = input.value.trim();
			if (isLast) {
				await finish(nextBtn);
			} else {
				step++;
				render();
			}
		});
	}

	// BUILDS THE INSERT PAYLOAD AND WRITES THE PROFILE; ONLY SETS phone/nif IF THE USER FILLED THEM
	async function finish(nextBtn) {
		nextBtn.disabled = true;
		nextBtn.textContent = 'A guardar...';

		const payload = { id: user.id, name: collected.name };
		if (collected.phone) payload.phone = collected.phone;
		if (collected.nif) payload.nif = collected.nif;

		const { error } = await db.from('profiles').insert(payload);
		if (error) {
			nextBtn.disabled = false;
			nextBtn.textContent = 'Concluir';
			app.insertAdjacentHTML('beforeend', `<p class="form-error">${MSG_ONBOARDING_ERROR}</p>`);
			return;
		}

		location.replace("profile.html");
	}

	render();
}

// A PLAYER WHO ALREADY HAS A PROFILE HAS NOTHING TO DO HERE → BACK TO THE ROUTER
async function loadOnboarding(user) {
	const { data: profile } = await db.from("profiles").select("id").eq("id", user.id).maybeSingle();
	if (profile) {
		location.replace("profile.html");
		return;
	}
	startOnboarding(user);
}

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
