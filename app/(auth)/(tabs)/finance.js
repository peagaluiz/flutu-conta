import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import {
	Actionsheet,
	ActionsheetBackdrop,
	ActionsheetContent,
	ActionsheetDragIndicator,
	ActionsheetDragIndicatorWrapper,
	ActionsheetItem,
	ActionsheetItemText,
} from "@/components/ui/actionsheet";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/state/AuthContext";
import { formatCurrency } from "@/utils/finance/helpers";
import {
	applyVisibilityScopeFilter,
	applyRangeFilter,
	buildCategoryExpenses,
	buildMonthlySeries,
	buildResumoGeral,
	finalizeResumo,
} from "@/utils/finance/dashboardHelpers";
import { FinanceResumoSection } from "@/components/finance/dashboard/FinanceResumoSection";
import { FinanceMonthlyChartSection } from "@/components/finance/dashboard/FinanceMonthlyChartSection";
import { FinanceCategoryChartSection } from "@/components/finance/dashboard/FinanceCategoryChartSection";

const RANGE_OPTIONS = [
	{ value: "30d", label: "30d" },
	{ value: "90d", label: "90d" },
	{ value: "365d", label: "1 ano" },
	{ value: "all", label: "Tudo" },
];

const VISIBILITY_OPTIONS = [
	{ value: "all", label: "Todos" },
	{ value: "mine", label: "Meus" },
	{ value: "family", label: "Família" },
];

function FinanceSkeleton() {
	return (
		<Box className="gap-4">
			<Skeleton variant="sharp" className="h-[110px] rounded-xl" />
			<Skeleton variant="sharp" className="h-[230px] rounded-xl" />
			<SkeletonText _lines={5} className="h-3" />
		</Box>
	);
}

