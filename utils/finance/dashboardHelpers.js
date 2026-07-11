import { formatCurrency } from "@/utils/finance/helpers";

function resolveTransactionDate(item) {
	const dueDate = String(item?.data_vencimento || "").slice(0, 10);
	if (dueDate) return dueDate;
	return String(item?.data_transacao || "").slice(0, 10);
}

function getMonthKey(dateString) {
	if (!dateString || dateString.length < 7) return null;
	return dateString.slice(0, 7);
}

function getMonthLabel(monthKey) {
	if (!monthKey) return "-";
	const [year, month] = monthKey.split("-");
	const date = new Date(Number(year), Number(month) - 1, 1);
	return date
		.toLocaleDateString("pt-BR", { month: "short" })
		.replace(".", "");
}

function monthKeyToDate(monthKey) {
	const [year, month] = String(monthKey || "").split("-");
	return new Date(Number(year), Number(month) - 1, 1);
}

function buildMonthKeyList(startKey, endKey) {
	const startDate = monthKeyToDate(startKey);
	const endDate = monthKeyToDate(endKey);

	if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
		return [];
	}

	const keys = [];
	const cursor = new Date(startDate);

	while (cursor <= endDate) {
		keys.push(
			`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(
				2,
				"0"
			)}`
		);
		cursor.setMonth(cursor.getMonth() + 1);
	}

	return keys;
}

export function normalizeTransactions(items = [], options = {}) {
	const base = Array.isArray(items) ? items : [];
	const activeFamilyId =
		Number(options?.familyId || 0) > 0 ? Number(options.familyId) : null;

	return base.map((item) => ({
		...item,
		valor: Number(item?.valor || 0),
		tipo: item?.tipo === "receber" ? "receber" : "pagar",
		status: item?.status || "pendente",
		categoria: String(item?.categoria || "Sem categoria"),
		family_id:
			(item?.family_id ?? null) ||
			(Number(item?.is_family_shared ?? 0) === 1 ? activeFamilyId : null),
		referenceDate: resolveTransactionDate(item),
	}));
}

export function applyVisibilityScopeFilter(
	items = [],
	scope = "all",
	familyId = null,
	userId = null
) {
	const base = Array.isArray(items) ? items : [];
	const numericFamilyId = Number(familyId || 0);

	return base.filter((item) => {
		const effectiveFamilyId =
			(item?.family_id ?? null) ||
			(Number(item?.is_family_shared ?? 0) === 1 && numericFamilyId > 0
				? numericFamilyId
				: null);

		if (scope === "mine") {
			return String(item?.user_id || "") === String(userId || "");
		}

		if (scope === "family") {
			if (numericFamilyId <= 0) return false;
			return Number(effectiveFamilyId || 0) === numericFamilyId;
		}

		if (numericFamilyId > 0) {
			return (
				String(item?.user_id || "") === String(userId || "") ||
				Number(effectiveFamilyId || 0) === numericFamilyId
			);
		}

		return String(item?.user_id || "") === String(userId || "");
	});
}

export function buildResumoGeral(items = []) {
	const base = normalizeTransactions(items);

	return base.reduce(
		(acc, item) => {
			if (item.tipo === "receber") {
				acc.entradas += item.valor;
				if (item.status === "pago") acc.entradasPagas += item.valor;
			} else {
				acc.saidas += item.valor;
				if (item.status === "pago") acc.saidasPagas += item.valor;
			}

			if (item.status !== "pago") {
				acc.pendentes += 1;
			}

			return acc;
		},
		{ entradas: 0, saidas: 0, entradasPagas: 0, saidasPagas: 0, pendentes: 0, saldo: 0 }
	);
}

