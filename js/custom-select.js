// REPLACES EVERY select.form-input IN root WITH A STYLED BOX + OPTIONS LIST.
// THE NATIVE <select> STAYS IN THE DOM (HIDDEN) AS THE SOURCE OF TRUTH: PICKING AN OPTION SETS ITS
// value AND FIRES ITS change EVENT, SO CODE THAT READS .value OR LISTENS FOR change KEEPS WORKING.
function enhanceSelects(root = document) {
	root.querySelectorAll("select.form-input").forEach(select => {
		const wrap = document.createElement("div");
		wrap.className = "select";
		select.replaceWith(wrap);
		select.hidden = true;

		const trigger = document.createElement("button");
		trigger.type = "button";
		trigger.className = "form-input select-trigger";

		const list = document.createElement("div");
		list.className = "select-list";
		list.hidden = true;

		const refresh = () => {
			trigger.textContent = select.selectedOptions[0]?.textContent ?? "";
			list.innerHTML = [...select.options].map((opt, i) => `
				<div class="select-option${i === select.selectedIndex ? " select-option--active" : ""}" data-index="${i}">${opt.textContent}</div>
			`).join("");
		};

		trigger.addEventListener("click", () => {
			const opening = list.hidden;
			closeAllSelects();
			list.hidden = !opening;
		});

		list.addEventListener("click", e => {
			const option = e.target.closest(".select-option");
			if (!option) return;
			select.selectedIndex = Number(option.dataset.index);
			select.dispatchEvent(new Event("change", { bubbles: true }));
			refresh();
			list.hidden = true;
		});

		wrap.append(select, trigger, list);
		refresh();
	});
}

function closeAllSelects() {
	document.querySelectorAll(".select-list").forEach(list => list.hidden = true);
}

// ONE DOCUMENT-LEVEL LISTENER CLOSES ANY OPEN LIST ON A TAP OUTSIDE IT OR ON ESCAPE
document.addEventListener("click", e => {
	if (!e.target.closest(".select")) closeAllSelects();
});
document.addEventListener("keydown", e => {
	if (e.key === "Escape") closeAllSelects();
});
