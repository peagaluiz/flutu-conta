// Primitivas de data no formato 'YYYY-MM-DD' (data local, sem fuso).
// Fonte única: antes existiam cópias em recurrenceService, dashboardHelpers,
// insertFormConfig e utils/finance/helpers.

export function toISODate(dateObj) {
	const yyyy = dateObj.getFullYear();
	const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
	const dd = String(dateObj.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

export function parseISODate(value) {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return null;
	const [yyyy, mm, dd] = String(value).split("-").map(Number);
	return new Date(yyyy, mm - 1, dd);
}

export function addDays(base, days) {
	const next = new Date(base);
	next.setDate(next.getDate() + days);
	return next;
}

// Soma meses preservando o dia quando possível: 31/01 + 1 mês = 28/02 (ou 29).
export function addMonthsClamped(base, monthsToAdd) {
	const sourceDay = base.getDate();
	const year = base.getFullYear();
	const month = base.getMonth() + monthsToAdd;
	const candidate = new Date(year, month, 1);
	const maxDay = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate();
	return new Date(candidate.getFullYear(), candidate.getMonth(), Math.min(sourceDay, maxDay));
}

export function addYearsClamped(base, yearsToAdd) {
	return addMonthsClamped(base, yearsToAdd * 12);
}