// Resumo único usado pela tela de finance e pela home. Recebe os itens do período
// (já filtrados por data/escopo, podendo conter fantasmas de recorrência) e todos os
// itens do escopo (sem filtro de data, usados para saldo inicial e pendentes).
export function buildDashboardResumo(filteredItems = [], allScopedItems = [], dateRange = {}) {
	const dateFromStr = dateRange?.start ? String(dateRange.start).slice(0, 10) : null;
	const dateToStr = dateRange?.end ? String(dateRange.end).slice(0, 10) : null;

	const withinPendingWindow = (item) => {
		if (!dateToStr) return true;
		const venc = item?.data_vencimento ? String(item.data_vencimento).slice(0, 10) : null;
		return !(venc && venc > dateToStr);
	};

	let saldoInicial = 0;
	let pendentes = 0;
	let dividasNaoPagas = 0;
	let receberPendente = 0;

	const accumulatePending = (item) => {
		if (!withinPendingWindow(item)) return;
		pendentes += 1;
		const valor = Number(item?.valor || 0);
		if (item?.tipo === "receber") receberPendente += valor;
		else dividasNaoPagas += valor;
	};

	(Array.isArray(allScopedItems) ? allScopedItems : []).forEach((item) => {
		if (item?.status !== "pago") {
			accumulatePending(item);
		} else if (dateFromStr) {
			const baixa = item?.data_baixa ? String(item.data_baixa).slice(0, 10) : null;
			if (baixa && baixa < dateFromStr) {
				const valor = Number(item?.valor || 0);
				if (item?.tipo === "receber") saldoInicial += valor;
				if (item?.tipo === "pagar") saldoInicial -= valor;
			}
		}
	});

	// Fantasmas de recorrência só existem na consulta com filtro de data, então entram
	// nos pendentes a partir de filteredItems (não estão em allScopedItems).
	(Array.isArray(filteredItems) ? filteredItems : [])
		.filter((item) => item?.is_ghost && item?.status !== "pago")
		.forEach(accumulatePending);

	const base = buildResumoGeral(filteredItems);
	return {
		...finalizeResumo(base, saldoInicial),
		pendentes,
		dividasNaoPagas,
		receberPendente,
	};
}

export function finalizeResumo(resumo, saldoInicial = 0) {
	const entradas = resumo.entradas + saldoInicial;
	const saldo = entradas - resumo.saidas;
	const saldoReal = saldoInicial + resumo.entradasPagas - resumo.saidasPagas;
	return {
		...resumo,
		entradas,
		saldo,
		saldoReal,
		saldoInicial,
		entradasLabel: formatCurrency(entradas),
		saidasLabel: formatCurrency(resumo.saidas),
		saldoLabel: formatCurrency(saldo),
		saldoRealLabel: formatCurrency(saldoReal),
		saldoInicialLabel: formatCurrency(saldoInicial),
	};
}

function getISOWeekMonday(date) {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	const day = d.getDay() || 7;
	d.setDate(d.getDate() - day + 1);
	return d;
}

