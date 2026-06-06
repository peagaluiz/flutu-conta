import React, { memo } from "react";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import ActionButton from "./ActionButton";
import CardBase from "./CardBase";
import { Pause, Play, Trash2 } from "lucide-react-native";

function toFrequencyLabel(value) {
	if (value === "semanal") return "Semanal";
	if (value === "anual") return "Anual";
	if (value === "dias") return "Personalizada por dias";
	return "Mensal";
}

function RecorrenciaCard({ item, colors, onToggleStatus, onDelete }) {
	const isActive = item?.status === "ativa";
	const frequencyLabel = toFrequencyLabel(item?.frequency);
	const dueDate = item?.next_due_date || item?.base_due_date || "sem data";

	return (
		<CardBase colors={colors}>
			<VStack className="gap-1">
				<Text
					className="font-semibold"
					style={{ color: colors.textPrimary }}
				>
					{frequencyLabel}
				</Text>
				<Text
					className="text-xs"
					style={{ color: colors.textSecondary }}
				>
					Próxima geração: {dueDate}
				</Text>
				<Text
					className="text-xs"
					style={{ color: colors.textSecondary }}
				>
					Status: {isActive ? "Ativa" : "Pausada"} •{" "}
					{Number(item?.active_transactions_count || 0)} lançamentos
				</Text>
			</VStack>

			<HStack className="mt-3 gap-2">
				<ActionButton
					label={isActive ? "Pausar" : "Reativar"}
					icon={isActive ? Pause : Play}
					onPress={onToggleStatus}
					colors={colors}
				/>
				<ActionButton
					label="Excluir"
					icon={Trash2}
					onPress={onDelete}
					colors={colors}
				/>
			</HStack>
		</CardBase>
	);
}

export default memo(RecorrenciaCard);
