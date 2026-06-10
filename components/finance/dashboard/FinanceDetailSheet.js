import React, { useMemo } from "react";
import { ScrollView, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import {
	Actionsheet,
	ActionsheetBackdrop,
	ActionsheetContent,
	ActionsheetDragIndicator,
	ActionsheetDragIndicatorWrapper,
} from "@/components/ui/actionsheet";
import { formatCurrency, formatDate } from "@/utils/finance/helpers";

const GREEN = "#16A34A";
const RED = "#DC2626";
const MAX_VISIBLE = 80;

export function FinanceDetailSheet({
	isOpen,
	onClose,
	title,
	items,
	colors,
	onItemPress,
}) {
	const insets = useSafeAreaInsets();
	const { height: screenHeight } = useWindowDimensions();

	const net = useMemo(
		() =>
			items.reduce((acc, it) => {
				const v = Number(it.valor || 0);
				return acc + (it.tipo === "receber" ? v : -v);
			}, 0),
		[items]
	);

	const visible = items.slice(0, MAX_VISIBLE);

	return (
		<Actionsheet isOpen={isOpen} onClose={onClose}>
			<ActionsheetBackdrop />
			<ActionsheetContent
				style={{
					paddingBottom: Math.max(insets.bottom, 12) + 8,
					backgroundColor: colors.surface,
				}}
			>
				<ActionsheetDragIndicatorWrapper>
					<ActionsheetDragIndicator />
				</ActionsheetDragIndicatorWrapper>

				<HStack className="w-full items-center justify-between px-1 pt-1 pb-3">
					<VStack className="flex-1 pr-3">
						<Text
							className="text-lg font-bold"
							style={{ color: colors.textPrimary }}
							numberOfLines={1}
						>
							{title}
						</Text>
						<Text
							className="text-xs"
							style={{ color: colors.textSecondary }}
						>
							{items.length}{" "}
							{items.length === 1 ? "lançamento" : "lançamentos"}
						</Text>
					</VStack>
					<VStack className="items-end">
						<Text
							className="text-base font-bold"
							style={{ color: net >= 0 ? GREEN : RED }}
						>
							{formatCurrency(net)}
						</Text>
						<Text
							className="text-[11px]"
							style={{ color: colors.textSecondary }}
						>
							saldo no filtro
						</Text>
					</VStack>
				</HStack>

				<ScrollView
					style={{
						width: "100%",
						minHeight: screenHeight * 0.3,
						maxHeight: screenHeight * 0.56,
					}}
					showsVerticalScrollIndicator={false}
				>
					{visible.length === 0 ? (
						<Box className="items-center justify-center py-10">
							<Text
								className="text-sm"
								style={{ color: colors.textSecondary }}
							>
								Sem itens para exibir.
							</Text>
						</Box>
					) : (
						<VStack space="sm" className="pb-1">
							{visible.map((item) => {
								const isReceber = item.tipo === "receber";
								const accent = isReceber ? GREEN : RED;
								return (
									<Pressable
										key={`detail-${item.id_transacao}`}
										onPress={() => onItemPress(item)}
										style={{
											backgroundColor: colors.surfaceAlt,
											borderRadius: 12,
											borderWidth: 1,
											borderColor: colors.border,
											paddingVertical: 10,
											paddingHorizontal: 12,
										}}
									>
										<HStack className="items-center">
											<Box
												style={{
													width: 4,
													alignSelf: "stretch",
													minHeight: 32,
													borderRadius: 4,
													backgroundColor: accent,
													marginRight: 10,
												}}
											/>
											<VStack className="flex-1 pr-2">
												<Text
													className="text-sm font-medium"
													style={{ color: colors.textPrimary }}
													numberOfLines={1}
												>
													{item.categoria || "Sem categoria"}
												</Text>
												<Text
													className="text-xs"
													style={{ color: colors.textSecondary }}
													numberOfLines={1}
												>
													{item.pessoa || "Sem pessoa"} •{" "}
													{item.referenceDate
														? formatDate(item.referenceDate)
														: "sem data"}
												</Text>
											</VStack>
											<Text
												className="text-sm font-bold"
												style={{ color: accent }}
											>
												{isReceber ? "+" : "−"}
												{formatCurrency(Number(item.valor || 0))}
											</Text>
											<ChevronRight
												size={16}
												color={colors.textSecondary}
												style={{ marginLeft: 4 }}
											/>
										</HStack>
									</Pressable>
								);
							})}
							{items.length > visible.length && (
								<Text
									className="text-[11px] text-center py-2"
									style={{ color: colors.textSecondary }}
								>
									+{items.length - visible.length} itens não exibidos
								</Text>
							)}
						</VStack>
					)}
				</ScrollView>
			</ActionsheetContent>
		</Actionsheet>
	);
}
