import React, { memo } from "react";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import ActionButton from "./ActionButton";
import CardBase from "./CardBase";
import { Pencil, Trash2 } from "lucide-react-native";

function BancoCard({ item, colors, onEdit, onDelete }) {
	return (
		<CardBase colors={colors}>
			<HStack className="items-center gap-3">
				<Box
					className="rounded-full"
					style={{ width: 12, height: 12, backgroundColor: item.cor_hex || "#6B7280" }}
				/>
				<VStack className="flex-1 gap-0.5">
					<Text className="font-semibold" style={{ color: colors.textPrimary }}>
						{item.nome || "Sem nome"}
					</Text>
					<Text className="text-xs" style={{ color: colors.textSecondary }}>
						{item.id_banco ? `#${item.id_banco}` : "Banco"}
					</Text>
				</VStack>
			</HStack>

			<HStack className="mt-3 gap-2">
				<ActionButton label="Editar" icon={Pencil} onPress={onEdit} colors={colors} />
				<ActionButton label="Excluir" icon={Trash2} onPress={onDelete} colors={colors} />
			</HStack>
		</CardBase>
	);
}

export default memo(BancoCard);
