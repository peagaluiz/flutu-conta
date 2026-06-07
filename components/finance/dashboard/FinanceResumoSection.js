import React from "react";
import { BarChart2 } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";

export function FinanceResumoSection({
    resumo,
    colors,
    onPressSaldo,
    onPressEntradas,
    onPressSaidas,
    onPressPendentes,
}) {
    const { theme } = useTheme();
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
        <Box className="rounded-xl px-5 py-5 border gap-4" style={cardStyle}>
            <Box className="flex-row items-center gap-2">
                <Box className="rounded-full p-2" style={iconShellStyle}>
                    <BarChart2 size={16} color={colors.textPrimary} />
                </Box>
                <Text className="font-semibold" style={{ color: colors.textPrimary }}>
                    Visão
                </Text>
            </Box>

            <Box className="gap-1">
                <Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
                    Valores
                </Text>
                <Text className="text-sm" style={{ color: colors.textSecondary }}>
                    Veja aqui um resumo mais detalhado dos valores com base nos filtros aplicados na tela inicial.
                </Text>
            </Box>

            <Box className="gap-2">
                <HStack className="gap-2">
                    <Pressable className="flex-1" onPress={onPressSaldo}>
                        <Box className="rounded-xl border px-3 py-3" style={infoCardStyle}>
                            <Text className="text-xs" style={{ color: colors.textSecondary }}>
                                Consolidado
                            </Text>
                            <Text
                                className="text-lg font-bold"
                                style={{ color: colors.textPrimary }}
                            >
                                {resumo.saldoLabel}
                            </Text>
                        </Box>
                    </Pressable>

                    <Box className="flex-1 rounded-xl border px-3 py-3" style={infoCardStyle}>
                        <Text className="text-xs" style={{ color: colors.textSecondary }}>
                            Real
                        </Text>
                        <Text
                            className="text-lg font-bold"
                            style={{ color: colors.textPrimary }}
                        >
                            {resumo.saldoRealLabel}
                        </Text>
                    </Box>
                </HStack>

                <HStack className="gap-2">
                    <Pressable className="flex-1" onPress={onPressEntradas}>
                        <Box className="rounded-xl border px-3 py-3" style={infoCardStyle}>
                            <Text className="text-xs" style={{ color: colors.textSecondary }}>
                                Entradas
                            </Text>
                            <Text
                                className="text-base font-semibold mt-1"
                                style={{ color: "#16A34A" }}
                            >
                                {resumo.entradasLabel}
                            </Text>
                        </Box>
                    </Pressable>

                    <Pressable className="flex-1" onPress={onPressSaidas}>
                        <Box className="rounded-xl border px-3 py-3" style={infoCardStyle}>
                            <Text className="text-xs" style={{ color: colors.textSecondary }}>
                                Saídas
                            </Text>
                            <Text
                                className="text-base font-semibold mt-1"
                                style={{ color: "#DC2626" }}
                            >
                                {resumo.saidasLabel}
                            </Text>
                        </Box>
                    </Pressable>

                    <Pressable className="flex-1" onPress={onPressPendentes}>
                        <Box className="rounded-xl border px-3 py-3" style={infoCardStyle}>
                            <Text className="text-xs" style={{ color: colors.textSecondary }}>
                                Pendentes
                            </Text>
                            <Text
                                className="text-base font-semibold mt-1"
                                style={{ color: colors.textPrimary }}
                            >
                                {resumo.pendentes}
                            </Text>
                        </Box>
                    </Pressable>
                </HStack>
            </Box>
        </Box>
    );
}
