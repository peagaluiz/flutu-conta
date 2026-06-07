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
	} catch {}
	return item.observacao || "";
}

function TransacaoCard({ item, colors, onEdit, onDelete, onDarBaixa }) {
	const descricao = getDescricao(item);
	return (
		<CardBase colors={colors}>
			<HStack className="items-start justify-between gap-3">
				<VStack className="flex-1 gap-1">
					<Text
						className="font-semibold"
						numberOfLines={1}
						ellipsizeMode="tail"
						style={{ color: colors.textPrimary }}
					>
						{item.pessoa || "Sem pessoa"}
					</Text>
					<HStack className="items-center justify-between w-full">
						<Text
							className="text-xs"
							style={{ color: colors.textSecondary }}
						>
							{item.categoria || "Sem categoria"}
						</Text>
						<Text
							className="text-xs"
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

				<Text
					className="font-bold"
					style={{ color: colors.textPrimary }}
				>
					{formatCurrency(item.valor)}
				</Text>
			</HStack>

			<HStack className="mt-3 gap-2 flex-wrap">
				<ActionButton
					label="Dar Baixa"
					icon={CheckCircle}
					onPress={onDarBaixa}
					colors={colors}
					disabled={item.status !== "pendente"}
				/>
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
