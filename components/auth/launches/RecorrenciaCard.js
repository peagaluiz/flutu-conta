import React, { memo, useState } from "react";
import { View } from "react-native";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import ActionButton from "./ActionButton";
import CardBase from "./CardBase";
import { ActionListModal } from "@/components/ui/ActionListModal";
import { Pause, Play, Trash2 } from "lucide-react-native";
import { formatCurrency, formatDate } from "@/utils/finance/helpers";

function toFrequencyLabel(value) {
	if (value === "semanal") return "Semanal";
	if (value === "anual") return "Anual";
	if (value === "dias") return "Personalizada";
	return "Mensal";
}

function getDescricao(item) {
	try {
		const parsed = JSON.parse(item.json || "{}");
		if (parsed?.descricao) return parsed.descricao;
	} catch {}
	return item.observacao || "";
}

function RecorrenciaCard({ item, colors, onToggleStatus, onDelete }) {
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const isActive = item?.status === "ativa";
	const frequencyLabel = toFrequencyLabel(item?.frequency);
	const descricao = getDescricao(item);

	return (
		<>
			<CardBase colors={colors}>
				<VStack className="w-full gap-1">
					<HStack className="items-start justify-between w-full gap-3">
						<HStack className="flex-1 items-center gap-1.5 overflow-hidden">
							<Text
								className="font-semibold shrink"
								numberOfLines={1}
								ellipsizeMode="tail"
								style={{ color: colors.textPrimary }}
							>
								{item.pessoa || descricao || "Sem pessoa"}
							</Text>
							<View
								style={{
									backgroundColor: colors.brand + "22",
									borderRadius: 4,
									paddingHorizontal: 6,
									paddingVertical: 2,
									flexShrink: 0,
								}}
							>
								<Text
									className="text-xs font-medium"
									style={{ color: colors.brand }}
								>
									{frequencyLabel}
								</Text>
							</View>
						</HStack>
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
							{formatDate(item.base_due_date)}
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

					<Text className="text-xs" style={{ color: colors.textSecondary }}>
						Próxima geração: {formatDate(item.next_due_date || item.base_due_date)}
					</Text>

					<Text className="text-xs" style={{ color: colors.textSecondary }}>
						{isActive ? "Ativa" : "Pausada"} •{" "}
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
						onPress={() => setDeleteModalOpen(true)}
						colors={colors}
					/>
				</HStack>
			</CardBase>

			<ActionListModal
				isOpen={deleteModalOpen}
				onClose={() => setDeleteModalOpen(false)}
				title="Excluir recorrência"
				items={[
					{
						render: (c) => (
							<Text className="text-sm mb-1" style={{ color: c.textSecondary }}>
								O que deseja excluir?
							</Text>
						),
					},
					{
						label: "Apenas o agendamento",
						onPress: () => {
							setDeleteModalOpen(false);
							// Defere para depois da animação de fechamento do modal,
							// senão o React acusa update durante useInsertionEffect
							setTimeout(() => onDelete(false), 0);
						},
					},
					{
						label: "Agendamento e todos os lançamentos",
						onPress: () => {
							setDeleteModalOpen(false);
							setTimeout(() => onDelete(true), 0);
						},
					},
				]}
			/>
		</>
	);
}

export default memo(RecorrenciaCard);
