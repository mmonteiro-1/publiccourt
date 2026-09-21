export const COURT_CUSTOM_IMAGES = {
	"5": { src: "/images/court_iso_costa1.svg", height: 120 },
	"6": { src: "/images/court_iso_costa2.svg", height: 120 },
};

export function initDeck() {
	const deck = document.querySelector(".deck");
	const mainCard = document.getElementById("app");
	const secondaryCard = document.getElementById("secondary-card");
	const closeBtn = document.getElementById("secondary-close");
	if (!deck || !mainCard || !secondaryCard) return;

	const ANIM_MS = 600;
	let animating = false;

	function flipDeck() {
		if (animating) return;
		animating = true;

		const isFlipped = deck.classList.contains("flipped");
		const topCard = isFlipped ? secondaryCard : mainCard;
		const bottomCard = isFlipped ? mainCard : secondaryCard;

		topCard.classList.add("to-back");
		bottomCard.classList.add("to-front");

		const mid = setTimeout(() => {
			topCard.style.zIndex = "0";
			bottomCard.style.zIndex = "2";
		}, ANIM_MS / 2);

		topCard.addEventListener("animationend", () => {
			clearTimeout(mid);
			topCard.classList.remove("to-back");
			bottomCard.classList.remove("to-front");
			topCard.style.zIndex = "";
			bottomCard.style.zIndex = "";
			deck.classList.toggle("flipped");
			animating = false;
		}, { once: true });
	}

	closeBtn?.addEventListener("click", flipDeck);

	deck.addEventListener("click", e => {
		if (e.target.closest("[data-action='flip-deck']")) flipDeck();
	});
}

export function renderSecondaryCard(court) {
	const secondary = document.getElementById("secondary-card");
	if (!secondary) return;
	secondary.querySelector(".secondary-content")?.remove();
	const content = document.createElement("div");
	content.className = "secondary-content";
	content.innerHTML = `<div id="secondary-info"></div><div id="court-stats"></div>`;
	secondary.querySelector(".secondary-close").insertAdjacentElement("afterend", content);
}

export function setSecondaryCardInfo(html) {
	const el = document.getElementById("secondary-info");
	if (el) el.innerHTML = html;
}

export async function loadHourlyChart(courtId) {
	const statsEl = document.getElementById("court-stats");
	if (!statsEl) return;

	const DAYS = 15;
	const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
	const { data } = await db
		.from("walk_ins")
		.select("started_at, ends_at, manual_finished_at")
		.eq("court_id", courtId)
		.gte("started_at", since.toISOString());

	const HOURS = Array.from({ length: 10 }, (_, i) => i + 10);

	let weekdayDays = 0, weekendDays = 0;
	for (let i = 0; i < DAYS; i++) {
		const dow = new Date(since.getTime() + i * 24 * 60 * 60 * 1000).getDay();
		if (dow === 0 || dow === 6) weekendDays++; else weekdayDays++;
	}

	const weekday = {}, weekend = {};
	HOURS.forEach(h => { weekday[h] = 0; weekend[h] = 0; });

	(data || []).forEach(r => {
		const start = new Date(r.started_at);
		const end = new Date(r.manual_finished_at ?? r.ends_at);
		const dow = start.getDay();
		const startH = start.getHours() + start.getMinutes() / 60;
		const endH = end.getHours() + end.getMinutes() / 60;
		const target = (dow === 0 || dow === 6) ? weekend : weekday;
		HOURS.forEach(h => {
			const overlap = Math.max(0, Math.min(endH, h + 1) - Math.max(startH, h));
			target[h] += overlap;
		});
	});

	const toRate = (occupiedHours, days) => Math.min(0.8, occupiedHours / days);
	const hasData = (data || []).length > 0;

	if (!hasData) {
		const rand = (min, max) => Math.random() * (max - min) + min;
		HOURS.forEach(h => {
			weekday[h] = (h >= 16 && h <= 18) ? rand(0.5, 0.75) : rand(0.1, 0.3);
			weekend[h] = (h >= 10 && h <= 12) ? rand(0.4, 0.75) : (h >= 15 && h <= 18 ? rand(0.35, 0.65) : rand(0.05, 0.2));
		});
	}

	const rate = h => ({
		wd: hasData ? toRate(weekday[h], weekdayDays) : weekday[h],
		we: hasData ? toRate(weekend[h], weekendDays) : weekend[h],
	});

	statsEl.innerHTML = `
		<div class="secondary-card-title">Taxa de ocupação por hora</div>
		<div class="chart-legend">(% de vezes em que o campo esteve ocupado)</div>
		<div class="court-chart">
			<div class="chart-area">
				<div class="chart-y-axis">
					<span class="chart-y-label">100%</span>
					<span class="chart-y-label">50%</span>
					<span class="chart-y-label">0%</span>
				</div>
				<div class="chart-bars">
					${HOURS.map(h => { const r = rate(h); return `
					<div class="chart-col">
						<div class="chart-col-bars">
							<div class="chart-bar chart-bar-weekday" style="height:${Math.round(r.wd * 100)}px"></div>
							<div class="chart-bar chart-bar-weekend" style="height:${Math.round(r.we * 100)}px"></div>
						</div>
						<span class="chart-label">${h}h</span>
					</div>`; }).join("")}
				</div>
			</div>
			<div class="chart-legend">
				<span class="legend-item"><span class="legend-dot legend-weekday"></span>Seg–Sex</span>
				<span class="legend-item"><span class="legend-dot legend-weekend"></span>Sab–Dom</span>
			</div>
		</div>
	`;
}

