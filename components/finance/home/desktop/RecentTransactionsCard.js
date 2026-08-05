import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { LancamentoListItem } from "@/components/finance/home/LancamentoListItem";
import { FaturaGroupListItem } from "@/components/finance/home/FaturaGroupListItem";
import { DesktopCard } from "./DesktopCard";

export function RecentTransactionsCard({ loading, items, onPressItem, onSeeAll }) {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);

	return (
		<DesktopCard
			title="Lançamentos recentes"
			actionLabel="Ver todos"
			onPressAction={onSeeAll}
			contentClassName="gap-2"
		>
			{loading ? (
				[0, 1, 2, 3].map((i) => (
					<Skeleton key={i} style={{ height: 64, borderRadius: 10 }} />
				))
			) : items.length === 0 ? (
				<Text className="text-sm" style={{ color: colors.textSecondary }}>
					Nenhum lançamento no período.
				</Text>
			) : (
				items.map((item) =>
					item.is_fatura_group ? (
						<FaturaGroupListItem
							key={String(item.id_transacao)}
							group={item}
						/>
					) : (
						<LancamentoListItem
							key={String(item.id_transacao ?? item.recurrence_uuid)}
							item={item}
							onPress={() => onPressItem(item)}
						/>
					)
				)
			)}
		</DesktopCard>
	);
}
