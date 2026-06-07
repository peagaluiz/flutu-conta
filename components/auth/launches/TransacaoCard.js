import React, { memo } from "react";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import ActionButton from "./ActionButton";
import CardBase from "./CardBase";
import { CheckCircle, Pencil, Trash2 } from "lucide-react-native";
import { formatCurrency, formatDate } from "@/utils/finance/helpers";

function getDescricao(item) {
    try {
        const parsed = JSON.parse(item.json || "{}");
        if (parsed?.descricao) return parsed.descricao;
    } catch { }
    return item.observacao || "";
}

function TransacaoCard({ item, colors, onEdit, onDelete, onDarBaixa }) {
    const descricao = getDescricao(item);
    return (
        <CardBase colors={colors}>
            <VStack className="w-full gap-1">
                <HStack className="items-start justify-between w-full gap-3">
                    <Text
                        className="font-semibold flex-1"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={{ color: colors.textPrimary }}
                    >
                        {item.pessoa || "Sem pessoa"}
                    </Text>
                    <Text
                        className="font-bold text-right"
                        style={{ color: colors.textPrimary }}
                    >
                        {formatCurrency(item.valor)}
                    </Text>
                </HStack>
                <HStack className="items-center justify-between w-full flex-row mt-0.5">
                    <Text
                        className="text-xs flex-1 mr-4"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={{ color: colors.textSecondary }}
                    >
                        {item.categoria || "Sem categoria"}
                    </Text>
                    <Text
                        className="text-xs text-right"
                        style={{ color: colors.textSecondary }}
                    >
                        {formatDate(item.data_vencimento)}
                    </Text>
                </HStack>
                {descricao ? (
                    <Text
                        className="text-xs"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={{ color: colors.textSecondary }}
                    >
                        {descricao}
                    </Text>
                ) : null}
            </VStack>

            <HStack className="mt-3 gap-2 flex-wrap">
                <ActionButton
                    label={item.status === "pendente" ? "Dar Baixa" : "Remover baixa"}
                    icon={CheckCircle}
                    onPress={onDarBaixa}
                    colors={colors}
                />
                <ActionButton
                    icon={Pencil}
                    onPress={onEdit}
                    colors={colors}
                    className="flex-none"
                />
                <ActionButton
                    icon={Trash2}
                    onPress={onDelete}
                    colors={colors}
                    className="flex-none"
                />
            </HStack>
        </CardBase>
    );
}

export default memo(TransacaoCard);