export function renderCourtGroupDiagram(groupCourts, courtId) {
	const secondary = document.getElementById("secondary-card");
	if (!secondary) return;

	secondary.querySelector(".court-diagram-wrapper")?.remove();

	const IMG_H = 80;
	const IMG_W = Math.round(154 / 90 * IMG_H);
	const STEP_X = Math.round((98 - 0.5) / 154 * IMG_W * 0.65);
	const STEP_Y = Math.round((57.1 - 0.5) / 90 * IMG_H * 0.65);

	const sorted = [...groupCourts].sort((a, b) => a.group_position - b.group_position);
	const currentIndex = sorted.findIndex(c => String(c.id) === String(courtId));
	if (currentIndex === -1) return;

	const wrapper = document.createElement("div");
	wrapper.className = "court-diagram-wrapper";

	const diagram = document.createElement("div");
	diagram.className = "court-group-diagram";

	const currentCustomImage = COURT_CUSTOM_IMAGES[String(courtId)];
	if (currentCustomImage) {
		const customH = currentCustomImage.height ?? IMG_H;
		const customW = Math.round(154 / 90 * customH);
		diagram.style.width = customW + "px";
		diagram.style.height = customH + "px";
		const img = document.createElement("img");
		img.src = currentCustomImage.src;
		img.alt = "";
		img.className = "court-diagram-img";
		img.style.left = "0";
		img.style.top = "0";
		img.style.width = customW + "px";
		img.style.height = customH + "px";
		diagram.appendChild(img);
	} else {
		const n = sorted.length;
		diagram.style.width = ((n - 1) * STEP_X + IMG_W) + "px";
		diagram.style.height = ((n - 1) * STEP_Y + IMG_H) + "px";
		sorted.forEach((court, i) => {
			const img = document.createElement("img");
			img.src = "/images/court_iso.svg";
			img.alt = court.name || "";
			img.className = "court-diagram-img";
			img.style.left = (i * STEP_X) + "px";
			img.style.top = (i * STEP_Y) + "px";
			img.style.width = IMG_W + "px";
			img.style.height = IMG_H + "px";
			img.style.opacity = i === currentIndex ? "1" : "0.3";
			diagram.appendChild(img);
		});
	}

	const label = document.createElement("div");
	label.className = "secondary-card-title";
	label.textContent = "Disposição do campo";
	wrapper.appendChild(label);
	wrapper.appendChild(diagram);
	const statsEl = secondary.querySelector("#court-stats");
	statsEl ? statsEl.parentElement.insertBefore(wrapper, statsEl) : secondary.appendChild(wrapper);
}
