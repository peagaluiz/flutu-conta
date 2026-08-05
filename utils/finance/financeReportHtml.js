import { formatCurrency, formatDate } from "@/utils/finance/helpers";

const INCOME_COLOR = "#16A34A";
const EXPENSE_COLOR = "#DC2626";

function escapeHtml(value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function formatPercent(value) {
	const parsed = Number(value || 0);
	return `${parsed.toFixed(Math.abs(parsed) >= 10 ? 0 : 1)}%`;
}

// Mesma regra da ComparisonLine da tela: sem período anterior comparável só o
// rótulo neutro; com período, diferença absoluta (e % quando faz sentido).
function comparisonLabel(delta, prevExists, { kind = "money", caption, emptyLabel } = {}) {
	if (!prevExists || !delta) {
		return { text: emptyLabel || "sem período anterior", color: "#64748B" };
	}
	const sign = delta.diff >= 0 ? "+" : "−";
	const magnitude = Math.abs(delta.diff);
	const diffLabel =
		kind === "points"
			? `${sign}${magnitude.toFixed(1)} pp`
			: `${sign}${formatCurrency(magnitude)}`;
	const pctLabel =
		kind === "money" && delta.pct != null
			? ` · ${delta.pct >= 0 ? "+" : "−"}${Math.abs(delta.pct).toFixed(0)}%`
			: "";
	const color =
		delta.sentiment === "positive"
			? INCOME_COLOR
			: delta.sentiment === "negative"
				? EXPENSE_COLOR
				: "#64748B";
	return { text: `${diffLabel}${pctLabel} ${caption || ""}`.trim(), color };
}

function statCard({ label, value, delta, prevExists, kind, caption, emptyLabel, tone }) {
	const comparison = comparisonLabel(delta, prevExists, { kind, caption, emptyLabel });
	const valueColor =
		tone === "income" ? INCOME_COLOR : tone === "expense" ? EXPENSE_COLOR : "#0F172A";
	return `
		<div class="card stat">
			<span class="stat-label">${escapeHtml(label)}</span>
			<strong class="stat-value" style="color:${valueColor}">${escapeHtml(value)}</strong>
			<span class="stat-footer" style="color:${comparison.color}">${escapeHtml(comparison.text)}</span>
		</div>`;
}

function barRow({ nome, valorLabel, pctLabel, pctWidth, color }) {
	return `
		<div class="bar-row">
			<div class="bar-head">
				<span class="bar-name">${escapeHtml(nome)}</span>
				<span class="bar-pct">${escapeHtml(pctLabel)}</span>
				<span class="bar-value">${escapeHtml(valorLabel)}</span>
			</div>
			<div class="bar-track">
				<div class="bar-fill" style="width:${Math.max(4, Math.min(100, pctWidth))}%;background:${color}"></div>
			</div>
		</div>`;
}

function section(title, hint, body) {
	return `
		<section class="card">
			<header class="section-head">
				<h2>${escapeHtml(title)}</h2>
				${hint ? `<p>${escapeHtml(hint)}</p>` : ""}
			</header>
			${body}
		</section>`;
}

function emptyLine(text) {
	return `<p class="empty">${escapeHtml(text)}</p>`;
}

function monthlyTable(view) {
	const rows = view.months
		.filter((month) => !month.isFuture)
		.map(
			(month) => `
			<tr>
				<td>${escapeHtml(view.monthNameLong(month.index))}</td>
				<td class="num" style="color:${INCOME_COLOR}">${escapeHtml(formatCurrency(month.entradas))}</td>
				<td class="num" style="color:${EXPENSE_COLOR}">${escapeHtml(formatCurrency(month.saidas))}</td>
				<td class="num strong" style="color:${month.saldo < 0 ? EXPENSE_COLOR : INCOME_COLOR}">${escapeHtml(formatCurrency(month.saldo))}</td>
			</tr>`
		)
		.join("");
	if (!rows) return emptyLine("Sem meses com movimento neste ano.");
	return `
		<table>
			<thead>
				<tr><th>Mês</th><th class="num">Receitas</th><th class="num">Despesas</th><th class="num">Saldo</th></tr>
			</thead>
			<tbody>${rows}</tbody>
		</table>`;
}

function highlightMonth(view, month, title, tone) {
	const accent = tone === "best" ? INCOME_COLOR : EXPENSE_COLOR;
	return `
		<div class="highlight" style="border-left-color:${accent}">
			<div class="highlight-head">
				<span>${escapeHtml(title)} · ${escapeHtml(view.monthNameLong(month.index))}</span>
				<strong style="color:${accent}">${escapeHtml(formatCurrency(month.saldo))}</strong>
			</div>
			<div class="highlight-detail">
				<span>Receitas <strong style="color:${INCOME_COLOR}">${escapeHtml(formatCurrency(month.entradas))}</strong></span>
				<span>Despesas <strong style="color:${EXPENSE_COLOR}">${escapeHtml(formatCurrency(month.saidas))}</strong></span>
			</div>
		</div>`;
}

const STYLES = `
	:root { color-scheme: light; }
	* { box-sizing: border-box; }
	body {
		margin: 0; padding: 32px; background: #F1F5F9; color: #0F172A;
		font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
	}
	.page { max-width: 1040px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
	.card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px; }
	.report-head h1 { margin: 0 0 4px; font-size: 24px; }
	.report-head p { margin: 0; font-size: 13px; color: #64748B; }
	.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }
	.columns { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px; }
	.stat { display: flex; flex-direction: column; gap: 6px; }
	.stat-label { font-size: 12px; color: #64748B; }
	.stat-value { font-size: 21px; }
	.stat-footer { font-size: 12px; }
	.section-head { margin-bottom: 14px; }
	.section-head h2 { margin: 0; font-size: 15px; }
	.section-head p { margin: 2px 0 0; font-size: 12px; color: #64748B; }
	.bar-row { margin-bottom: 12px; }
	.bar-head { display: flex; align-items: baseline; gap: 10px; font-size: 13px; }
	.bar-name { flex: 1; }
	.bar-pct { color: #64748B; font-size: 12px; }
	.bar-value { font-weight: 600; }
	.bar-track { height: 6px; border-radius: 999px; background: #F1F5F9; margin-top: 5px; overflow: hidden; }
	.bar-fill { height: 6px; border-radius: 999px; }
	table { width: 100%; border-collapse: collapse; font-size: 13px; }
	th, td { padding: 7px 8px; border-bottom: 1px solid #E2E8F0; text-align: left; }
	th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; color: #64748B; }
	.num { text-align: right; }
	.strong { font-weight: 600; }
	.empty { margin: 0; font-size: 13px; color: #64748B; }
	.highlight { border-left: 3px solid; padding-left: 12px; margin-bottom: 14px; }
	.highlight-head { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
	.highlight-detail { display: flex; gap: 16px; margin-top: 4px; font-size: 12px; color: #64748B; }
	@media print {
		body { background: #FFFFFF; padding: 0; }
		.card { break-inside: avoid; }
	}
`;

// Snapshot da tela de finanças do desktop em HTML autocontido (sem assets
// externos), para o usuário salvar, imprimir ou anexar.
export function buildFinanceReportHtml({
	periodLabel,
	monthView,
	monthComparison,
	yearView,
	yearComparison,
	year,
	generatedAt = new Date(),
}) {
	const monthCaption = "vs. período anterior";
	const monthEmpty = "sem período anterior";
	const yearCaption = "vs. ano anterior";
	const yearEmpty = "sem ano anterior";

	const monthCards = [
		statCard({
			label: "Saldo do período",
			value: formatCurrency(monthView.real),
			delta: monthComparison.saldo,
			prevExists: monthComparison.prevExists,
			caption: monthCaption,
			emptyLabel: monthEmpty,
		}),
		statCard({
			label: "Receitas",
			value: formatCurrency(monthView.entradas),
			delta: monthComparison.receitas,
			prevExists: monthComparison.prevExists,
			caption: monthCaption,
			emptyLabel: monthEmpty,
			tone: "income",
		}),
		statCard({
			label: "Despesas",
			value: formatCurrency(monthView.saidas),
			delta: monthComparison.despesas,
			prevExists: monthComparison.prevExists,
			caption: monthCaption,
			emptyLabel: monthEmpty,
			tone: "expense",
		}),
		statCard({
			label: "Taxa de economia",
			value: formatPercent(monthView.taxaEconomia),
			delta: monthComparison.taxa,
			prevExists: monthComparison.prevExists,
			kind: "points",
			caption: monthCaption,
			emptyLabel: monthEmpty,
		}),
	].join("");

	const rankingBody = monthView.ranking.length
		? monthView.ranking
				.map((item) =>
					barRow({
						nome: item.nome,
						valorLabel: formatCurrency(item.total),
						pctLabel: formatPercent(item.pct),
						pctWidth: item.pct,
						color: item.color,
					})
				)
				.join("")
		: emptyLine("Sem despesas neste período.");

	const maioresBody = monthView.maiores.length
		? `<table><tbody>${monthView.maiores
				.map(
					(item) => `
				<tr>
					<td style="width:90px;color:#64748B">${escapeHtml(formatDate(item.data))}</td>
					<td>${escapeHtml(item.descricao)}</td>
					<td class="num strong" style="color:${item.tipo === "receber" ? INCOME_COLOR : EXPENSE_COLOR}">
						${item.tipo === "receber" ? "+" : "−"} ${escapeHtml(formatCurrency(item.valor))}
					</td>
				</tr>`
				)
				.join("")}</tbody></table>`
		: emptyLine("Nenhum lançamento neste período.");

	const yearCards = [
		statCard({
			label: "Recebido no ano",
			value: formatCurrency(yearView.recebido),
			delta: yearComparison.recebido,
			prevExists: yearComparison.prevExists,
			caption: yearCaption,
			emptyLabel: yearEmpty,
			tone: "income",
		}),
		statCard({
			label: "Gasto no ano",
			value: formatCurrency(yearView.gasto),
			delta: yearComparison.gasto,
			prevExists: yearComparison.prevExists,
			caption: yearCaption,
			emptyLabel: yearEmpty,
			tone: "expense",
		}),
		statCard({
			label: "Saldo acumulado",
			value: formatCurrency(yearView.saldoAcumulado),
			delta: yearComparison.saldo,
			prevExists: yearComparison.prevExists,
			caption: yearCaption,
			emptyLabel: yearEmpty,
		}),
		statCard({
			label: "Taxa de economia",
			value: formatPercent(yearView.taxaEconomia),
			delta: yearComparison.taxa,
			prevExists: yearComparison.prevExists,
			kind: "points",
			caption: yearCaption,
			emptyLabel: yearEmpty,
		}),
	].join("");

	const categoriasBody = yearView.categorias.length
		? yearView.categorias
				.map((item) =>
					barRow({
						nome: item.nome,
						valorLabel: formatCurrency(item.value),
						pctLabel: formatPercent(item.pctGasto),
						pctWidth: item.pct,
						color: item.color,
					})
				)
				.join("")
		: emptyLine("Sem despesas neste ano.");

	const highlightsBody =
		!yearView.melhor && !yearView.pior
			? emptyLine("Sem dados no ano.")
			: [
					yearView.melhor
						? highlightMonth(yearView, yearView.melhor, "Melhor mês", "best")
						: "",
					yearView.pior ? highlightMonth(yearView, yearView.pior, "Pior mês", "worst") : "",
				].join("");

	const generatedLabel = generatedAt.toLocaleString("pt-BR");

	return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Relatório financeiro — ${escapeHtml(periodLabel || "")}</title>
<style>${STYLES}</style>
</head>
<body>
	<div class="page">
		<header class="card report-head">
			<h1>Relatório financeiro</h1>
			<p>Período: ${escapeHtml(periodLabel || "—")} · Gerado em ${escapeHtml(generatedLabel)}</p>
		</header>

		<div class="grid">${monthCards}</div>

		<div class="columns">
			${section("Onde foi o dinheiro", "Categorias com maior gasto no período", rankingBody)}
			${section("Maiores lançamentos", "Lançamentos de maior valor no período", maioresBody)}
		</div>

		<header class="card report-head">
			<h1>${escapeHtml(String(year))}</h1>
			<p>Resumo financeiro do ano</p>
		</header>

		<div class="grid">${yearCards}</div>

		${section("Mês a mês", "Receitas, despesas e saldo de cada mês", monthlyTable(yearView))}

		<div class="columns">
			${section("Categorias do ano", "Categorias que mais acumularam despesa no ano", categoriasBody)}
			${section("Melhor e pior mês", "Meses de maior e menor saldo", highlightsBody)}
		</div>
	</div>
</body>
</html>`;
}
