import {
	ArrowDownCircle,
	ArrowUpCircle,
	PiggyBank,
	Tag,
	Wallet,
} from "lucide-react-native";
import * as LucideIcons from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { formatCurrency, formatDate } from "@/utils/finance/helpers";
import { DesktopBalanceChart } from "@/components/finance/home/desktop/DesktopBalanceChart";
import { DesktopStatTile } from "@/components/finance/home/desktop/DesktopStatTile";
import { ComparisonLine, SectionCard } from "./financeDesktopParts";

const INCOME_COLOR = "#16A34A";
const EXPENSE_COLOR = "#DC2626";

function formatPercent(value) {
	return `${value.toFixed(Math.abs(value) >= 10 ? 0 : 1)}%`;
}

function CategoryIcon({ name, color, colors }) {
	const Icon = (name && LucideIcons[name]) || Tag;
	return (
		<Box
			className="rounded-lg items-center justify-center"
			style={{ width: 34, height: 34, backgroundColor: colors.surfaceMuted }}
		>
			<Icon size={18} color={color} />
		</Box>
	);
}

function OndeFoiRow({ item, colors }) {
	return (
		<Box className="gap-1.5">
			<Box className="flex-row items-center gap-3">
				<CategoryIcon name={item.icone} color={item.color} colors={colors} />
				<Text className="text-sm font-medium flex-1 mr-2" style={{ color: colors.textPrimary }} numberOfLines={1}>
					{item.nome}
				</Text>
				<Text className="text-xs" style={{ color: colors.textSecondary, width: 40, textAlign: "right" }}>
					{formatPercent(item.pct)}
				</Text>
				<Text className="text-sm font-semibold" style={{ color: colors.textPrimary, width: 100, textAlign: "right" }}>
					{formatCurrency(item.total)}
				</Text>
			</Box>
			<Box className="rounded-full overflow-hidden" style={{ height: 6, backgroundColor: colors.surfaceMuted, marginLeft: 46 }}>
				<Box
					className="rounded-full"
					style={{ height: 6, width: `${Math.max(4, Math.min(100, item.pct))}%`, backgroundColor: item.color }}
				/>
			</Box>
		</Box>
	);
}

function MaiorLancamentoRow({ item, onPress, colors }) {
	const isReceber = item.tipo === "receber";
	return (
		<Pressable onPress={() => onPress?.(item.raw)}>
			<Box className="flex-row items-center gap-3">
				<Text className="text-xs" style={{ color: colors.textSecondary, width: 74 }}>
					{formatDate(item.data)}
				</Text>
				<Text className="text-sm flex-1 mr-2" style={{ color: colors.textPrimary }} numberOfLines={1}>
					{item.descricao}
				</Text>
				<Text
					className="text-sm font-semibold"
					style={{ color: isReceber ? INCOME_COLOR : EXPENSE_COLOR }}
				>
					{isReceber ? "+" : "−"} {formatCurrency(item.valor)}
				</Text>
			</Box>
		</Pressable>
	);
}

function MonthCards({ view, comparison, colors }) {
	const caption = "vs. período anterior";
	const empty = "sem período anterior";
	return (
		<Box className="flex-row gap-4 flex-wrap">
			<DesktopStatTile
				label="Saldo do período"
				value={view.real}
				icon={Wallet}
				footer={
					<ComparisonLine delta={comparison.saldo} prevExists={comparison.prevExists} caption={caption} emptyLabel={empty} colors={colors} />
				}
			/>
			<DesktopStatTile
				label="Receitas"
				value={view.entradas}
				icon={ArrowUpCircle}
				tone="income"
				footer={
					<ComparisonLine delta={comparison.receitas} prevExists={comparison.prevExists} caption={caption} emptyLabel={empty} colors={colors} />
				}
			/>
			<DesktopStatTile
				label="Despesas"
				value={view.saidas}
				icon={ArrowDownCircle}
				tone="expense"
				footer={
					<ComparisonLine delta={comparison.despesas} prevExists={comparison.prevExists} caption={caption} emptyLabel={empty} colors={colors} />
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

export function MonthBlock({
	view,
	comparison,
	balanceSeries,
	periodLabel,
	onPressItem,
	colors,
}) {
	return (
		<Box className="gap-4">
			<MonthCards view={view} comparison={comparison} colors={colors} />

			<DesktopBalanceChart points={view.hasData ? balanceSeries : []} />

			<Box className="flex-row gap-4 flex-wrap items-stretch">
				<SectionCard
					title="Onde foi o dinheiro"
					hint="Categorias com maior gasto no mês"
					colors={colors}
					style={{ flex: 1, minWidth: 280 }}
				>
					{view.ranking.length === 0 ? (
						<Text className="text-sm" style={{ color: colors.textSecondary }}>
							Sem despesas neste mês.
						</Text>
					) : (
						view.ranking.map((item) => (
							<OndeFoiRow key={item.nome} item={item} colors={colors} />
						))
					)}
				</SectionCard>

				<SectionCard
					title="Maiores lançamentos"
					hint="Lançamentos de maior valor no período"
					colors={colors}
					style={{ flex: 1, minWidth: 280 }}
				>
					{view.maiores.length === 0 ? (
						<Text className="text-sm" style={{ color: colors.textSecondary }}>
							Nenhum lançamento neste mês.
						</Text>
					) : (
						view.maiores.map((item) => (
							<MaiorLancamentoRow
								key={String(item.id)}
								item={item}
								onPress={onPressItem}
								colors={colors}
							/>
						))
					)}
				</SectionCard>
			</Box>
		</Box>
	);
}
