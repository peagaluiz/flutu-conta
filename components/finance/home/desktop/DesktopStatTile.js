import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { formatCurrency } from "@/utils/finance/helpers";

const TONE_COLORS = {
	income: "#16A34A",
	expense: "#DC2626",
};

export function DesktopStatTile({
	label,
	value,
	valueLabel,
	icon: Icon,
	tone = "neutral",
	loading = false,
	footer = null,
}) {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const accent = TONE_COLORS[tone] ?? colors.textPrimary;

	return (
		<Box
			className="flex-1 rounded-xl border p-4 gap-2"
			style={{
				backgroundColor: colors.surface,
				borderColor: colors.border,
			}}
		>
			<Box className="flex-row items-center justify-between">
				<Text className="text-xs" style={{ color: colors.textSecondary }}>
					{label}
				</Text>
				<Box
					className="rounded-full p-2"
					style={{ backgroundColor: colors.surfaceMuted }}
				>
					<Icon size={16} color={accent} />
				</Box>
			</Box>
			<Skeleton isLoaded={!loading} style={{ height: 28, width: 120, borderRadius: 6 }}>
				<Text className="text-xl font-bold" style={{ color: colors.textPrimary }}>
					{valueLabel ?? formatCurrency(value ?? 0)}
				</Text>
			</Skeleton>
			{footer}
		</Box>
	);
}
