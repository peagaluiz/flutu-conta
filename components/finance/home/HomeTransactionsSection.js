import { useState } from "react";
import { Alert } from "react-native";
import {
	CheckCircle,
	ChevronDown,
	ChevronUp,
	CreditCard,
	MoreHorizontal,
	Pencil,
	Trash2,
	Wallet,
	XCircle,
} from "lucide-react-native";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import Loader from "@/components/ui/loader";
import { DatePickerDialog } from "@/components/ui/DatePickerDialog";
import { ActionListModal } from "@/components/ui/ActionListModal";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { formatCurrency, formatDate, toISODateString } from "@/utils/finance/helpers";
import { LancamentoListItem } from "@/components/finance/home/LancamentoListItem";
import { LancamentoSummary } from "@/components/finance/home/LancamentoSummary";

const FATURA_STATUS_LABEL = { aberta: "Aberta", fechada: "Fechada", paga: "Paga" };

function FaturaGroupRow({ group, colors, expanded, onToggle, onPressItem }) {
	return (
		<Box className="mb-1">
			<Pressable onPress={onToggle}>
				<Box
					className="rounded-lg border px-3 py-2"
					style={{ backgroundColor: colors.surface, borderColor: colors.border }}
				>
					{/* Linha 1: ícone + título + valor + chevron */}
					<Box className="flex-row items-center justify-between">
						<Box className="flex-row items-center gap-3 flex-1 mr-2">
							<CreditCard size={22} color="#F59E0B" />
							<Text
								className="font-medium flex-1"
								style={{ color: colors.textPrimary }}
								numberOfLines={1}
								ellipsizeMode="tail"
							>
								Fatura {group.banco_nome}
							</Text>
						</Box>
						<Box className="flex-row items-center gap-1">
							<Text className="font-semibold" style={{ color: colors.textPrimary }}>
								{formatCurrency(group.valor)}
							</Text>
							{expanded ? (
								<ChevronUp size={16} color={colors.textSecondary} />
							) : (
								<ChevronDown size={16} color={colors.textSecondary} />
							)}
						</Box>
					</Box>

					{/* Linha 2: data • qtd • status */}
					<Box className="flex-row items-center justify-between mt-0.5">
						<Text className="text-xs" style={{ color: colors.textSecondary }}>
							{formatDate(group.data_vencimento)} •{" "}
							{group.items.length} lançamento{group.items.length > 1 ? "s" : ""}
						</Text>
						<Text className="text-xs" style={{ color: colors.textSecondary }}>
							{FATURA_STATUS_LABEL[group.status] ?? group.status}
						</Text>
					</Box>
				</Box>
			</Pressable>

			{expanded ? (
				<Box className="mt-1 gap-1">
					{group.items.map((child) => (
						<LancamentoListItem
							key={String(child.id_transacao)}
							item={child}
							iconColor="#F59E0B"
							onPress={() => onPressItem(child)}
							onLongPress={undefined}
						/>
					))}
				</Box>
			) : null}
		</Box>
	);
}

export function HomeTransactionsSection({
	loading,
	items,
	onPressItem,
	onDeleteItem,
	onDarBaixa,
	onRemoverBaixa,
	onPressSeeAll,
	previewLimit = 3,
}) {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);

	const [menuItem, setMenuItem] = useState(null);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [expandedFaturas, setExpandedFaturas] = useState(() => new Set());

	const toggleFatura = (idFatura) =>
		setExpandedFaturas((prev) => {
			const next = new Set(prev);
			next.has(idFatura) ? next.delete(idFatura) : next.add(idFatura);
			return next;
		});

	const closeMenu = () => setMenuItem(null);

	const handleEditar = () => {
		const item = menuItem;
		closeMenu();
		if (item) onPressItem(item);
	};

	const handleAbrirBaixa = () => {
		setShowDatePicker(true);
	};

	const handleConfirmBaixa = ({ date }) => {
		setShowDatePicker(false);
		const item = menuItem;
		closeMenu();
		if (item && date) onDarBaixa?.(item, toISODateString(date));
	};

	const handleRemoverBaixaPress = () => {
		const item = menuItem;
		closeMenu();
		if (item) onRemoverBaixa?.(item);
	};

	const handleExcluir = () => {
		const item = menuItem;
		closeMenu();
		if (!item) return;
		Alert.alert("Excluir", "Deseja excluir este lançamento?", [
			{ text: "Cancelar", style: "cancel" },
			{
				text: "Excluir",
				style: "destructive",
				onPress: () => onDeleteItem?.(item),
			},
		]);
	};

	return (
		<Box
			className="rounded-xl border p-4 gap-3"
			style={{
				backgroundColor: colors.surface,
				borderColor: colors.border,
			}}
		>
			<Box className="flex-row items-center justify-between">
				<HStack space="sm" className="items-center">
					<Wallet size={20} color={colors.textPrimary} />
					<Text
						className="font-semibold"
						style={{ color: colors.textPrimary }}
					>
						Últimos lançamentos
					</Text>
				</HStack>
			</Box>

			{loading ? (
				<Box style={{ minHeight: 180 }}>
					<Loader />
				</Box>
			) : items.length === 0 ? (
				<Text style={{ color: colors.textSecondary }}>
					Nenhum lançamento encontrado. Arraste para atualizar.
				</Text>
			) : (
				<Box className="gap-1">
					{items.slice(0, previewLimit).map((item) =>
						item.is_fatura_group ? (
							<FaturaGroupRow
								key={String(item.id_transacao)}
								group={item}
								colors={colors}
								expanded={expandedFaturas.has(item.id_fatura)}
								onToggle={() => toggleFatura(item.id_fatura)}
								onPressItem={(child) => setMenuItem(child)}
							/>
						) : (
							<LancamentoListItem
								key={String(item.id_transacao)}
								item={item}
								onPress={() => setMenuItem(item)}
								onLongPress={undefined}
							/>
						)
					)}

					{items.length > previewLimit ? (
						<Pressable onPress={onPressSeeAll}>
							<Box
								className="flex-row items-center justify-center gap-2 rounded-lg border px-3 py-3"
								style={{
									backgroundColor: colors.surfaceMuted,
									borderColor: colors.border,
								}}
							>
								<MoreHorizontal
									size={18}
									color={colors.textPrimary}
								/>
								<Text
									className="text-sm font-medium"
									style={{ color: colors.textPrimary }}
								>
									Ver todos os lançamentos
								</Text>
							</Box>
						</Pressable>
					) : null}
				</Box>
			)}

			<ActionListModal
				isOpen={!!menuItem}
				onClose={closeMenu}
				title="Ações rápidas"
				items={[
					{ render: () => <LancamentoSummary item={menuItem} /> },
					{ label: "Editar", icon: Pencil, onPress: handleEditar },
					menuItem?.status !== "pago"
						? { label: "Dar baixa", icon: CheckCircle, onPress: handleAbrirBaixa }
						: { label: "Remover baixa", icon: XCircle, onPress: handleRemoverBaixaPress },
					{ label: "Excluir", icon: Trash2, color: colors.dangerText, onPress: handleExcluir },
				]}
			/>

			<DatePickerDialog
				visible={showDatePicker}
				locale="pt"
				mode="single"
				date={new Date()}
				onDismiss={() => setShowDatePicker(false)}
				onConfirm={handleConfirmBaixa}
			/>
		</Box>
	);
}
