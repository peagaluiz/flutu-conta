import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/state/AuthContext";
import { useSyncProgress } from "@/state/SyncProgressContext";
import { useFinanceVisibilityScope } from "@/state/FinanceVisibilityScopeContext";
import { useFinanceDate } from "@/state/FinanceDateContext";
import { useInsertSavedTick } from "@/state/InsertModalContext";
import { applyVisibilityScopeFilter } from "@/utils/finance/dashboardHelpers";
import { formatHomeDateRangeLabel } from "@/utils/finance/homeScreenHelpers";
import {
	buildPeriodBalanceSeries,
	buildPeriodView,
	buildYearView,
	computeDelta,
	currentYear,
	shiftRangeBack,
} from "@/utils/finance/financeDesktopHelpers";

export function useFinanceDesktop() {
	const database = useDatabase();
	const { userData, family } = useAuth();
	const { isSyncing } = useSyncProgress();
	const { visibilityScope } = useFinanceVisibilityScope();
	const { dateRange } = useFinanceDate();
	const savedTick = useInsertSavedTick();
	const wasSyncingRef = useRef(false);

	const [loading, setLoading] = useState(true);
	const [allItems, setAllItems] = useState([]);
	const [periodGhosts, setPeriodGhosts] = useState([]);
	const [catalog, setCatalog] = useState([]);
	const [selectedYear, setSelectedYear] = useState(currentYear);

	const hasFamily = Number(family?.id || userData?.familyId || 0) > 0;
	const activeFamilyId = Number(family?.id || userData?.familyId || 0) || null;
	const effectiveScope = hasFamily ? visibilityScope : "mine";

	const load = useCallback(
		async (silent = false) => {
			if (!silent) setLoading(true);
			try {
				const [data, categories] = await Promise.all([
					database.getTransacao(undefined, {
						page: 1,
						limit: 9999,
						visibilityScope: effectiveScope,
						userId: userData?.id ?? null,
						familyId: activeFamilyId,
					}),
					database.listCategories(),
				]);
				setAllItems(Array.isArray(data) ? data : []);
				setCatalog(Array.isArray(categories) ? categories : []);
			} catch {
				setAllItems([]);
			} finally {
				if (!silent) setLoading(false);
			}
		},
		[activeFamilyId, database, effectiveScope, userData?.id]
	);

	useEffect(() => {
		load(false);
	}, [load]);

	// Previstas do período: no web o getTransacao projeta fantasmas quando recebe dateTo.
	// Buscamos só os fantasmas do range atual (as transações reais já vêm em allItems).
	useEffect(() => {
		let active = true;
		const from = dateRange?.start;
		const to = dateRange?.end;
		if (!from || !to) {
			setPeriodGhosts([]);
			return;
		}
		database
			.getTransacao(undefined, {
				dateFrom: from,
				dateTo: to,
				dateField: "data_vencimento",
				visibilityScope: effectiveScope,
				userId: userData?.id ?? null,
				familyId: activeFamilyId,
			})
			.then((rows) => {
				if (!active) return;
				setPeriodGhosts((Array.isArray(rows) ? rows : []).filter((row) => row?.is_ghost));
			})
			.catch(() => {
				if (active) setPeriodGhosts([]);
			});
		return () => {
			active = false;
		};
	}, [activeFamilyId, database, effectiveScope, userData?.id, dateRange?.start, dateRange?.end, savedTick]);

	// Recarrega após sincronização ou após salvar no modal de inserir/editar.
	useEffect(() => {
		if (isSyncing) {
			wasSyncingRef.current = true;
		} else if (wasSyncingRef.current) {
			wasSyncingRef.current = false;
			load(true);
		}
	}, [isSyncing, load]);

	useEffect(() => {
		if (savedTick) load(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [savedTick]);

	const scopedItems = useMemo(
		() =>
			applyVisibilityScopeFilter(
				allItems,
				effectiveScope,
				activeFamilyId,
				userData?.id || null
			),
		[allItems, effectiveScope, activeFamilyId, userData?.id]
	);

	const scopedGhosts = useMemo(
		() =>
			applyVisibilityScopeFilter(
				periodGhosts,
				effectiveScope,
				activeFamilyId,
				userData?.id || null
			),
		[periodGhosts, effectiveScope, activeFamilyId, userData?.id]
	);

	const catalogMap = useMemo(() => {
		const map = new Map();
		catalog.forEach((c) => map.set(c.nome, c));
		return map;
	}, [catalog]);

	const monthView = useMemo(
		() => buildPeriodView(scopedItems, dateRange, catalogMap, scopedGhosts),
		[scopedItems, dateRange, catalogMap, scopedGhosts]
	);
	const previousMonthView = useMemo(
		() => buildPeriodView(scopedItems, shiftRangeBack(dateRange), catalogMap),
		[scopedItems, dateRange, catalogMap]
	);
	const monthComparison = useMemo(
		() => ({
			prevExists: previousMonthView.hasData,
			saldo: computeDelta(monthView.real, previousMonthView.real, { higherIsBetter: true }),
			receitas: computeDelta(monthView.entradas, previousMonthView.entradas, { higherIsBetter: true }),
			despesas: computeDelta(monthView.saidas, previousMonthView.saidas, { higherIsBetter: false }),
			taxa: computeDelta(monthView.taxaEconomia, previousMonthView.taxaEconomia, { higherIsBetter: true }),
		}),
		[monthView, previousMonthView]
	);
	const monthBalanceSeries = useMemo(
		() => buildPeriodBalanceSeries(scopedItems, dateRange, scopedGhosts),
		[scopedItems, dateRange, scopedGhosts]
	);
	const periodLabel = useMemo(
		() => formatHomeDateRangeLabel(dateRange?.start, dateRange?.end),
		[dateRange?.start, dateRange?.end]
	);
	const yearView = useMemo(
		() => buildYearView(scopedItems, selectedYear, catalogMap),
		[scopedItems, selectedYear, catalogMap]
	);
	const previousYearView = useMemo(
		() => buildYearView(scopedItems, selectedYear - 1, catalogMap),
		[scopedItems, selectedYear, catalogMap]
	);
	const yearComparison = useMemo(
		() => ({
			prevExists: previousYearView.hasData,
			recebido: computeDelta(yearView.recebido, previousYearView.recebido, { higherIsBetter: true }),
			gasto: computeDelta(yearView.gasto, previousYearView.gasto, { higherIsBetter: false }),
			saldo: computeDelta(yearView.saldoAcumulado, previousYearView.saldoAcumulado, { higherIsBetter: true }),
			taxa: computeDelta(yearView.taxaEconomia, previousYearView.taxaEconomia, { higherIsBetter: true }),
		}),
		[yearView, previousYearView]
	);

	const goYear = useCallback(
		(delta) => setSelectedYear((prev) => prev + delta),
		[]
	);

	return {
		loading,
		selectedYear,
		goYear,
		periodLabel,
		monthView,
		monthComparison,
		monthBalanceSeries,
		yearView,
		yearComparison,
	};
}
