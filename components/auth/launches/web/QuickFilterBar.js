import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";

const QUICK_FILTERS = [
    { key: "todos", label: "Todos" },
    { key: "pagar", label: "A pagar" },
    { key: "receber", label: "A receber" },
    { key: "pendentes", label: "Pendentes" },
];

export function QuickFilterBar({ quickFilter, onChange, colors }) {
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
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
