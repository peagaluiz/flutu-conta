import { useMemo, useState } from "react";
import { Alert } from "@/utils/alert";
import {
	CheckCircle,
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
import { toISODateString } from "@/utils/finance/helpers";
import { LancamentoListItem } from "@/components/finance/home/LancamentoListItem";
import { LancamentoSummary } from "@/components/finance/home/LancamentoSummary";
import { FaturaGroupRow } from "@/components/finance/home/FaturaGroupRow";
import { HomeTransactionsTable } from "@/components/finance/home/HomeTransactionsTable";
import { useIsDesktopWeb } from "@/hooks/useIsDesktopWeb";
import { getTableColumns } from "@/utils/auth/launches/tableColumns";

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
	const isDesktopWeb = useIsDesktopWeb();
	const columns = useMemo(() => getTableColumns("transacoes", colors), [colors]);

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
				<Box className={isDesktopWeb ? "" : "gap-1"}>
					{isDesktopWeb ? (
						<HomeTransactionsTable
							items={items}
							columns={columns}
							colors={colors}
							previewLimit={previewLimit}
							expandedFaturas={expandedFaturas}
							toggleFatura={toggleFatura}
							onPressItem={(item) => setMenuItem(item)}
						/>
					) : (
						items.slice(0, previewLimit).map((item) =>
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
						)
					)}

					{items.length > previewLimit ? (
						<Pressable onPress={onPressSeeAll}>
							<Box
								className="flex-row items-center justify-center gap-2 rounded-lg border px-3 py-3"
								style={{
									backgroundColor: colors.surfaceMuted,
									borderColor: colors.border,
									marginTop: isDesktopWeb ? 12 : 0,
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
