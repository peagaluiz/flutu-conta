import { View } from "react-native";
import { Text } from "@/components/ui/text";

// Conteúdo da linha expandida da tabela de lançamentos.
export function ExpandedObservacao({ text, colors }) {
    return (
        <View
            style={{
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                paddingHorizontal: 12,
                paddingVertical: 10,
            }}
        >
            <Text className="text-[11px] font-semibold uppercase" style={{ color: colors.textSecondary, letterSpacing: 0.4 }}>
                Observação
            </Text>
            <Text className="text-sm mt-1" style={{ color: text ? colors.textPrimary : colors.textSecondary }}>
                {text || "Sem observação."}
            </Text>
        </View>
    );
}
