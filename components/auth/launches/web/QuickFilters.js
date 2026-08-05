import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";

const QUICK_FILTERS = [
    { key: "todos", label: "Todos" },
    { key: "pagar", label: "A pagar" },
    { key: "receber", label: "A receber" },
    { key: "pendentes", label: "Pendentes" },
];

// Chips de filtro rápido. Sem moldura própria: vivem no slot esquerdo da barra
// da DataTable, na mesma linha do contador e do seletor de itens por página.
export function QuickFilters({ quickFilter, onChange, colors }) {
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
            }}
        >
            {QUICK_FILTERS.map((filter) => {
                const active = quickFilter === filter.key;
                return (
                    <Pressable
                        key={filter.key}
                        onPress={() => onChange(filter.key)}
                        style={({ hovered }) => ({
                            height: 30,
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 1,
                            borderColor: active ? colors.textPrimary : colors.border,
                            backgroundColor: active
                                ? colors.textPrimary
                                : hovered
                                    ? colors.surfaceMuted
                                    : "transparent",
                        })}
                    >
                        <Text
                            className="text-xs font-medium"
                            style={{ color: active ? colors.surface : colors.textSecondary }}
                        >
                            {filter.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}
