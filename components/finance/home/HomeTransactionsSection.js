import { Funnel, MoreHorizontal, Wallet } from "lucide-react-native";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import Loader from "@/components/ui/loader";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { LancamentoListItem } from "@/components/finance/home/LancamentoListItem";
import {
	Actionsheet,
	ActionsheetBackdrop,
	ActionsheetContent,
	ActionsheetDragIndicator,
	ActionsheetDragIndicatorWrapper,
	ActionsheetItem,
	ActionsheetItemText,
} from "@/components/ui/actionsheet";
import {
	getFilterLabel,
	TRANSACTION_FILTER_OPTIONS,
} from "@/utils/finance/homeScreenHelpers";

export function HomeTransactionsSection({
	loading,
	items,
	filterType,
	isFilterSheetOpen,
	onOpenFilterSheet,
	onCloseFilterSheet,
	onChangeFilter,
	onPressItem,
	onPressSeeAll,
	previewLimit = 3,
}) {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);

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
				<Pressable onPress={onOpenFilterSheet}>
					<Box
						className="p-2 rounded-md border"
						style={{ borderColor: colors.borderStrong }}
					>
						<Funnel size={16} color={colors.textPrimary} />
					</Box>
				</Pressable>
			</Box>

			<Text className="text-xs" style={{ color: colors.textSecondary }}>
				Filtro: {getFilterLabel(filterType)}
			</Text>

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

			<Actionsheet
				isOpen={isFilterSheetOpen}
				onClose={onCloseFilterSheet}
			>
				<ActionsheetBackdrop />
				<ActionsheetContent>
					<ActionsheetDragIndicatorWrapper>
						<ActionsheetDragIndicator />
					</ActionsheetDragIndicatorWrapper>

					{TRANSACTION_FILTER_OPTIONS.map((option, index) => (
						<ActionsheetItem
							key={option.value}
							style={{
								marginBottom:
									index ===
									TRANSACTION_FILTER_OPTIONS.length - 1
										? 35
										: 5,
							}}
							onPress={() => {
								onChangeFilter(option.value);
								onCloseFilterSheet();
							}}
						>
							<ActionsheetItemText>
								{option.label}
							</ActionsheetItemText>
						</ActionsheetItem>
					))}
				</ActionsheetContent>
			</Actionsheet>
		</Box>
	);
}
