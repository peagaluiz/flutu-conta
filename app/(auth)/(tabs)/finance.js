import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Box } from "@/components/ui/box";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/state/AuthContext";
import { useFinanceDate } from "@/state/FinanceDateContext";
import { useFinanceVisibilityScope } from "@/state/FinanceVisibilityScopeContext";
import {
	applyVisibilityScopeFilter,
	buildBanksBreakdown,
	buildCategoryExpenses,
	buildResumoGeral,
	finalizeResumo,
	normalizeTransactions,
} from "@/utils/finance/dashboardHelpers";
import { FinanceResumoSection } from "@/components/finance/dashboard/FinanceResumoSection";
import { FinanceMonthlyChartSection } from "@/components/finance/dashboard/FinanceMonthlyChartSection";
import { FinanceCategoryChartSection } from "@/components/finance/dashboard/FinanceCategoryChartSection";
import { FinanceBanksChartSection } from "@/components/finance/dashboard/FinanceBanksChartSection";
import { FinanceDetailSheet } from "@/components/finance/dashboard/FinanceDetailSheet";
import { SaldoInicialAjusteModal } from "@/components/finance/dashboard/SaldoInicialAjusteModal";
import { toISODateString } from "@/utils/finance/helpers";
import { useSyncProgress } from "@/state/SyncProgressContext";

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
	const { dateRange, dateField } = useFinanceDate();

	const router = useRouter();
	const { startSync, endSync, updateStep } = useSyncProgress();
	const { visibilityScope, setVisibilityScope } = useFinanceVisibilityScope();
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [items, setItems] = useState([]);
	const [allItems, setAllItems] = useState([]);
	const [banks, setBanks] = useState([]);
	const [detailSheetOpen, setDetailSheetOpen] = useState(false);
	const [detailTitle, setDetailTitle] = useState("Detalhes");
	const [detailItems, setDetailItems] = useState([]);
	const [detailSaldoInicial, setDetailSaldoInicial] = useState(null);
	const [ajusteModalOpen, setAjusteModalOpen] = useState(false);
	const [savingAjuste, setSavingAjuste] = useState(false);

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
		[activeFamilyId, canUseFamilyScope, items, userData?.id, visibilityScope]
	);

	const filteredItems = useMemo(
		() => normalizeTransactions(scopedItems, { familyId: activeFamilyId }),
		[scopedItems, activeFamilyId]
	);

	const allScopedItems = useMemo(
		() =>
			applyVisibilityScopeFilter(
				allItems,
				canUseFamilyScope ? visibilityScope : "mine",
				activeFamilyId,
				userData?.id || null
			),
		[activeFamilyId, allItems, canUseFamilyScope, userData?.id, visibilityScope]
	);

	const resumo = useMemo(() => {
		const dateFromStr = dateRange.start ? String(dateRange.start).slice(0, 10) : null;
		const dateToStr = dateRange.end ? String(dateRange.end).slice(0, 10) : null;
		let saldoInicial = 0;
		let pendentesTotal = 0;

		allScopedItems.forEach((item) => {
			const valor = Number(item?.valor || 0);
			if (item.status !== "pago") {
				if (dateToStr) {
					const venc = item.data_vencimento ? String(item.data_vencimento).slice(0, 10) : null;
					if (venc && venc > dateToStr) return;
				}
				pendentesTotal += 1;
			} else if (dateFromStr) {
				const baixa = item.data_baixa ? String(item.data_baixa).slice(0, 10) : null;
				if (baixa && baixa < dateFromStr) {
					if (item.tipo === "receber") saldoInicial += valor;
					if (item.tipo === "pagar") saldoInicial -= valor;
				}
			}
		});

		const ghostPendentes = filteredItems.filter(
			(item) => item.is_ghost && item.status !== "pago"
		).length;

		const base = buildResumoGeral(filteredItems);
		return {
			...finalizeResumo(base, saldoInicial),
			pendentes: pendentesTotal + ghostPendentes,
		};
	}, [filteredItems, allScopedItems, dateRange.start, dateRange.end]);
	const categorySeries = useMemo(
		() => buildCategoryExpenses(filteredItems, 6),
		[filteredItems]
	);
	const banksBreakdown = useMemo(
		() => buildBanksBreakdown(filteredItems, banks),
		[filteredItems, banks]
	);

	const openDetails = useCallback((title, rows, saldoInicial = null) => {
		setDetailTitle(title);
		setDetailItems(Array.isArray(rows) ? rows : []);
		setDetailSaldoInicial(saldoInicial);
		setDetailSheetOpen(true);
	}, []);

	const handleDetailItemPress = useCallback(
		(item) => {
			if (!item?.id_transacao) return;
			setDetailSheetOpen(false);
			if (item.is_ghost) {
				router.push("/(auth)/(tabs)/launches");
				return;
			}
			router.push({
				pathname: "/(auth)/(tabs)/launches",
				params: {
					highlightId: String(item.id_transacao),
					highlightTs: String(Date.now()),
				},
			});
		},
		[router]
	);

	const loadData = useCallback(
		async (silent = false) => {
			try {
				if (!silent) setLoading(true);
				const effectiveScope = canUseFamilyScope ? visibilityScope : "mine";
				const [data, allData, bancoData] = await Promise.all([
					database.getTransacao(undefined, {
						page: 1,
						limit: 500,
						dateFrom: dateRange.start,
						dateTo: dateRange.end,
						dateField: dateField ?? "data_vencimento",
						visibilityScope: effectiveScope,
						userId: userData?.id ?? null,
						familyId: activeFamilyId,
					}),
					database.getTransacao(undefined, {
						page: 1,
						limit: 9999,
						visibilityScope: effectiveScope,
						userId: userData?.id ?? null,
						familyId: activeFamilyId,
					}),
					database.listBancos({
						visibilityScope: effectiveScope,
						userId: userData?.id ?? null,
						familyId: activeFamilyId,
					}),
				]);
				setItems(Array.isArray(data) ? data : []);
				setAllItems(Array.isArray(allData) ? allData : []);
				setBanks(Array.isArray(bancoData) ? bancoData : []);
			} catch {
				setItems([]);
				setAllItems([]);
				setBanks([]);
			} finally {
				if (!silent) setLoading(false);
			}
		},
		[
			activeFamilyId,
			canUseFamilyScope,
			database,
			dateField,
			dateRange.end,
			dateRange.start,
			userData?.id,
			visibilityScope,
		]
	);

	useEffect(() => {
		loadData(false);
	}, [loadData]);

	const handleCreateAjuste = useCallback(
		async ({ motivo, valor, tipo }) => {
			setSavingAjuste(true);
			try {
				const idCategoria = await database.getCategoriaIdByName("Ajuste");
				const base = new Date(
					`${String(dateRange.start).slice(0, 10)}T12:00:00`
				);
				base.setDate(base.getDate() - 1);
				const adjustmentDate = toISODateString(base);
				await database.createTransacao({
					tipo,
					valor,
					id_categoria: idCategoria,
					id_pessoa: null,
					pessoa: null,
					id_imobilizado: null,
					id_banco: null,
					family_id: null,
					is_family_shared: 0,
					user_id: userData?.id ?? null,
					data_transacao: new Date().toISOString(),
					data_vencimento: adjustmentDate,
					data_baixa: adjustmentDate,
					status: "pago",
					observacao: motivo,
					json: JSON.stringify({ descricao: motivo }),
				});
				setAjusteModalOpen(false);
				await loadData(true);
			} finally {
				setSavingAjuste(false);
			}
		},
		[database, dateRange.start, loadData, userData?.id]
	);

	const onRefresh = async () => {
		setRefreshing(true);
		startSync("Sincronizando dados...");
		try {
			await database.syncAllPendingData({ force: true, onProgress: updateStep });
			await loadData(true);
		} finally {
			setRefreshing(false);
			endSync();
		}
	};

	return (
		<>
			<ScrollView
				style={{ backgroundColor: colors.screen }}
				contentContainerStyle={{
					flexGrow: 1,
					paddingBottom: insets.bottom + 96,
				}}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
					/>
				}
			>
				<Box className="gap-4 px-3 pt-3" style={{ minHeight: "100%" }}>
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
										filteredItems,
										resumo.saldoInicial
									)
								}
								onPressEntradas={() =>
									openDetails(
										"Entradas",
										filteredItems.filter(
											(item) => item.tipo === "receber"
										),
										resumo.saldoInicial
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
								onPressPendentes={() => {
									const dateToStr = dateRange.end ? String(dateRange.end).slice(0, 10) : null;
									const pendentes = normalizeTransactions(allScopedItems, {
										familyId: activeFamilyId,
									}).filter((item) => {
										if (item.status === "pago") return false;
										if (dateToStr) {
											const venc = item.data_vencimento ? String(item.data_vencimento).slice(0, 10) : null;
											if (venc && venc > dateToStr) return false;
										}
										return true;
									});
									openDetails("Pendentes", [
										...pendentes,
										...filteredItems.filter(
											(item) => item.is_ghost && item.status !== "pago"
										),
									]);
								}}
							/>
							<FinanceMonthlyChartSection
								items={filteredItems}
								colors={colors}
								onPressGroup={(label, groupItems) =>
									openDetails(label, groupItems)
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
							<FinanceBanksChartSection
								banks={banksBreakdown}
								colors={colors}
								onPressDetail={openDetails}
							/>
						</>
					)}
				</Box>
			</ScrollView>

			<FinanceDetailSheet
				isOpen={detailSheetOpen}
				onClose={() => setDetailSheetOpen(false)}
				title={detailTitle}
				items={detailItems}
				colors={colors}
				onItemPress={handleDetailItemPress}
				saldoInicial={detailSaldoInicial}
				onPressSaldoInicial={() => {
					setDetailSheetOpen(false);
					setAjusteModalOpen(true);
				}}
			/>

			<SaldoInicialAjusteModal
				isOpen={ajusteModalOpen}
				onClose={() => setAjusteModalOpen(false)}
				saldoInicialLabel={resumo.saldoInicialLabel}
				saving={savingAjuste}
				onSubmit={handleCreateAjuste}
				colors={colors}
			/>
		</>
	);
}
