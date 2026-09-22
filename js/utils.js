// RENDER THE SITTING PIG EMPTY STATE INTO A CONTAINER
function setEmptyState(container, message) {
	container.innerHTML = `<div class="empty"><img src="images/pig_sitting.svg" class="empty-pig" alt=""><p>${message}</p></div>`;
}

// FORMAT A TIMESTAMP AS HH:MM, SHARED BY EVERY PAGE
function formatTime(ts) {
	return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// MINUTES REMAINING UNTIL A RESERVATION ENDS, SHARED BY EVERY PAGE
function minutesLeft(endsAt) {
	const ms = new Date(endsAt) - Date.now();
	return Math.max(0, Math.ceil(ms / 60000));
}

// PERSISTENT DEVICE ID FOR TAILORING MESSAGES TO THE RESERVATION OWNER
function getDeviceId() {
	let id = localStorage.getItem("device_id");
	if (!id) {
		// crypto.randomUUID is unavailable on HTTP (non-localhost) in some browsers,
		// so fall back to a RFC 4122 v4 UUID built from Math.random().
		id = crypto.randomUUID?.() ?? ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
			(c ^ (Math.random() * 16 >> c / 4)).toString(16)
		);
		localStorage.setItem("device_id", id);
	}
	return id;
}

// CITY LABEL WITH AN OPTIONAL FLAG ICON PREPENDED, SHARED BY EVERY PAGE
function cityHtml(city) {
	const key = city && city.toLowerCase();
	const flag = key === "aveiro" ? `<img src="images/flag_aveiro.svg" class="city-flag" alt="">`
		: key === "vagos" ? `<img src="images/flag_vagos.svg" class="city-flag" alt="">`
		: key === "ílhavo" ? `<img src="images/flag_ilhavo.svg" class="city-flag" alt="">`
		: key === "oliv bairro" ? `<img src="images/flag_ilhavo.svg" class="city-flag" alt="">`
		: key === "anadia" ? `<img src="images/flag_ilhavo.svg" class="city-flag" alt="">`
		: key === "albergaria" ? `<img src="images/flag_albergaria.svg" class="city-flag" alt="">`
		: key === "murtosa" ? `<img src="images/flag_murtosa.svg" class="city-flag" alt="">`
		: key === "estarreja" ? `<img src="images/flag_estarreja.svg" class="city-flag" alt="">`
		: "";
	return `<p class="city">${flag}${city || ""}</p>`;
}
