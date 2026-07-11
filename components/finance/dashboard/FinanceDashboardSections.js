import { FinanceResumoSection } from "./FinanceResumoSection";
import { FinanceMonthlyChartSection } from "./FinanceMonthlyChartSection";
import { FinanceCategoryChartSection } from "./FinanceCategoryChartSection";
import { FinanceBanksChartSection } from "./FinanceBanksChartSection";

export function FinanceDashboardSections({
	resumo,
	filteredItems,
	categorySeries,
	banksBreakdown,
	colors,
	openDetails,
	getPendentesRows,
}) {
	return (
		<>
			<FinanceResumoSection
				resumo={resumo}
				colors={colors}
				onPressSaldo={() =>
					openDetails("Saldo consolidado", filteredItems, resumo.saldoInicial)
				}
				onPressEntradas={() =>
					openDetails(
						"Entradas",
						filteredItems.filter((item) => item.tipo === "receber"),
						resumo.saldoInicial
					)
				}
				onPressSaidas={() =>
					openDetails(
						"Saídas",
						filteredItems.filter((item) => item.tipo === "pagar")
					)
				}
				onPressPendentes={() => openDetails("Pendentes", getPendentesRows())}
			/>
			<FinanceMonthlyChartSection
				items={filteredItems}
				colors={colors}
				onPressGroup={(label, groupItems) => openDetails(label, groupItems)}
			/>
			<FinanceCategoryChartSection
				categories={categorySeries}
				colors={colors}
				onPressCategory={(categoria) =>
					openDetails(
						`Categoria: ${categoria}`,
						filteredItems.filter(
							(item) =>
								item.tipo === "pagar" &&
								String(item.categoria || "") === String(categoria)
						)
					)
				}
			/>
			<FinanceBanksChartSection
				banks={banksBreakdown}
				colors={colors}
				onPressDetail={openDetails}
			/>
		</>
	);
}
