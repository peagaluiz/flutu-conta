// Primitivas da chave de mês 'YYYY-MM', compartilhadas entre os helpers de
// dashboard (mobile) e de finanças desktop.

export function monthKeyOf(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKey() {
	return monthKeyOf(new Date());
}

// A partir de uma data ISO ('YYYY-MM-DD'); null quando a string é curta demais.
export function monthKeyFromISO(dateString) {
	if (!dateString || dateString.length < 7) return null;
	return dateString.slice(0, 7);
}

export function parseMonthKey(monthKey) {
	const [year, month] = String(monthKey || "").split("-").map(Number);
	return { year, month };
}

export function monthKeyToDate(monthKey) {
	const { year, month } = parseMonthKey(monthKey);
	return new Date(year, month - 1, 1);
}

export function shiftMonthKey(monthKey, delta) {
	const { year, month } = parseMonthKey(monthKey);
	return monthKeyOf(new Date(year, month - 1 + delta, 1));
}

// Todos os meses entre duas chaves, inclusive.
export function buildMonthKeyList(startKey, endKey) {
	const startDate = monthKeyToDate(startKey);
	const endDate = monthKeyToDate(endKey);

	if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
		return [];
	}

	const keys = [];
	const cursor = new Date(startDate);

	while (cursor <= endDate) {
		keys.push(monthKeyOf(cursor));
		cursor.setMonth(cursor.getMonth() + 1);
	}

	return keys;
}
