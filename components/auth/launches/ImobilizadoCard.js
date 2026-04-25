import React, { memo } from "react";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import ActionButton from "./ActionButton";
import CardBase from "./CardBase";
import { Pencil, Trash2 } from "lucide-react-native";

function ImobilizadoCard({ item, colors, onEdit, onDelete }) {
    return (
        <CardBase colors={colors}>
            <VStack className="gap-1">
                <Text className="font-semibold" style={{ color: colors.textPrimary }}>
                    {item.descricao || item.codigo || "Sem nome"}
                </Text>
                <Text className="text-xs" style={{ color: colors.textSecondary }}>
                    Registro simples
                </Text>
            </VStack>

            <HStack className="mt-3 gap-2">
                <ActionButton label="Editar" icon={Pencil} onPress={onEdit} colors={colors} />
                <ActionButton label="Excluir" icon={Trash2} onPress={onDelete} colors={colors} />
            </HStack>
        </CardBase>
    );
}

export default memo(ImobilizadoCard);