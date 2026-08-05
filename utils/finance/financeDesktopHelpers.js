import {
	buildDashboardResumo,
	groupExpensesByCategory,
	normalizeTransactions,
} from "@/utils/finance/dashboardHelpers";
import { getDescricao } from "@/utils/finance/getDescricao";
import { toISODateString } from "@/utils/finance/helpers";
import { currentMonthKey, monthKeyOf, shiftMonthKey } from "@/utils/finance/monthKey";

export { currentMonthKey, monthKeyOf, shiftMonthKey };

const MONTH_NAMES_LONG = [
	"Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
	"Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MONTH_NAMES_SHORT = [
	"Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
	"Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

// Paleta de apoio para categorias sem cor no catálogo.
const CATEGORY_PALETTE = [
	"#2563EB", "#16A34A", "#8B5CF6", "#F59E0B", "#EF4444",
	"#0EA5E9", "#14B8A6", "#F97316", "#EC4899", "#64748B",
];

export function currentYear() {
	return new Date().getFullYear();
}

// Compara um valor atual com o do período anterior, evitando divisão por zero.
// higherIsBetter=false inverte o sentido (ex.: aumento de despesa é negativo).
// hasPrevious=false quando o período anterior não tinha valor comparável — nesse
// caso o percentual fica nulo e só a diferença deve ser exibida.
export function computeDelta(current, previous, { higherIsBetter = true } = {}) {
	const cur = Number(current || 0);
	const prev = Number(previous || 0);
	const diff = cur - prev;
	const hasPrevious = Math.abs(prev) > 0.005;
	const pct = hasPrevious ? (diff / Math.abs(prev)) * 100 : null;
	const eps = 0.005;
	let sentiment = "neutral";
	if (diff > eps) sentiment = higherIsBetter ? "positive" : "negative";
	else if (diff < -eps) sentiment = higherIsBetter ? "negative" : "positive";
	return { diff, pct, hasPrevious, sentiment };
}

function taxaEconomiaOf(recebido, gasto) {
	return recebido > 0 ? ((recebido - gasto) / recebido) * 100 : 0;
}

export function formatMonthKeyLong(monthKey) {
	const [year, month] = String(monthKey).split("-").map(Number);
	return `${MONTH_NAMES_LONG[month - 1]} de ${year}`;
}

// Mesmo formato, sem o "de" — usado no header compacto do card do mês.
export function formatMonthKeyShort(monthKey) {
	const [year, month] = String(monthKey).split("-").map(Number);
	return `${MONTH_NAMES_LONG[month - 1]} ${year}`;
}

// Dias corridos do mês: quantos já passaram (dia atual se for o mês vigente,
// total se for passado, zero se for futuro) sobre o total de dias.
export function daysInfoForMonth(monthKey) {
	const [year, month] = String(monthKey).split("-").map(Number);
	const total = new Date(year, month, 0).getDate();
	const now = new Date();
	const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;
	if (isCurrent) return { total, elapsed: now.getDate(), isCurrent: true };
	const firstOfMonth = new Date(year, month - 1, 1);
	const isFuture = firstOfMonth > now;
	return { total, elapsed: isFuture ? 0 : total, isCurrent: false };
}

function resolveCategoryMeta(nome, catalogMap, index) {
	const meta = catalogMap.get(nome);
	return {
		icone: meta?.icone || null,
		color: meta?.cor_hex || CATEGORY_PALETTE[index % CATEGORY_PALETTE.length],
	};
}

// Ranking de categorias de despesa (tipo pagar) com % sobre o total gasto.
function buildCategoryRanking(items, totalSaidas, catalogMap, top) {
	const sorted = groupExpensesByCategory(items).map(({ categoria, total }) => ({
		nome: categoria,
		total,
	}));

	const limited = typeof top === "number" ? sorted.slice(0, top) : sorted;
	const denom = totalSaidas > 0 ? totalSaidas : 1;

	return limited.map((entry, index) => ({
		...entry,
		pct: (entry.total / denom) * 100,
		...resolveCategoryMeta(entry.nome, catalogMap, index),
	}));
}

function rangeBounds(dateRange) {
	const start = dateRange?.start ? String(dateRange.start).slice(0, 10) : null;
	const end = dateRange?.end ? String(dateRange.end).slice(0, 10) : null;
	return { start, end };
}

function itemInRange(item, start, end) {
	const d = String(item.referenceDate || "").slice(0, 10);
	if (!d) return false;
	if (start && d < start) return false;
	if (end && d > end) return false;
	return true;
}

// Janela imediatamente anterior, de mesma duração, para comparar "vs. período
// anterior" (ex.: mês anterior quando o período é um mês inteiro).
export function shiftRangeBack(dateRange) {
	const { start, end } = rangeBounds(dateRange);
	if (!start || !end) return { start: null, end: null };
	const startDate = new Date(`${start}T00:00:00`);
	const endDate = new Date(`${end}T00:00:00`);
	const days = Math.round((endDate - startDate) / 86400000) + 1;
	const prevEnd = new Date(startDate);
	prevEnd.setDate(prevEnd.getDate() - 1);
	const prevStart = new Date(prevEnd);
	prevStart.setDate(prevStart.getDate() - (days - 1));
	return { start: toISODateString(prevStart), end: toISODateString(prevEnd) };
}

// Resumo do período (recebe já os itens filtrados por data). Mesmo conjunto de
// métricas antes calculado por mês, agora dirigido pelo dateRange da tela inicial.
export function buildPeriodView(allItems, dateRange, catalogMap, periodGhosts = []) {
	const { start, end } = rangeBounds(dateRange);
	const normalizedAll = normalizeTransactions(allItems);
	// Fantasmas de recorrência (previstas) entram só na base do período — nunca em
	// normalizedAll — para não duplicar pendentes no buildDashboardResumo.
	const ghosts = normalizeTransactions(periodGhosts).filter((item) =>
		itemInRange(item, start, end)
	);
	const base = normalizedAll
		.filter((item) => itemInRange(item, start, end))
		.concat(ghosts);

	// Mesmo cálculo da home e do finance mobile (buildDashboardResumo): entradas/saídas
	// do período com o saldo inicial (baixas anteriores ao início) embutido, saldo
	// consolidado (previsto) e saldo real. Assim "Saldo do período" bate com o "Saldo
	// total" da home e Receitas/Despesas com o resumo do celular.
	const resumo = buildDashboardResumo(base, normalizedAll, dateRange);

	const ranking = buildCategoryRanking(base, resumo.saidas, catalogMap, 6);

	const maiores = [...base]
		.sort((a, b) => b.valor - a.valor)
		.slice(0, 6)
		.map((item) => ({
			id: item.id_transacao ?? item.recurrence_uuid,
			data: item.data_vencimento || item.data_transacao,
			descricao:
				item.pessoa || getDescricao(item) || item.categoria || "Lançamento",
			valor: item.valor,
			tipo: item.tipo,
			raw: item,
		}));

	return {
		hasData: base.length > 0,
		entradas: resumo.entradas,
		saidas: resumo.saidas,
		saldoInicial: resumo.saldoInicial,
		previsto: resumo.saldo,
		real: resumo.saldoReal,
		taxaEconomia: taxaEconomiaOf(resumo.entradas, resumo.saidas),
		ranking,
		maiores,
	};
}

// Série de saldo realizado ao longo do período, com saldo de abertura = tudo que
// já foi baixado antes do início. Mesmo formato de ponto ({label, entradas,
// saidas, saldo}) do DesktopBalanceChart da tela inicial (reaproveitado sem mudar).
export function buildPeriodBalanceSeries(allItems, dateRange, periodGhosts = [], steps = 8) {
	const { start, end } = rangeBounds(dateRange);
	if (!start || !end) return [];
	const startTime = new Date(`${start}T00:00:00`).getTime();
	const endTime = new Date(`${end}T23:59:59`).getTime();
	if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime) {
		return [];
	}

	// Saldo previsto: realizado (baixas) + previstos (pendentes/fantasmas pela data de
	// vencimento). O saldo de abertura continua só o realizado antes do início.
	const items = normalizeTransactions(allItems).concat(normalizeTransactions(periodGhosts));

	let opening = 0;
	const within = [];
	items.forEach((item) => {
		if (item.status === "pago") {
			const baixa = String(item.data_baixa || item.data_vencimento || "").slice(0, 10);
			if (!baixa) return;
			const signed = item.tipo === "receber" ? item.valor : -item.valor;
			if (baixa < start) {
				opening += signed;
			} else if (baixa <= end) {
				within.push({
					time: new Date(`${baixa}T00:00:00`).getTime(),
					entrada: item.tipo === "receber" ? item.valor : 0,
					saida: item.tipo === "pagar" ? item.valor : 0,
				});
			}
			return;
		}
		const venc = String(item.data_vencimento || item.data_transacao || "").slice(0, 10);
		if (!venc || venc < start || venc > end) return;
		within.push({
			time: new Date(`${venc}T00:00:00`).getTime(),
			entrada: item.tipo === "receber" ? item.valor : 0,
			saida: item.tipo === "pagar" ? item.valor : 0,
		});
	});

	const span = endTime - startTime;
	return Array.from({ length: steps }, (_, i) => {
		const boundary = startTime + (span * i) / (steps - 1);
		const upto = within.filter((e) => e.time <= boundary);
		const entradas = upto.reduce((sum, e) => sum + e.entrada, 0);
		const saidas = upto.reduce((sum, e) => sum + e.saida, 0);
		const d = new Date(boundary);
		const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
		return { label, entradas, saidas, saldo: opening + entradas - saidas };
	});
}

