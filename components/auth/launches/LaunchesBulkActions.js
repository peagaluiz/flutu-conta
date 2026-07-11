import { useCallback } from "react";
import { Alert } from "@/utils/alert";
import { Trash2, CheckCircle, XCircle, X } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText, ButtonIcon } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";

export function LaunchesBulkActions({
    selectedIds,
    selectedItems,
    colors,
    onDelete,
    onDarBaixa,
    onRemoverBaixa,
    onClear,
}) {
    const count = selectedIds.size;
    const allHaveBaixa = selectedItems.length > 0 && selectedItems.every((item) => !!item.data_baixa);

    const handleDelete = useCallback(() => {
        Alert.alert("Excluir", `Deseja excluir ${count} item(s)?`, [
            { text: "Cancelar", style: "cancel" },
            { text: "Excluir", style: "destructive", onPress: onDelete },
        ]);
    }, [count, onDelete]);

    if (count === 0) return null;

    return (
        <Box
            className="rounded-2xl border p-4 mb-2"
            style={{
                backgroundColor: colors.surface,
                borderColor: colors.brand,
            }}
        >
            <HStack className="items-center justify-between mb-3">
                <Text
                    className="font-semibold"
                    style={{ color: colors.textPrimary }}
                >
                    {count} selecionado{count !== 1 ? "s" : ""}
                </Text>
                <Pressable onPress={onClear} hitSlop={8}>
                    <HStack className="items-center gap-1">
                        <X size={14} color={colors.textSecondary} />
                        <Text style={{ color: colors.textSecondary }}>
                            Cancelar
                        </Text>
                    </HStack>
                </Pressable>
            </HStack>

            <HStack className="gap-2">
                <Button
                    variant="outline"
                    action="negative"
                    className="flex-1"
                    onPress={handleDelete}
                >
                    <ButtonIcon as={Trash2} />
                    <ButtonText>Excluir</ButtonText>
                </Button>

                <Button
                    className="flex-1"
                    onPress={allHaveBaixa ? onRemoverBaixa : onDarBaixa}
                >
                    <ButtonIcon as={allHaveBaixa ? XCircle : CheckCircle} />
                    <ButtonText>
                        {allHaveBaixa ? "Remover baixa" : "Dar baixa"}
                    </ButtonText>
                </Button>
            </HStack>
        </Box>
    );
}
