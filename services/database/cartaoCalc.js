// Lógica pura de cálculo de faturas e parcelas de cartão de crédito.
// Sem dependência de banco — recebe datas como 'YYYY-MM-DD' e devolve o mesmo formato.

const pad = (n) => String(n).padStart(2, "0");

function parseISODate(value) {
	const str = String(value || "").slice(0, 10);
	const [y, m, d] = str.split("-").map((p) => Number(p));
	if (!y || !m || !d) return null;
	return { year: y, month: m, day: d };
}

function daysInMonth(year, month) {
	return new Date(year, month, 0).getDate();
}

// Avança `count` meses a partir de {year, month}, normalizando o ano.
function addMonths({ year, month }, count) {
	const zero = year * 12 + (month - 1) + count;
	return { year: Math.floor(zero / 12), month: (zero % 12) + 1 };
}

// Constrói 'YYYY-MM-DD' garantindo que o dia não ultrapasse o fim do mês.
function dateAtDay({ year, month }, day) {
	const safeDay = Math.min(day, daysInMonth(year, month));
	return `${year}-${pad(month)}-${pad(safeDay)}`;
}

// Mês da fatura em que uma compra cai: antes do fechamento → mês corrente; senão → mês seguinte.
export function resolveFaturaMonth(purchaseDateISO, diaFechamento) {
	const parsed = parseISODate(purchaseDateISO);
	if (!parsed) {
		const now = new Date();
		return { year: now.getFullYear(), month: now.getMonth() + 1 };
	}
	const base = { year: parsed.year, month: parsed.month };
	if (!diaFechamento) return base;
	return parsed.day < Number(diaFechamento) ? base : addMonths(base, 1);
}

// Divide um valor em N parcelas em centavos, sobra somada à primeira parcela.
function splitValor(valorTotal, parcelas) {
	const cents = Math.round(Number(valorTotal || 0) * 100);
	const n = Math.max(1, Number(parcelas || 1));
	const base = Math.floor(cents / n);
	const remainder = cents - base * n;
	return Array.from({ length: n }, (_, i) => (base + (i === 0 ? remainder : 0)) / 100);
}

// Datas da fatura cujo mês contém `refDateISO` (usado ao importar a fatura OFX inteira de uma vez).
export function buildFaturaDates(refDateISO, diaFechamento, diaVencimento) {
	const parsed = parseISODate(refDateISO);
	const month = parsed
		? { year: parsed.year, month: parsed.month }
		: (() => {
				const now = new Date();
				return { year: now.getFullYear(), month: now.getMonth() + 1 };
		  })();

	const mesReferencia = `${month.year}-${pad(month.month)}-01`;
	let dataFechamento = null;
	let dataVencimento = null;
	if (diaFechamento && diaVencimento) {
		dataFechamento = dateAtDay(month, Number(diaFechamento));
		const vencMonth =
			Number(diaVencimento) <= Number(diaFechamento) ? addMonths(month, 1) : month;
		dataVencimento = dateAtDay(vencMonth, Number(diaVencimento));
	}
	return { mesReferencia, dataFechamento, dataVencimento };
}

// Plano de parcelamento: uma entrada por parcela, com mês de referência e datas da fatura.
export function buildInstallmentPlan({
	purchaseDate,
	parcelas,
	valorTotal,
	diaFechamento,
	diaVencimento,
}) {
	const n = Math.max(1, Number(parcelas || 1));
	const baseMonth = resolveFaturaMonth(purchaseDate, diaFechamento);
	const valores = splitValor(valorTotal, n);
	const purchase = parseISODate(purchaseDate);
	const fallbackDay = purchase?.day ?? 1;

	return Array.from({ length: n }, (_, i) => {
		const month = addMonths(baseMonth, i);
		const mesReferencia = `${month.year}-${pad(month.month)}-01`;

		let dataFechamento = null;
		let dataVencimento;
		if (diaFechamento && diaVencimento) {
			dataFechamento = dateAtDay(month, Number(diaFechamento));
			// Vencimento cai no mês seguinte ao fechamento quando o dia de vencimento é <= dia de fechamento.
			const vencMonth =
				Number(diaVencimento) <= Number(diaFechamento) ? addMonths(month, 1) : month;
			dataVencimento = dateAtDay(vencMonth, Number(diaVencimento));
		} else {
			dataVencimento = dateAtDay(month, fallbackDay);
		}

		return {
			mesReferencia,
			dataFechamento,
			dataVencimento,
			parcelaAtual: i + 1,
			parcelaTotal: n,
			valorParcela: valores[i],
		};
	});
}
