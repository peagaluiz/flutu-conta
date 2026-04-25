import { Funnel, Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { formatCurrency } from "@/utils/finance/helpers";

export function ResumoFinanceiroCard({ resumo, name, dateRangeLabel, onPressFilter }) {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const isDarkMode = theme === "dark";
	const cardStyle = {
		backgroundColor: isDarkMode ? colors.surfaceAlt : colors.surface,
		borderColor: colors.border,
	};
	const infoCardStyle = {
		backgroundColor: colors.surfaceMuted,
		borderColor: colors.border,
	};
	const iconShellStyle = {
		backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : colors.surfaceMuted,
	};

	return (
		<Box className="rounded-3xl px-5 py-5 border gap-4" style={cardStyle}>
			<Box className="flex-row items-center justify-between gap-3">
				<Box className="flex-row items-center gap-2">
					<Box className="rounded-full p-2" style={iconShellStyle}>
						<Wallet size={16} color={colors.textPrimary} />
					</Box>
					<Text className="font-semibold" style={{ color: colors.textPrimary }}>
						Sua carteira
					</Text>
				</Box>

				<Pressable onPress={onPressFilter}>
					<Box className="flex-row items-center gap-2 rounded-full border px-3 py-2" style={{ backgroundColor: colors.surfaceMuted, borderColor: colors.border }}>
						<Funnel size={14} color={colors.textPrimary} />
						<Text className="text-xs font-medium" style={{ color: colors.textPrimary }}>
							{dateRangeLabel || "Filtrar"}
						</Text>
					</Box>
				</Pressable>
			</Box>

			<Box className="gap-1">
				<Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
					Olá, {name || "pessoa"}
				</Text>
				<Text className="text-sm" style={{ color: colors.textSecondary }}>
					Aqui está seu resumo financeiro mais importante, sem poluição visual.
				</Text>
				<Text className="text-xs" style={{ color: colors.textSecondary }}>
					Período {dateRangeLabel || "atual"}
				</Text>
			</Box>

			<Box className="gap-2">
				<Box className="rounded-xl border px-3 py-3" style={infoCardStyle}>
					<Text className="text-xs" style={{ color: colors.textSecondary }}>
						Saldo ativo
					</Text>
					<Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>
						{formatCurrency(resumo.saldo)}
					</Text>
				</Box>

				<Box className="flex-row gap-2">
					<Box className="flex-1 rounded-xl border px-3 py-3" style={infoCardStyle}>
						<Box className="flex-row items-center gap-1 mb-1">
							<ArrowDownCircle size={14} color="#DC2626" />
							<Text className="text-xs" style={{ color: colors.textSecondary }}>
								Dívidas não pagas
							</Text>
						</Box>
						<Text className="font-semibold" style={{ color: colors.textPrimary }}>
							{formatCurrency(resumo.dividasNaoPagas)}
						</Text>
					</Box>

					<Box className="flex-1 rounded-xl border px-3 py-3" style={infoCardStyle}>
						<Box className="flex-row items-center gap-1 mb-1">
							<ArrowUpCircle size={14} color="#16A34A" />
							<Text className="text-xs" style={{ color: colors.textSecondary }}>
								A receber pendente
							</Text>
						</Box>
						<Text className="font-semibold" style={{ color: colors.textPrimary }}>
							{formatCurrency(resumo.receberPendente)}
						</Text>
					</Box>
				</Box>
			</Box>
		</Box>
	);
}