function toISODate(date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function buildSeriesMap(base, getKey, getLabel) {
	const map = new Map();
	base.forEach((item) => {
		const key = getKey(item);
		if (!key) return;
		if (!map.has(key)) {
			map.set(key, { key, label: getLabel(key, item), entradas: 0, saidas: 0, items: [] });
		}
		const entry = map.get(key);
		entry.items.push(item);
		if (item.tipo === "receber") entry.entradas += item.valor;
		else entry.saidas += item.valor;
	});
	const sorted = Array.from(map.values()).sort((a, b) =>
		a.key.localeCompare(b.key)
	);
	const maxValue = sorted.reduce(
		(acc, g) => Math.max(acc, g.entradas, g.saidas),
		0
	);
	return { items: sorted, maxValue: maxValue <= 0 ? 1 : maxValue };
}

export function buildYearlySeries(items = []) {
	const base = normalizeTransactions(items);
	return buildSeriesMap(
		base,
		(item) => String(item.referenceDate || "").slice(0, 4),
		(key) => key
	);
}

export function buildMonthlySeries(items = []) {
	const base = normalizeTransactions(items);

	if (!base.length) return { items: [], maxValue: 1 };

	const monthKeys = base
		.map((item) => getMonthKey(item.referenceDate))
		.filter(Boolean)
		.sort();
	if (!monthKeys.length) return { items: [], maxValue: 1 };

	const allKeys = buildMonthKeyList(monthKeys[0], monthKeys[monthKeys.length - 1]);

	const map = new Map(
		allKeys.map((key) => [key, { key, label: getMonthLabel(key), entradas: 0, saidas: 0, items: [] }])
	);

	base.forEach((item) => {
		const key = getMonthKey(item.referenceDate);
		if (!key || !map.has(key)) return;
		const entry = map.get(key);
		entry.items.push(item);
		if (item.tipo === "receber") entry.entradas += item.valor;
		else entry.saidas += item.valor;
	});

	const grouped = Array.from(map.values());
	const maxValue = grouped.reduce(
		(acc, g) => Math.max(acc, g.entradas, g.saidas),
		0
	);
	return { items: grouped, maxValue: maxValue <= 0 ? 1 : maxValue };
}

export function buildWeeklySeries(items = []) {
	const base = normalizeTransactions(items);
	return buildSeriesMap(
		base,
		(item) => {
			if (!item.referenceDate) return null;
			const monday = getISOWeekMonday(new Date(`${item.referenceDate}T00:00:00`));
			return toISODate(monday);
		},
		(key) => {
			const [, m, d] = key.split("-");
			return `${d}/${m}`;
		}
	);
}

export function buildDailySeries(items = []) {
	const base = normalizeTransactions(items);
	return buildSeriesMap(
		base,
		(item) => String(item.referenceDate || "").slice(0, 10),
		(key) => {
			const [, m, d] = key.split("-");
			return `${d}/${m}`;
		}
	);
}

export function buildCategoryExpenses(items = [], top = 6) {
	const base = normalizeTransactions(items).filter(
		(item) => item.tipo === "pagar"
	);
	const grouped = new Map();

	base.forEach((item) => {
		const current = grouped.get(item.categoria) || 0;
		grouped.set(item.categoria, current + item.valor);
	});

	const sorted = Array.from(grouped.entries())
		.map(([categoria, total]) => ({ categoria, total }))
		.sort((a, b) => b.total - a.total)
		.slice(0, top);

	const maxValue = sorted.reduce((acc, item) => Math.max(acc, item.total), 0);

	return {
		items: sorted,
		maxValue: maxValue <= 0 ? 1 : maxValue,
	};
}

export function buildBanksBreakdown(items = [], banks = []) {
	const base = normalizeTransactions(items);

	// metadados do banco (nome/cor) por id
	const banksById = new Map();
	(Array.isArray(banks) ? banks : []).forEach((bank) => {
		banksById.set(Number(bank.id_banco), bank);
	});

	// Uma entrada por (banco, lado): lado = 'cartao' quando a transação tem fatura, senão 'conta'.
	// Assim um banco que é conta e cartão aparece nas duas seções.
	const bankMap = new Map();

	base.forEach((item) => {
		const id = Number(item.id_banco || 0);
		const kind = item.id_fatura ? "cartao" : "conta";
		const mapKey = `${id}:${kind}`;
		let entry = bankMap.get(mapKey);
		if (!entry) {
			const meta = banksById.get(id);
			entry = {
				id_banco: id || null,
				kind,
				nome: meta?.nome ?? (id ? "Banco removido" : "Sem banco"),
				cor_hex: meta?.cor_hex || "#6B7280",
				gastos: 0,
				gastosFuturos: 0,
				recebidos: 0,
				items: [],
			};
			bankMap.set(mapKey, entry);
		}
		entry.items.push(item);
		if (item.tipo === "pagar") {
			if (item.status === "pago") entry.gastos += item.valor;
			else entry.gastosFuturos += item.valor;
		} else if (item.tipo === "receber" && item.status === "pago") {
			entry.recebidos += item.valor;
		}
	});

	const list = Array.from(bankMap.values())
		.filter((b) => b.gastos > 0 || b.gastosFuturos > 0 || b.recebidos > 0)
		.sort(
			(a, b) =>
				b.gastos + b.gastosFuturos + b.recebidos -
				(a.gastos + a.gastosFuturos + a.recebidos)
		);

	const maxValue = list.reduce(
		(acc, b) => Math.max(acc, b.gastos, b.gastosFuturos, b.recebidos),
		0
	);

	return { items: list, maxValue: maxValue <= 0 ? 1 : maxValue };
}

export function applyRangeFilter(items = [], range = "90d") {
	const base = normalizeTransactions(items);
	if (range === "all") return base;

	const now = new Date();
	const from = new Date(now);

	if (range === "30d") {
		from.setDate(now.getDate() - 30);
	} else if (range === "90d") {
		from.setDate(now.getDate() - 90);
	} else {
		from.setDate(now.getDate() - 365);
	}

	const fromKey = `${from.getFullYear()}-${String(
		from.getMonth() + 1
	).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`;

	return base.filter(
		(item) => item.referenceDate && item.referenceDate >= fromKey
	);
}
