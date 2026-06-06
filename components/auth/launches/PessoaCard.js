import React, { memo } from "react";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import ActionButton from "./ActionButton";
import CardBase from "./CardBase";
import { Pencil, RefreshCw, Trash2 } from "lucide-react-native";

function PessoaCard({ item, colors, onEdit, onDelete, onSync }) {
	const pending = Number(item?.is_pending || 0) === 1;

	return (
		<CardBase colors={colors} danger={pending}>
			<VStack className="gap-1">
				<Text
					className="font-semibold"
					style={{ color: colors.textPrimary }}
				>
					<Text style={{ color: colors.textSecondary }}>
						{item.id_pessoa ? `#${item.id_pessoa} ` : ""}
					</Text>
					{item.nome || "Sem nome"}
				</Text>

				<Text
					className="text-xs"
					style={{ color: colors.textSecondary }}
				>
					{pending
						? `Pendente • ${Number(
								item.pending_count || 0
						  )} lançamento(s)`
						: "Registro simples"}
				</Text>
			</VStack>

			<HStack className="mt-3 gap-2">
				<ActionButton
					label="Editar"
					icon={Pencil}
					onPress={onEdit}
					colors={colors}
				/>

				{pending ? (
					<ActionButton
						label="Sincronizar"
						icon={RefreshCw}
						onPress={onSync}
						colors={colors}
					/>
				) : (
					<ActionButton
						label="Excluir"
						icon={Trash2}
						onPress={onDelete}
						colors={colors}
					/>
				)}
			</HStack>
		</CardBase>
	);
}

export default memo(PessoaCard);
