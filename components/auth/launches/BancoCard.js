import React, { memo } from "react";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import ActionButton from "./ActionButton";
import CardBase from "./CardBase";
import { Pencil, Trash2 } from "lucide-react-native";

function Badge({ label, colors }) {
	return (
		<Box className="rounded-full px-2 py-0.5" style={{ backgroundColor: colors.surfaceMuted }}>
			<Text className="text-[10px] font-semibold" style={{ color: colors.textSecondary }}>
				{label}
			</Text>
		</Box>
	);
}

function BancoCard({ item, colors, onEdit, onDelete }) {
	// fallback p/ bancos antigos sem flags
	const legacyCartao = item.tipo === "cartao_credito";
	const isCartao = item.is_cartao != null ? Number(item.is_cartao) === 1 : legacyCartao;
	const isCorrente = item.is_corrente != null ? Number(item.is_corrente) === 1 : !legacyCartao;

	const subtitle =
		isCartao && item.dia_fechamento && item.dia_vencimento
			? `Fecha dia ${item.dia_fechamento} • Vence dia ${item.dia_vencimento}`
			: isCorrente && isCartao
			? "Conta corrente e cartão"
			: isCartao
			? "Cartão de crédito"
			: "Conta corrente";

	return (
		<CardBase colors={colors}>
			<HStack className="items-center gap-3">
				<Box
					className="rounded-full"
					style={{ width: 12, height: 12, backgroundColor: item.cor_hex || "#6B7280" }}
				/>
				<VStack className="flex-1 gap-0.5">
					<HStack className="items-center gap-2">
						<Text className="font-semibold" style={{ color: colors.textPrimary }}>
							{item.nome || "Sem nome"}
						</Text>
						{isCorrente ? <Badge label="CONTA" colors={colors} /> : null}
						{isCartao ? <Badge label="CARTÃO" colors={colors} /> : null}
					</HStack>
					<Text className="text-xs" style={{ color: colors.textSecondary }}>
						{subtitle}
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
