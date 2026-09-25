// FORECASTS BARELY CHANGE WITHIN A FEW HOURS, SO ONE FETCH PER COURT LOCATION IS REUSED FOR THIS LONG
const CACHE_MS = 3 * 60 * 60 * 1000;

// RAIN WINS OVER CLOUD COVER — IT'S THE ONLY CONDITION THAT ACTUALLY STOPS A GAME
function toIcon(rainChance, cloudCover) {
	if (rainChance >= 50) return 'rain';
	if (cloudCover < 25) return 'sunny';
	if (cloudCover < 70) return 'part_cloudy';
	return 'cloudy';
}

// LOCAL DATE AS YYYY-MM-DD, MATCHING OPEN-METEO'S daily.time KEYS (REQUESTED IN EUROPE/LISBON)
function dateKey(day) {
	return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}

// RETURNS { 'YYYY-MM-DD': 'rain' | 'sunny' | 'part_cloudy' | 'cloudy' } FOR THE NEXT 7 DAYS, OR null ON FAILURE
export async function fetchWeather(lat, lng) {
	const cacheKey = `weather:${lat},${lng}`;
	try {
		const cached = JSON.parse(localStorage.getItem(cacheKey));
		if (cached && Date.now() - cached.at < CACHE_MS) return cached.icons;
	} catch {}

	try {
		const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_probability_max,cloud_cover_mean&forecast_days=7&timezone=Europe%2FLisbon`);
		if (!res.ok) return null;
		const { daily } = await res.json();
		const icons = Object.fromEntries(daily.time.map((date, i) => [date, toIcon(daily.precipitation_probability_max[i], daily.cloud_cover_mean[i])]));
		try { localStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), icons })); } catch {}
		return icons;
	} catch {
		return null;
	}
}

// EMPTY STRING WHEN THERE'S NO FORECAST FOR THAT DAY, SO THE DAY CELL SIMPLY SHOWS NO ICON
export function weatherIconHtml(weather, day) {
	const icon = weather?.[dateKey(day)];
	return icon ? `<img src="images/icon_${icon}.svg" class="day-weather" alt="">` : '';
}