export default function Finance() {
	const insets = useSafeAreaInsets();
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const database = useDatabase();
	const { userData, family } = useAuth();

	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [range, setRange] = useState("90d");
	const [visibilityScope, setVisibilityScope] = useState("all");
	const [items, setItems] = useState([]);
	const [detailSheetOpen, setDetailSheetOpen] = useState(false);
	const [detailTitle, setDetailTitle] = useState("Detalhes");
	const [detailItems, setDetailItems] = useState([]);

	const canUseFamilyScope = Number(family?.id || userData?.familyId || 0) > 0;
	const activeFamilyId =
		Number(family?.id || userData?.familyId || 0) || null;

	const scopedItems = useMemo(
		() =>
			applyVisibilityScopeFilter(
				items,
				canUseFamilyScope ? visibilityScope : "mine",
				activeFamilyId,
				userData?.id || null
			),
		[
			activeFamilyId,
			canUseFamilyScope,
			items,
			userData?.id,
			visibilityScope,
		]
	);
	const filteredItems = useMemo(
		() => applyRangeFilter(scopedItems, range),
		[scopedItems, range]
	);
	const resumo = useMemo(
		() => finalizeResumo(buildResumoGeral(filteredItems)),
		[filteredItems]
	);
	const monthlySeries = useMemo(
		() => buildMonthlySeries(filteredItems),
		[filteredItems]
	);
	const categorySeries = useMemo(
		() => buildCategoryExpenses(filteredItems, 6),
		[filteredItems]
	);

	const openDetails = useCallback((title, rows) => {
		setDetailTitle(title);
		setDetailItems(Array.isArray(rows) ? rows : []);
		setDetailSheetOpen(true);
	}, []);

	const loadData = useCallback(
		async (silent = false) => {
			try {
				if (!silent) setLoading(true);
				const data = await database.getTransacao(undefined, {
					page: 1,
					limit: 250,
					visibilityScope: canUseFamilyScope
						? visibilityScope
						: "mine",
					userId: userData?.id ?? null,
					familyId: activeFamilyId,
				});
				setItems(Array.isArray(data) ? data : []);
			} catch {
				setItems([]);
			} finally {
				if (!silent) setLoading(false);
			}
		},
		[
			activeFamilyId,
			canUseFamilyScope,
			database,
			userData?.id,
			visibilityScope,
		]
	);

	useEffect(() => {
		loadData(false);
	}, [loadData]);

	useEffect(() => {
		if (!canUseFamilyScope && visibilityScope !== "mine") {
			setVisibilityScope("mine");
		}
	}, [canUseFamilyScope, visibilityScope]);

	const onRefresh = async () => {
		setRefreshing(true);
		try {
			await database.syncAllPendingData({ force: true });
			await loadData(true);
		} finally {
			setRefreshing(false);
		}
	};

	const bottomSpacing = insets.bottom + 96;

	return (
		<>
			<ScrollView
				style={{ backgroundColor: colors.screen }}
				contentContainerStyle={{
					flexGrow: 1,
					paddingBottom: bottomSpacing,
				}}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
					/>
				}
			>
				<Box className="gap-4 px-3 pt-3" style={{ minHeight: "100%" }}>
					<Box
						className="rounded-xl border p-3"
						style={{
							backgroundColor: colors.surface,
							borderColor: colors.border,
						}}
					>
						<HStack className="items-center justify-between">
							<Text
								className="text-sm font-semibold"
								style={{ color: colors.textPrimary }}
							>
								Data
							</Text>

							<HStack className="gap-2">
								{RANGE_OPTIONS.map((option) => {
									const active = option.value === range;
									return (
										<Pressable
											key={option.value}
											onPress={() =>
												setRange(option.value)
											}
										>
											<Box
												className="rounded-full border px-3 py-1"
												style={{
													borderColor: active
														? colors.textPrimary
														: colors.border,
													backgroundColor: active
														? colors.textPrimary
														: colors.surface,
												}}
											>
												<Text
													className="text-xs font-medium"
													style={{
														color: active
															? colors.surface
															: colors.textSecondary,
													}}
												>
													{option.label}
												</Text>
											</Box>
										</Pressable>
									);
								})}
							</HStack>
						</HStack>

						{canUseFamilyScope && (
						<HStack className="items-center justify-between mt-3">
							<Text
								className="text-sm font-semibold"
								style={{ color: colors.textPrimary }}
							>
								Família
							</Text>
							<HStack className="gap-2">
								{VISIBILITY_OPTIONS.map((option) => {
									const active =
										option.value === visibilityScope;
									return (
										<Pressable
											key={option.value}
											onPress={() =>
												setVisibilityScope(option.value)
											}
										>
											<Box
												className="rounded-full border px-3 py-1"
												style={{
													borderColor: active
														? colors.textPrimary
														: colors.border,
													backgroundColor: active
														? colors.textPrimary
														: colors.surface,
												}}
											>
												<Text
													className="text-xs font-medium"
													style={{
														color: active
															? colors.surface
															: colors.textSecondary,
													}}
												>
													{option.label}
												</Text>
											</Box>
										</Pressable>
									);
								})}
							</HStack>
						</HStack>
						)}
					</Box>

					{loading ? (
						<FinanceSkeleton />
					) : (
						<>
							<FinanceResumoSection
								resumo={resumo}
								colors={colors}
								onPressSaldo={() =>
									openDetails(
										"Saldo consolidado",
										filteredItems
									)
								}
								onPressEntradas={() =>
									openDetails(
										"Entradas",
										filteredItems.filter(
											(item) => item.tipo === "receber"
										)
									)
								}
								onPressSaidas={() =>
									openDetails(
										"Saídas",
										filteredItems.filter(
											(item) => item.tipo === "pagar"
										)
									)
								}
								onPressPendentes={() =>
									openDetails(
										"Pendentes",
										filteredItems.filter(
											(item) => item.status !== "pago"
										)
									)
								}
							/>
							<FinanceMonthlyChartSection
								series={monthlySeries}
								colors={colors}
								onPressMonth={(monthKey) =>
									openDetails(
										`Detalhes de ${monthKey}`,
										filteredItems.filter((item) =>
											String(
												item.referenceDate || ""
											).startsWith(monthKey)
										)
									)
								}
							/>
							<FinanceCategoryChartSection
								categories={categorySeries}
								colors={colors}
								onPressCategory={(categoria) =>
									openDetails(
										`Categoria: ${categoria}`,
										filteredItems.filter(
											(item) =>
												item.tipo === "pagar" &&
												String(item.categoria || "") ===
													String(categoria)
										)
									)
								}
							/>
						</>
					)}
				</Box>
			</ScrollView>

			<Actionsheet
				isOpen={detailSheetOpen}
				onClose={() => setDetailSheetOpen(false)}
			>
				<ActionsheetBackdrop />
				<ActionsheetContent
					style={{ paddingBottom: Math.max(insets.bottom, 12) + 8 }}
				>
					<ActionsheetDragIndicatorWrapper>
						<ActionsheetDragIndicator />
					</ActionsheetDragIndicatorWrapper>

					<Box className="w-full px-2 pb-2">
						<Text
							className="text-base font-semibold"
							style={{ color: colors.textPrimary }}
						>
							{detailTitle}
						</Text>
						<Text
							className="text-xs"
							style={{ color: colors.textSecondary }}
						>
							{detailItems.length} lançamento(s) no filtro atual
						</Text>
					</Box>

					{detailItems.length === 0 ? (
						<ActionsheetItem isDisabled>
							<ActionsheetItemText>
								Sem itens para exibir.
							</ActionsheetItemText>
						</ActionsheetItem>
					) : (
						detailItems.slice(0, 80).map((item) => (
							<ActionsheetItem
								key={`detail-${item.id_transacao}`}
							>
								<Box className="w-full">
									<HStack className="items-center justify-between">
										<Text
											style={{
												color: colors.textPrimary,
											}}
										>
											{item.categoria || "Sem categoria"}
										</Text>
										<Text
											style={{
												color:
													item.tipo === "receber"
														? "#16A34A"
														: "#DC2626",
											}}
										>
											{formatCurrency(
												Number(item.valor || 0)
											)}
										</Text>
									</HStack>
									<Text
										className="text-xs"
										style={{ color: colors.textSecondary }}
									>
										{item.pessoa || "Sem pessoa"} •{" "}
										{item.referenceDate || "sem data"}
									</Text>
								</Box>
							</ActionsheetItem>
						))
					)}
				</ActionsheetContent>
			</Actionsheet>
		</>
	);
}
