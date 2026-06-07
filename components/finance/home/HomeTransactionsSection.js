import { useState } from "react";
import { Alert } from "react-native";
import { CheckCircle, MoreHorizontal, Pencil, Trash2, Wallet, XCircle } from "lucide-react-native";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Divider } from "@/components/ui/divider";
import Loader from "@/components/ui/loader";
import { DatePickerDialog } from "@/components/ui/DatePickerDialog";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { toISODateString } from "@/utils/finance/helpers";
import { LancamentoListItem } from "@/components/finance/home/LancamentoListItem";
import {
	Modal,
	ModalBackdrop,
	ModalContent,
	ModalHeader,
	ModalBody,
	ModalFooter,
} from "@/components/ui/modal";
import { Button, ButtonText } from "@/components/ui/button";

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
					{items.slice(0, previewLimit).map((item) => (
						<LancamentoListItem
							key={String(item.id_transacao)}
							item={item}
							onPress={() => onPressItem(item)}
							onLongPress={() => setMenuItem(item)}
						/>
					))}

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

			<Modal isOpen={!!menuItem} onClose={closeMenu} size="md">
				<ModalBackdrop />
				<ModalContent>
					<ModalHeader>
						<Text
							className="text-lg font-semibold"
							style={{ color: colors.textPrimary }}
							numberOfLines={1}
						>
							{menuItem?.pessoa || menuItem?.categoria || "Lançamento"}
						</Text>
					</ModalHeader>
					<ModalBody className="gap-1">
						<Pressable
							onPress={handleEditar}
							className="flex-row items-center gap-3 py-3 px-1 rounded-lg"
						>
							<Pencil size={20} color={colors.textPrimary} />
							<Text style={{ color: colors.textPrimary }} className="text-base">
								Editar
							</Text>
						</Pressable>

						<Divider style={{ backgroundColor: colors.border }} />

						{menuItem?.status !== "pago" ? (
							<Pressable
								onPress={handleAbrirBaixa}
								className="flex-row items-center gap-3 py-3 px-1 rounded-lg"
							>
								<CheckCircle size={20} color={colors.textPrimary} />
								<Text style={{ color: colors.textPrimary }} className="text-base">
									Dar baixa
								</Text>
							</Pressable>
						) : (
							<Pressable
								onPress={handleRemoverBaixaPress}
								className="flex-row items-center gap-3 py-3 px-1 rounded-lg"
							>
								<XCircle size={20} color={colors.textPrimary} />
								<Text style={{ color: colors.textPrimary }} className="text-base">
									Remover baixa
								</Text>
							</Pressable>
						)}

						<Divider style={{ backgroundColor: colors.border }} />

						<Pressable
							onPress={handleExcluir}
							className="flex-row items-center gap-3 py-3 px-1 rounded-lg"
						>
							<Trash2 size={20} color={colors.dangerText} />
							<Text style={{ color: colors.dangerText }} className="text-base">
								Excluir
							</Text>
						</Pressable>
					</ModalBody>
					<ModalFooter>
						<Button action="secondary" variant="outline" onPress={closeMenu}>
							<ButtonText>Cancelar</ButtonText>
						</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>

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
