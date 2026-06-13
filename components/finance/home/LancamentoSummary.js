import { ArrowDownCircle, ArrowUpCircle, CircleAlert, RefreshCw, User } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import {
    formatCurrency,
    formatDate,
    getRecurrenceInfo,
    isRecebimentoVencido,
} from "@/utils/finance/helpers";
import { PrevistaBadge } from "@/components/finance/PrevistaBadge";

function getDescricao(item) {
    try {
        const parsed = JSON.parse(item.json || "{}");
        if (parsed?.descricao) return parsed.descricao;
    } catch { }
    return item.observacao || "";
}

export function LancamentoSummary({ item }) {
    const { theme } = useTheme();
    const colors = getThemeColors(theme);

    if (!item) return null;

    const isReceber = item.tipo === "receber";
    const isVencido = isRecebimentoVencido(item);
    const TipoIcon = isVencido ? CircleAlert : isReceber ? ArrowUpCircle : ArrowDownCircle;
    const descricao = getDescricao(item);
    const recurrenceInfo = getRecurrenceInfo(item);

    return (
        <Box
            className="rounded-xl px-4 py-3 border gap-1.5"
            style={{
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
                borderBottomWidth: 5,
                marginBottom: 6
            }}
        >
            {item.pessoa ? (
                <HStack className="items-center gap-2">
                    <User size={14} color={colors.textSecondary} />
                    <Text className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                        {item.pessoa}
                    </Text>
                </HStack>
            ) : null}

            <HStack className="items-center gap-2">
                <TipoIcon size={16} color={colors.textPrimary} />
                <Text
                    className="text-sm font-medium flex-1"
                    style={{ color: colors.textPrimary }}
                    numberOfLines={1}
                >
                    {item.categoria || "Sem categoria"}
                </Text>
                {recurrenceInfo ? (
                    <HStack
                        className="items-center gap-1 rounded-full px-2 py-0.5"
                        style={{ backgroundColor: colors.brandSoft }}
                    >
                        <RefreshCw size={10} color={colors.brand} />
                        <Text className="text-xs font-medium" style={{ color: colors.brand }}>
                            Recorrente
                        </Text>
                    </HStack>
                ) : null}
                {item.is_ghost ? <PrevistaBadge colors={colors} /> : null}
            </HStack>

            {descricao ? (
                <Box
                    className="w-full rounded-lg px-3 py-2 border"
                    style={{ backgroundColor: colors.surfaceAlt, borderColor: colors.border }}
                >
                    <Text
                        className="text-xs"
                        style={{ color: colors.textSecondary }}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {descricao}
                    </Text>
                </Box>
            ) : null}

            <Text className="text-base font-semibold mt-0.5" style={{ color: colors.textPrimary }}>
                {formatCurrency(item.valor)}
            </Text>

            <HStack className="gap-4">
                <Box>
                    <Text className="text-xs" style={{ color: colors.textSecondary }}>
                        Vencimento
                    </Text>
                    <Text className="text-xs font-medium" style={{ color: colors.textPrimary }}>
                        {formatDate(item.data_vencimento)}
                    </Text>
                </Box>
                {item.data_baixa ? (
                    <Box>
                        <Text className="text-xs" style={{ color: colors.textSecondary }}>
                            Baixa
                        </Text>
                        <Text className="text-xs font-medium" style={{ color: colors.textPrimary }}>
                            {formatDate(item.data_baixa)}
                        </Text>
                    </Box>
                ) : null}
            </HStack>
        </Box>
    );
}
