import { ArrowDownCircle, ArrowUpCircle, Clock3 } from "lucide-react-native";

import { formatDate, toISODateString } from "@/utils/finance/helpers";

export const TRANSACTION_FILTER_OPTIONS = [
	{ value: "all", label: "Todos" },
	{ value: "today", label: "Hoje" },
	{ value: "7d", label: "Últimos 7 dias" },
	{ value: "month", label: "Este mês" },
];

export function buildInsertParams(todayISO, params = {}) {
	const nextParams = { data_vencimento: todayISO };

	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== "") {
			nextParams[key] = value;
		}
	});

	return nextParams;
}

export function buildDefaultHomeDateRange(referenceDate = new Date()) {
	const start = new Date(
		referenceDate.getFullYear(),
		referenceDate.getMonth(),
		1
	);
	const end = new Date(
		referenceDate.getFullYear(),
		referenceDate.getMonth() + 1,
		0
	);

	return {
		start: toISODateString(start),
		end: toISODateString(end),
	};
}

export function buildMonthDateRange(year, monthIndex) {
	return buildDefaultHomeDateRange(new Date(year, monthIndex, 1));
}

export function formatHomeDateRangeLabel(startDate, endDate) {
	if (!startDate && !endDate) return "Sem período";
	if (!startDate) return formatDate(endDate);
	if (!endDate) return formatDate(startDate);
	return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

export function filterLancamentosByDateRange(
	lancamentos = [],
	startDate,
	endDate
) {
	const base = Array.isArray(lancamentos) ? lancamentos : [];

	if (!startDate && !endDate) return base;

	const fromIso = startDate ? String(startDate).slice(0, 10) : null;
	const toIso = endDate ? String(endDate).slice(0, 10) : null;

	return base.filter((item) => {
		const referenceDate = item?.data_transacao
			? String(item.data_transacao).slice(0, 10)
			: "";

		if (fromIso && referenceDate < fromIso) return false;
		if (toIso && referenceDate > toIso) return false;

		return true;
	});
}

export function getLatestLancamento(lancamentos = []) {
	const base = Array.isArray(lancamentos) ? lancamentos : [];

	return base.reduce((latest, item) => {
		if (!item) return latest;
		if (!latest) return item;

		const currentTime = new Date(item?.data_transacao || 0).getTime();
		const latestTime = new Date(latest?.data_transacao || 0).getTime();

		if (currentTime !== latestTime) {
			return currentTime > latestTime ? item : latest;
		}

		return Number(item?.id_transacao || 0) >
			Number(latest?.id_transacao || 0)
			? item
			: latest;
	}, null);
}

export function buildQuickActions({
	ultimaCategoria,
	ultimoTipo,
	onOpenInsert,
}) {
	return [
		{
			key: "despesa",
			title: "Despesa",
			subtitle: "Lançamento com data de hoje",
			icon: ArrowDownCircle,
			className: "bg-[#1f2937] border-[#111827]",
			onPress: () => onOpenInsert({ tipo: "pagar" }),
		},
		{
			key: "recebimento",
			title: "Recebimento",
			subtitle: "Entrada com data de hoje",
			icon: ArrowUpCircle,
			className: "bg-[#0f766e] border-[#115e59]",
			onPress: () => onOpenInsert({ tipo: "receber" }),
		},
		{
			key: "ultima-categoria",
			title: "Categoria",
			subtitle:
				ultimaCategoria || "Usar a categoria do último lançamento",
			icon: Clock3,
			className: "bg-[#334155] border-[#1e293b]",
			onPress: () =>
				onOpenInsert({
					tipo: ultimoTipo,
					categoria: ultimaCategoria || undefined,
				}),
		},
	];
}

export function filterLancamentosByRange(
	lancamentos = [],
	filterType = "all",
	referenceDate = new Date()
) {
	const base = Array.isArray(lancamentos) ? lancamentos : [];

	if (filterType === "all") return base;

	if (filterType === "today") {
		const todayIso = toISODateString(referenceDate);
		return base.filter((item) => {
			const ref = item?.data_transacao
				? String(item.data_transacao).slice(0, 10)
				: "";
			return ref === todayIso;
		});
	}

	if (filterType === "7d") {
		const from = new Date(referenceDate);
		from.setDate(from.getDate() - 7);
		const fromIso = toISODateString(from);
		return base.filter((item) => {
			const ref = item?.data_transacao
				? String(item.data_transacao).slice(0, 10)
				: "";
			return ref >= fromIso;
		});
	}

	if (filterType === "month") {
		const yyyy = referenceDate.getFullYear();
		const mm = String(referenceDate.getMonth() + 1).padStart(2, "0");
		const prefix = `${yyyy}-${mm}`;
		return base.filter((item) =>
			String(item?.data_transacao || "").startsWith(prefix)
		);
	}

	return base;
}

export function getFilterLabel(filterType) {
	return (
		TRANSACTION_FILTER_OPTIONS.find((item) => item.value === filterType)
			?.label || "Todos"
	);
}
