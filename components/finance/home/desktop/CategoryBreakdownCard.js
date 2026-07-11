import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { formatCurrency } from "@/utils/finance/helpers";
import { DesktopCard } from "./DesktopCard";

function CategoryRow({ item, colors }) {
	return (
		<Box className="gap-1.5">
			<Box className="flex-row items-center justify-between">
				<Box className="flex-row items-center gap-2 flex-1 mr-2">
					<Box
						className="rounded-full"
						style={{ width: 9, height: 9, backgroundColor: item.color }}
					/>
					<Text
						className="text-sm flex-1"
						style={{ color: colors.textPrimary }}
						numberOfLines={1}
					>
						{item.nome}
					</Text>
				</Box>
				<Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
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

export function CategoryBreakdownCard({ categories }) {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);

	return (
		<DesktopCard title="Gastos por categoria" contentClassName="gap-4">
			{categories.length === 0 ? (
				<Text className="text-sm" style={{ color: colors.textSecondary }}>
					Sem despesas no período.
				</Text>
			) : (
				categories.map((item) => (
					<CategoryRow key={item.nome} item={item} colors={colors} />
				))
			)}
		</DesktopCard>
	);
}
