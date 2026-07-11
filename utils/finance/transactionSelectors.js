function comparableDate(value) {
	if (!value) return null;
	const timestamp = Date.parse(String(value));
	return Number.isFinite(timestamp) ? timestamp : null;
}

function getFilterDate(row, dateField) {
	if (dateField === "data_baixa") return comparableDate(row?.data_baixa);
	return comparableDate(row?.data_vencimento ?? row?.data_transacao);
}

export function filterTransactionsByPeriod(
	rows,
	{ dateFrom = null, dateTo = null, dateField = "data_vencimento" } = {}
) {
	const source = Array.isArray(rows) ? rows : [];
	const from = comparableDate(dateFrom);
	const to = comparableDate(dateTo);

	return source.filter((row) => {
		const value = getFilterDate(row, dateField);
		if (value == null) return false;
		if (from != null && value < from) return false;
		if (to != null && value > to) return false;
		return true;
	});
}
