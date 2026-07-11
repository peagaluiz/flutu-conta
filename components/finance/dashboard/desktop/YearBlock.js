import {
	ArrowDownCircle,
	ArrowUpCircle,
	ChevronLeft,
	ChevronRight,
	PiggyBank,
	TrendingDown,
	TrendingUp,
	Wallet,
} from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { formatCurrency } from "@/utils/finance/helpers";
import { DesktopStatTile } from "@/components/finance/home/desktop/DesktopStatTile";
import { YearMonthlyChart } from "./YearMonthlyChart";
import { ComparisonLine, SectionCard } from "./financeDesktopParts";

const INCOME_COLOR = "#16A34A";
const EXPENSE_COLOR = "#DC2626";

function formatPercent(value) {
	return `${value.toFixed(Math.abs(value) >= 10 ? 0 : 1)}%`;
}

function YearRangePill({ year, onPrev, onNext, colors }) {
	return (
		<Box
			className="flex-row items-center gap-2 rounded-full border px-2.5 py-1.5"
			style={{ backgroundColor: colors.surfaceMuted, borderColor: colors.border }}
		>
			<Pressable onPress={onPrev} accessibilityLabel="Ano anterior">
				<ChevronLeft size={16} color={colors.textPrimary} />
			</Pressable>
			<Text className="text-xs font-medium" style={{ color: colors.textSecondary }}>
				{year - 1} — {year + 1}
			</Text>
			<Pressable onPress={onNext} accessibilityLabel="Próximo ano">
				<ChevronRight size={16} color={colors.textPrimary} />
			</Pressable>
		</Box>
	);
}

function YearHeader({ year, onPrev, onNext, colors }) {
	return (
		<Box className="flex-row items-center justify-between gap-4 flex-wrap">
			<Box className="flex-row items-baseline gap-2">
				<Text className="text-xl font-bold" style={{ color: colors.textPrimary }}>
					{year}
				</Text>
				<Text className="text-xs" style={{ color: colors.textSecondary }}>
					Resumo financeiro do ano
				</Text>
			</Box>
			<YearRangePill year={year} onPrev={onPrev} onNext={onNext} colors={colors} />
		</Box>
	);
}

function YearCards({ view, comparison, colors }) {
	const caption = "vs. ano anterior";
	const empty = "sem ano anterior";
	return (
		<Box className="flex-row gap-4 flex-wrap">
			<DesktopStatTile
				label="Recebido no ano"
				value={view.recebido}
				icon={ArrowUpCircle}
				tone="income"
				footer={
					<ComparisonLine delta={comparison.recebido} prevExists={comparison.prevExists} caption={caption} emptyLabel={empty} colors={colors} />
				}
			/>
			<DesktopStatTile
				label="Gasto no ano"
				value={view.gasto}
				icon={ArrowDownCircle}
				tone="expense"
				footer={
					<ComparisonLine delta={comparison.gasto} prevExists={comparison.prevExists} caption={caption} emptyLabel={empty} colors={colors} />
				}
			/>
			<DesktopStatTile
				label="Saldo acumulado"
				value={view.saldoAcumulado}
				icon={Wallet}
				footer={
					<ComparisonLine delta={comparison.saldo} prevExists={comparison.prevExists} caption={caption} emptyLabel={empty} colors={colors} />
				}
			/>
			<DesktopStatTile
				label="Taxa de economia"
				valueLabel={formatPercent(view.taxaEconomia)}
				icon={PiggyBank}
				footer={
					<ComparisonLine delta={comparison.taxa} prevExists={comparison.prevExists} kind="points" caption={caption} emptyLabel={empty} colors={colors} />
				}
			/>
		</Box>
	);
}

