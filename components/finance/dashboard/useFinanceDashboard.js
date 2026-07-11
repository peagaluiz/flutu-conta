import { useCallback, useEffect, useMemo, useState } from "react";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/state/AuthContext";
import { useFinanceDate } from "@/state/FinanceDateContext";
import { useFinanceVisibilityScope } from "@/state/FinanceVisibilityScopeContext";
import { useSyncProgress } from "@/state/SyncProgressContext";
import { useInsertSavedTick } from "@/state/InsertModalContext";
import {
	applyVisibilityScopeFilter,
	buildBanksBreakdown,
	buildCategoryExpenses,
	buildDashboardResumo,
	normalizeTransactions,
} from "@/utils/finance/dashboardHelpers";
import { toISODateString } from "@/utils/finance/helpers";

export function useFinanceDashboard() {
	const database = useDatabase();
	const { userData, family, familyReady } = useAuth();
	const { dateRange, dateField } = useFinanceDate();
	const { startSync, endSync, updateStep } = useSyncProgress();
	const { visibilityScope } = useFinanceVisibilityScope();
	const savedTick = useInsertSavedTick();

	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [items, setItems] = useState([]);
	const [allItems, setAllItems] = useState([]);
	const [banks, setBanks] = useState([]);
	const [savingAjuste, setSavingAjuste] = useState(false);

	const canUseFamilyScope = Number(family?.id || userData?.familyId || 0) > 0;
	const activeFamilyId = Number(family?.id || userData?.familyId || 0) || null;

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

	const resumo = useMemo(
		() => buildDashboardResumo(filteredItems, allScopedItems, dateRange),
		[filteredItems, allScopedItems, dateRange.start, dateRange.end]
	);

	const categorySeries = useMemo(
		() => buildCategoryExpenses(filteredItems, 6),
		[filteredItems]
	);
	const banksBreakdown = useMemo(
		() => buildBanksBreakdown(filteredItems, banks),
		[filteredItems, banks]
	);

	const pendingRows = useMemo(() => {
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
		return [
			...pendentes,
			...filteredItems.filter((item) => item.is_ghost && item.status !== "pago"),
		];
	}, [activeFamilyId, allScopedItems, dateRange.end, filteredItems]);
	const getPendentesRows = useCallback(() => pendingRows, [pendingRows]);

	const loadData = useCallback(
		async (silent = false) => {
			if (!familyReady || !userData?.id) return;
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
			familyReady,
			userData?.id,
			visibilityScope,
		]
	);

	useEffect(() => {
		loadData(false);
	}, [loadData]);

	// Recarrega após operações em Lançamentos/inserir (excluir, baixa, salvar…).
	useEffect(() => {
		if (savedTick) loadData(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [savedTick]);

	const createAjuste = useCallback(
		async ({ motivo, valor, tipo }) => {
			setSavingAjuste(true);
			try {
				const idCategoria = await database.getCategoriaIdByName("Ajuste");
				const base = new Date(`${String(dateRange.start).slice(0, 10)}T12:00:00`);
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
				await loadData(true);
			} finally {
				setSavingAjuste(false);
			}
		},
		[database, dateRange.start, loadData, userData?.id]
	);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		startSync("Sincronizando dados...");
		try {
			await database.syncAllPendingData({ force: true, onProgress: updateStep });
			await loadData(true);
		} finally {
			setRefreshing(false);
			endSync();
		}
	}, [database, endSync, loadData, startSync, updateStep]);

	return {
		loading,
		refreshing,
		filteredItems,
		resumo,
		categorySeries,
		banksBreakdown,
		getPendentesRows,
		loadData,
		onRefresh,
		createAjuste,
		savingAjuste,
	};
}
