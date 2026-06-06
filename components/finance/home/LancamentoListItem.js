import {
	ArrowDownCircle,
	ArrowUpCircle,
	CircleAlert,
} from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import {
	formatCurrency,
	formatDate,
	getRecurrenceInfo,
	isRecebimentoVencido,
} from "@/utils/finance/helpers";

export function LancamentoListItem({ item, onPress }) {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const isReceber = item.tipo === "receber";
	const isVencido = isRecebimentoVencido(item);
	const recurrenceInfo = getRecurrenceInfo(item);
	const iconColor = colors.textPrimary;

	return (
		<Pressable key={String(item.id_transacao)} onPress={onPress}>
			<Box
				className="rounded-lg border px-3 py-2 flex-row items-center justify-between mb-0"
				style={{
					backgroundColor: colors.surface,
					borderColor: colors.border,
				}}
			>
				<Box
					className="flex-row items-center gap-3"
					style={{ maxWidth: "68%" }}
				>
					{isVencido ? (
						<CircleAlert size={22} color={iconColor} />
					) : isReceber ? (
						<ArrowUpCircle size={22} color={iconColor} />
					) : (
						<ArrowDownCircle size={22} color={iconColor} />
					)}
					<Box>
						<Text
							className="font-medium"
							style={{ color: colors.textPrimary }}
							numberOfLines={1}
						>
							{item.categoria || "Sem categoria"}
						</Text>
						{recurrenceInfo ? (
							<Text
								className="text-xs"
								style={{ color: colors.textSecondary }}
							>
								Recorrente • {recurrenceInfo.frequency} • #
								{recurrenceInfo.sequence}
							</Text>
						) : null}
						<Text
							className="text-xs"
							style={{ color: colors.textSecondary }}
						>
							{item.status} • {formatDate(item.data_vencimento)}
						</Text>
					</Box>
				</Box>

				<Box style={{ alignItems: "flex-end" }}>
					<Text
						className="font-semibold"
						style={{ color: colors.textPrimary }}
					>
						{formatCurrency(item.valor)}
					</Text>
					<Text
						className="text-xs"
						style={{ color: colors.textSecondary }}
					>
						{isVencido
							? "Recebimento vencido"
							: isReceber
							? "Recebimento"
							: "Pagamento"}
					</Text>
				</Box>
			</Box>
		</Pressable>
	);
}
