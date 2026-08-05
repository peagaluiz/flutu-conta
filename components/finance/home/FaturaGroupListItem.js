import { CreditCard } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { formatCurrency, formatDate } from "@/utils/finance/helpers";

export const FATURA_STATUS_LABEL = { aberta: "Aberta", fechada: "Fechada", paga: "Paga" };

export const FATURA_ICON_COLOR = "#F59E0B";

export function faturaGroupTitle(group) {
	return `Fatura ${group?.banco_nome ?? "Cartão"}`;
}

// Linha-resumo de uma fatura agrupada (item sintético de groupCardTransactions).
// `compact` gera a variante de uma linha só, para cards onde os vizinhos já são
// compactos (ex.: "Próximas contas"). `trailing` recebe o chevron do modo expansível.
export function FaturaGroupListItem({ group, onPress, onLongPress, iconColor, compact = false, trailing }) {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);

	if (!group) return null;

	const resolvedIconColor = iconColor ?? FATURA_ICON_COLOR;
	const titulo = faturaGroupTitle(group);
	const qtd = group.items?.length ?? 0;
	const statusLabel = FATURA_STATUS_LABEL[group.status] ?? group.status;

	const content = compact ? (
		<Box className="flex-row items-center justify-between gap-2">
			<Box className="flex-row items-center gap-3 flex-1 mr-2">
				<Text className="text-xs w-9" style={{ color: colors.textSecondary }}>
					{formatDate(group.data_vencimento)?.slice(0, 5)}
				</Text>
				<CreditCard size={15} color={resolvedIconColor} />
				<Text
					className="text-sm flex-1"
					style={{ color: colors.textPrimary }}
					numberOfLines={1}
					ellipsizeMode="tail"
				>
					{titulo}
				</Text>
			</Box>
			<Box className="flex-row items-center gap-1">
				<Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
					{formatCurrency(group.valor)}
				</Text>
				{trailing}
			</Box>
		</Box>
	) : (
		<Box
			className="rounded-lg border px-3 py-2"
			style={{ backgroundColor: colors.surface, borderColor: colors.border }}
		>
			{/* Linha 1: ícone + título + valor */}
			<Box className="flex-row items-center justify-between">
				<Box className="flex-row items-center gap-3 flex-1 mr-2">
					<CreditCard size={22} color={resolvedIconColor} />
					<Text
						className="font-medium flex-1"
						style={{ color: colors.textPrimary }}
						numberOfLines={1}
						ellipsizeMode="tail"
					>
						{titulo}
					</Text>
				</Box>
				<Box className="flex-row items-center gap-1">
					<Text className="font-semibold" style={{ color: colors.textPrimary }}>
						{formatCurrency(group.valor)}
					</Text>
					{trailing}
				</Box>
			</Box>

			{/* Linha 2: data • qtd • status */}
			<Box className="flex-row items-center justify-between mt-0.5">
				<Text className="text-xs" style={{ color: colors.textSecondary }}>
					{formatDate(group.data_vencimento)} • {qtd} lançamento{qtd > 1 ? "s" : ""}
				</Text>
				<Text className="text-xs" style={{ color: colors.textSecondary }}>
					{statusLabel}
				</Text>
			</Box>
		</Box>
	);

	if (!onPress && !onLongPress) return content;

	return (
		<Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={300}>
			{content}
		</Pressable>
	);
}
