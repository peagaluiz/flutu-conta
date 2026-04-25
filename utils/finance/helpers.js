export function formatCurrency(value) {
	const parsed = Number(value || 0);
	return parsed.toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL",
	});
}

export function formatDate(dateString) {
	if (!dateString) return "Sem vencimento";
	const date = new Date(dateString);
	if (Number.isNaN(date.getTime())) return "Sem vencimento";
	return date.toLocaleDateString("pt-BR");
}

export function toISODateString(date) {
	const yyyy = date.getFullYear();
	const mm = String(date.getMonth() + 1).padStart(2, "0");
	const dd = String(date.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

export function isRecebimentoVencido(item) {
	if (!item) return false;
	if (item.tipo !== "receber" || item.status === "pago") return false;
	if (!item.data_vencimento) return false;
	const today = toISODateString(new Date());
	return item.data_vencimento <= today;
}

export function getRecurrenceInfo(item) {
	if (Number(item?.is_from_recurrence || 0) !== 1) return null;
	return {
		sequence: Number(item?.recurrence_sequence || 1),
		frequency: String(item?.recurrence_frequency || "mensal"),
	};
}
