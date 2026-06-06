import React, { memo } from "react";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import ActionButton from "./ActionButton";
import CardBase from "./CardBase";
import { Pencil, Trash2 } from "lucide-react-native";
import { formatCurrency } from "@/utils/finance/helpers";

function TransacaoCard({ item, colors, onEdit, onDelete }) {
	return (
		<CardBase colors={colors}>
			<HStack className="items-start justify-between gap-3">
				<VStack className="flex-1 gap-1">
					<Text
						className="font-semibold"
						style={{ color: colors.textPrimary }}
					>
						<Text style={{ color: colors.textSecondary }}>
							{item.id_transacao ? `#${item.id_transacao} ` : ""}
						</Text>
						{item.descricao || item.categoria || "Transação"}
					</Text>
					{Number(item?.is_from_recurrence || 0) === 1 ? (
						<Text
							className="text-[11px]"
							style={{ color: colors.textSecondary }}
						>
							Origem: recorrência
						</Text>
					) : null}
					<Text
						className="text-xs"
						style={{ color: colors.textSecondary }}
					>
						{item.categoria || "Sem categoria"} •{" "}
						{item.status || "pendente"}
					</Text>
					<Text
						className="text-sm"
						style={{ color: colors.textSecondary }}
					>
						{item.pessoa || "Sem pessoa"}
					</Text>
				</VStack>

				<Text
					className="font-bold"
					style={{ color: colors.textPrimary }}
				>
					{formatCurrency(item.valor)}
				</Text>
			</HStack>

			<HStack className="mt-3 gap-2">
				<ActionButton
					label="Editar"
					icon={Pencil}
					onPress={onEdit}
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

export default memo(TransacaoCard);