export function buildYearView(allItems, year, catalogMap) {
	// Só realizado: o bloco anual (recebido/gasto, gráfico mês a mês, categorias e
	// melhor/pior mês) considera apenas transações pagas, coerente com o "Saldo do
	// período/total" que também é realizado.
	const base = normalizeTransactions(allItems).filter(
		(item) =>
			item.status === "pago" &&
			String(item.referenceDate || "").slice(0, 4) === String(year)
	);

	const now = new Date();
	const currentMonthIndex =
		year === now.getFullYear() ? now.getMonth() : year < now.getFullYear() ? 11 : -1;

	const months = MONTH_NAMES_SHORT.map((label, index) => ({
		index,
		label,
		entradas: 0,
		saidas: 0,
		saldo: 0,
		isFuture: currentMonthIndex >= 0 && index > currentMonthIndex,
		isCurrent: index === currentMonthIndex,
	}));

	base.forEach((item) => {
		const monthIndex = Number(String(item.referenceDate || "").slice(5, 7)) - 1;
		if (monthIndex < 0 || monthIndex > 11) return;
		if (item.tipo === "receber") months[monthIndex].entradas += item.valor;
		else months[monthIndex].saidas += item.valor;
	});
	months.forEach((m) => {
		m.saldo = m.entradas - m.saidas;
	});

	const recebido = months.reduce((sum, m) => sum + m.entradas, 0);
	const gasto = months.reduce((sum, m) => sum + m.saidas, 0);
	const saldoAcumulado = recebido - gasto;
	const taxaEconomia = taxaEconomiaOf(recebido, gasto);

	const rankedCategorias = buildCategoryRanking(base, gasto, catalogMap, 6);
	const maxCategoria = Math.max(1, ...rankedCategorias.map((c) => c.total));
	const categorias = rankedCategorias.map((c) => ({
		nome: c.nome,
		value: c.total,
		pct: (c.total / maxCategoria) * 100,
		pctGasto: gasto > 0 ? (c.total / gasto) * 100 : 0,
		color: c.color,
	}));

	// Melhor/pior mês pelo saldo mensal (receitas − despesas), entre os meses com
	// movimento e não futuros.
	const active = months.filter(
		(m) => !m.isFuture && (m.entradas > 0 || m.saidas > 0)
	);
	let melhor = null;
	let pior = null;
	active.forEach((m) => {
		if (!melhor || m.saldo > melhor.saldo) melhor = m;
		if (!pior || m.saldo < pior.saldo) pior = m;
	});

	return {
		hasData: base.length > 0,
		months,
		recebido,
		gasto,
		saldoAcumulado,
		taxaEconomia,
		categorias,
		melhor,
		pior,
		monthNameLong: (i) => MONTH_NAMES_LONG[i],
	};
}

export { MONTH_NAMES_LONG, MONTH_NAMES_SHORT };