function CategoriaRow({ item, colors }) {
	return (
		<Box className="gap-1.5">
			<Box className="flex-row items-center justify-between">
				<Box className="flex-row items-center gap-2 flex-1 mr-2">
					<Box className="rounded-full" style={{ width: 9, height: 9, backgroundColor: item.color }} />
					<Text className="text-sm flex-1" style={{ color: colors.textPrimary }} numberOfLines={1}>
						{item.nome}
					</Text>
				</Box>
				<Text className="text-xs" style={{ color: colors.textSecondary, width: 40, textAlign: "right" }}>
					{formatPercent(item.pctGasto)}
				</Text>
				<Text className="text-sm font-semibold" style={{ color: colors.textPrimary, width: 100, textAlign: "right" }}>
					{formatCurrency(item.value)}
				</Text>
			</Box>
			<Box className="rounded-full overflow-hidden" style={{ height: 6, backgroundColor: colors.surfaceMuted }}>
				<Box
					className="rounded-full"
					style={{ height: 6, width: `${Math.max(4, item.pct)}%`, backgroundColor: item.color }}
				/>
			</Box>
		</Box>
	);
}

function HighlightRow({ tone, title, month, monthNameLong, colors }) {
	const accent = tone === "best" ? INCOME_COLOR : EXPENSE_COLOR;
	const Icon = tone === "best" ? TrendingUp : TrendingDown;
	return (
		<Box className="gap-1" style={{ borderLeftWidth: 3, borderLeftColor: accent, paddingLeft: 12 }}>
			<Box className="flex-row items-center justify-between gap-2">
				<Box className="flex-row items-center gap-2 flex-1 mr-2">
					<Icon size={16} color={accent} />
					<Text className="text-sm font-medium" style={{ color: colors.textPrimary }}>
						{title}
					</Text>
					<Text className="text-xs" style={{ color: colors.textSecondary }} numberOfLines={1}>
						· {monthNameLong(month.index)}
					</Text>
				</Box>
				<Text className="text-sm font-semibold" style={{ color: accent }}>
					{formatCurrency(month.saldo)}
				</Text>
			</Box>
			<Box className="flex-row gap-4">
				<Text className="text-xs" style={{ color: colors.textSecondary }}>
					Receitas{" "}
					<Text className="text-xs font-semibold" style={{ color: INCOME_COLOR }}>
						{formatCurrency(month.entradas)}
					</Text>
				</Text>
				<Text className="text-xs" style={{ color: colors.textSecondary }}>
					Despesas{" "}
					<Text className="text-xs font-semibold" style={{ color: EXPENSE_COLOR }}>
						{formatCurrency(month.saidas)}
					</Text>
				</Text>
			</Box>
		</Box>
	);
}

export function YearBlock({ year, view, comparison, onPrev, onNext, colors }) {
	return (
		<Box className="gap-4">
			<YearHeader year={year} onPrev={onPrev} onNext={onNext} colors={colors} />

			<YearCards view={view} comparison={comparison} colors={colors} />

			<SectionCard
				title="Mês a mês"
				hint="Receitas, despesas e saldo de cada mês"
				colors={colors}
			>
				<YearMonthlyChart months={view.months} monthNameLong={view.monthNameLong} colors={colors} />
			</SectionCard>

			<Box className="flex-row gap-4 flex-wrap items-stretch">
				<SectionCard
					title="Categorias do ano"
					hint="Categorias que mais acumularam despesa no ano"
					colors={colors}
					style={{ flex: 1, minWidth: 280 }}
				>
					{view.categorias.length === 0 ? (
						<Text className="text-sm" style={{ color: colors.textSecondary }}>
							Sem despesas neste ano.
						</Text>
					) : (
						view.categorias.map((item) => (
							<CategoriaRow key={item.nome} item={item} colors={colors} />
						))
					)}
				</SectionCard>

				<SectionCard
					title="Melhor e pior mês"
					hint="Meses de maior e menor saldo"
					colors={colors}
					contentClassName="gap-4"
					style={{ flex: 1, minWidth: 280 }}
				>
					{!view.melhor && !view.pior ? (
						<Text className="text-sm" style={{ color: colors.textSecondary }}>
							Sem dados no ano.
						</Text>
					) : (
						<>
							{view.melhor ? (
								<HighlightRow
									tone="best"
									title="Melhor mês"
									month={view.melhor}
									monthNameLong={view.monthNameLong}
									colors={colors}
								/>
							) : null}
							{view.pior ? (
								<HighlightRow
									tone="worst"
									title="Pior mês"
									month={view.pior}
									monthNameLong={view.monthNameLong}
									colors={colors}
								/>
							) : null}
						</>
					)}
				</SectionCard>
			</Box>
		</Box>
	);
}
