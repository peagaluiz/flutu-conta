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
	isRecebimentoVencido,
} from "@/utils/finance/helpers";

function getDescricao(item) {
	try {
		const parsed = JSON.parse(item.json || "{}");
		if (parsed?.descricao) return parsed.descricao;
	} catch {}
	return item.observacao || "";
}

export function LancamentoListItem({ item, onPress, onLongPress }) {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const isReceber = item.tipo === "receber";
	const isVencido = isRecebimentoVencido(item);
	const iconColor = colors.textPrimary;

	const pessoa = item.pessoa || "";
	const descricao = getDescricao(item);
	const categoria = item.categoria || "";
	const titulo = pessoa || descricao || categoria;
	const hasLinha3 = pessoa || descricao;

	return (
		<Pressable
			key={String(item.id_transacao)}
			onPress={onPress}
			onLongPress={onLongPress}
			delayLongPress={300}
		>
			<Box
				className="rounded-lg border px-3 py-2 mb-0"
				style={{
					backgroundColor: colors.surface,
					borderColor: colors.border,
				}}
			>
				{/* Linha 1: ícone + categoria + valor */}
				<Box className="flex-row items-center justify-between">
					<Box className="flex-row items-center gap-3 flex-1 mr-2">
						{isVencido ? (
							<CircleAlert size={22} color={iconColor} />
						) : isReceber ? (
							<ArrowUpCircle size={22} color={iconColor} />
						) : (
							<ArrowDownCircle size={22} color={iconColor} />
						)}
						<Text
							className="font-medium flex-1"
							style={{ color: colors.textPrimary }}
							numberOfLines={1}
							ellipsizeMode="tail"
						>
							{titulo}
						</Text>
					</Box>
					<Text
						className="font-semibold"
						style={{ color: colors.textPrimary }}
					>
						{formatCurrency(item.valor)}
					</Text>
				</Box>

				<Box className="flex-row items-center justify-between mt-0.5">
					<Text
						className="text-xs"
						style={{ color: colors.textSecondary }}
					>
						{formatDate(item.data_vencimento)}
					</Text>
					<Text
						className="text-xs"
						style={{ color: colors.textSecondary }}
					>
						{isReceber ? "Recebimento" : "Pagamento"}
					</Text>
				</Box>

				{hasLinha3 ? (
					<Text
						className="text-xs mt-0.5"
						style={{ color: colors.textSecondary }}
						numberOfLines={1}
						ellipsizeMode="tail"
					>
						{[categoria, descricao].filter(Boolean).join(" - ")}
					</Text>
				) : null}
			</Box>
		</Pressable>
	);
}
