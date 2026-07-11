import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { useDatabase } from "@/hooks/useDatabase";
import { useOpenInsert } from "@/hooks/useOpenInsert";
import { useInsertSavedTick } from "@/state/InsertModalContext";
import { useAuth } from "@/state/AuthContext";
import { useSyncProgress } from "@/state/SyncProgressContext";
import { useFinanceDate } from "@/state/FinanceDateContext";
import { useFinanceVisibilityScope } from "@/state/FinanceVisibilityScopeContext";
import {
	buildDefaultHomeDateRange,
	buildInsertParams,
	buildQuickActions,
	formatHomeDateRangeLabel,
	getLatestLancamento,
} from "@/utils/finance/homeScreenHelpers";
import { buildDashboardResumo } from "@/utils/finance/dashboardHelpers";
import { toISODateString } from "@/utils/finance/helpers";
import { groupCardTransactions } from "@/utils/finance/groupCardTransactions";

export function useHomeFinance() {
	const openInsertFlow = useOpenInsert();
	const savedTick = useInsertSavedTick();
	const database = useDatabase();
	const { userData, family } = useAuth();
	const { startSync, endSync, updateStep, isSyncing } = useSyncProgress();
	const wasSyncingRef = useRef(false);

	const { dateRange, setDateRange, dateField, setDateField } = useFinanceDate();
	const { visibilityScope, setVisibilityScope } = useFinanceVisibilityScope();

	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [lancamentos, setLancamentos] = useState([]);
	const [allLancamentos, setAllLancamentos] = useState([]);
	const [banks, setBanks] = useState([]);
	const [faturas, setFaturas] = useState([]);
	const [groupCards, setGroupCards] = useState(true);

	const hasFamily = Number(family?.id || userData?.familyId || 0) > 0;
	const activeFamilyId = Number(family?.id || userData?.familyId || 0) || null;
	const effectiveScope = hasFamily ? visibilityScope : "mine";

	const queryParams = useMemo(
		() => ({
			dateFrom: dateRange.start,
			dateTo: dateRange.end,
			dateField: dateField ?? "data_vencimento",
			visibilityScope: effectiveScope,
			userId: userData?.id ?? null,
			familyId: activeFamilyId,
		}),
		[activeFamilyId, dateField, dateRange.end, dateRange.start, effectiveScope, userData?.id]
	);

	const allQueryParams = useMemo(
		() => ({
			visibilityScope: effectiveScope,
			userId: userData?.id ?? null,
			familyId: activeFamilyId,
			limit: 9999,
			page: 1,
		}),
		[activeFamilyId, effectiveScope, userData?.id]
	);

	useEffect(() => {
		let active = true;
		setLoading(true);
		Promise.all([
			database.getTransacao(undefined, queryParams),
			database.getTransacao(undefined, allQueryParams),
			database.listBancos({
				visibilityScope: effectiveScope,
				userId: userData?.id ?? null,
				familyId: activeFamilyId,
			}),
			database.listFaturas({
				visibilityScope: effectiveScope,
				userId: userData?.id ?? null,
				familyId: activeFamilyId,
			}),
		])
			.then(([data, allData, bancoData, faturaData]) => {
				if (!active) return;
				setLancamentos(Array.isArray(data) ? data : []);
				setAllLancamentos(Array.isArray(allData) ? allData : []);
				setBanks(Array.isArray(bancoData) ? bancoData : []);
				setFaturas(Array.isArray(faturaData) ? faturaData : []);
			})
			.catch(() => {
				if (active) setLancamentos([]);
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [activeFamilyId, allQueryParams, database, effectiveScope, queryParams, userData?.id]);

	const reload = useCallback(async () => {
		try {
			const [data, allData, bancoData, faturaData] = await Promise.all([
				database.getTransacao(undefined, queryParams),
				database.getTransacao(undefined, allQueryParams),
				database.listBancos({
					visibilityScope: effectiveScope,
					userId: userData?.id ?? null,
					familyId: activeFamilyId,
				}),
				database.listFaturas({
					visibilityScope: effectiveScope,
					userId: userData?.id ?? null,
					familyId: activeFamilyId,
				}),
			]);
			setLancamentos(Array.isArray(data) ? data : []);
			setAllLancamentos(Array.isArray(allData) ? allData : []);
			setBanks(Array.isArray(bancoData) ? bancoData : []);
			setFaturas(Array.isArray(faturaData) ? faturaData : []);
		} catch {
		}
	}, [activeFamilyId, allQueryParams, database, effectiveScope, queryParams, userData?.id]);

	useEffect(() => {
		if (isSyncing) {
			wasSyncingRef.current = true;
		} else if (wasSyncingRef.current) {
			wasSyncingRef.current = false;
			reload();
		}
	}, [isSyncing, reload]);

	// Recarrega após um salvamento no modal de inserir/editar (desktop web).
	useEffect(() => {
		if (savedTick) reload();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [savedTick]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		startSync("Sincronizando dados...");
		try {
			await database.syncAllPendingData({ force: true, onProgress: updateStep });
			const [data, allData, bancoData, faturaData] = await Promise.all([
				database.getTransacao(undefined, queryParams),
				database.getTransacao(undefined, allQueryParams),
				database.listBancos({
					visibilityScope: effectiveScope,
					userId: userData?.id ?? null,
					familyId: activeFamilyId,
				}),
				database.listFaturas({
					visibilityScope: effectiveScope,
					userId: userData?.id ?? null,
					familyId: activeFamilyId,
				}),
			]);
			setLancamentos(Array.isArray(data) ? data : []);
			setAllLancamentos(Array.isArray(allData) ? allData : []);
			setBanks(Array.isArray(bancoData) ? bancoData : []);
			setFaturas(Array.isArray(faturaData) ? faturaData : []);
		} catch {
		} finally {
			setRefreshing(false);
			endSync();
		}
	}, [activeFamilyId, allQueryParams, database, effectiveScope, endSync, queryParams, startSync, updateStep, userData?.id]);

	const handleDeleteItem = useCallback(
		async (item) => {
			if (item?.is_ghost) {
				await database.materializeRecurrenceOccurrence({
					recurrenceUuid: item.recurrence_uuid,
					dueDate: item.ghost_due_date,
					deleted: true,
				});
			} else {
				await database.deleteTransacao(item.id_transacao);
			}
			await reload();
		},
		[database, reload]
	);

	const handleDarBaixa = useCallback(
		async (item, dataBaixa) => {
			if (item?.is_ghost) {
				await database.materializeRecurrenceOccurrence({
					recurrenceUuid: item.recurrence_uuid,
					dueDate: item.ghost_due_date,
					status: "pago",
					dataBaixa: dataBaixa ?? null,
				});
			} else {
				await database.darBaixa(item.id_transacao, dataBaixa);
			}
			await reload();
		},
		[database, reload]
	);

	const handleRemoverBaixa = useCallback(
		async (item) => {
			await database.removerBaixa(item.id_transacao);
			await reload();
		},
		[database, reload]
	);

	const todayISO = useMemo(() => toISODateString(new Date()), []);

	const openInsert = useCallback(
		(params = {}) => {
			openInsertFlow(buildInsertParams(todayISO, params));
		},
		[openInsertFlow, todayISO]
	);

	const handlePressItem = useCallback(
		(item) => {
			if (item?.is_ghost) {
				// Previstas são display-only no web (materializar só no app).
				if (Platform.OS === "web") return;
				openInsertFlow(
					{
						ghost_recurrence_uuid: String(item.recurrence_uuid),
						ghost_due_date: String(item.ghost_due_date),
						ghost_data_vencimento: String(item.data_vencimento || ""),
					},
					{ replace: true }
				);
				return;
			}
			openInsertFlow({ id_transacao: String(item.id_transacao) }, { replace: true });
		},
		[openInsertFlow]
	);

	const ultimoLancamento = useMemo(
		() => getLatestLancamento(lancamentos),
		[lancamentos]
	);
	const ultimaCategoria = ultimoLancamento?.categoria?.trim() || "";
	const ultimoTipo = ultimoLancamento?.tipo === "receber" ? "receber" : "pagar";

	const quickActions = useMemo(
		() => buildQuickActions({ ultimaCategoria, ultimoTipo, onOpenInsert: openInsert }),
		[ultimaCategoria, ultimoTipo, openInsert]
	);

	const dateRangeLabel = useMemo(
		() => formatHomeDateRangeLabel(dateRange.start, dateRange.end),
		[dateRange.start, dateRange.end]
	);

	const defaultRange = useMemo(() => buildDefaultHomeDateRange(), []);
	const isFilterActive =
		dateRange.start !== defaultRange.start || dateRange.end !== defaultRange.end;

	const resumo = useMemo(
		() => buildDashboardResumo(lancamentos, allLancamentos, dateRange),
		[lancamentos, allLancamentos, dateRange.start, dateRange.end]
	);

	const displayLancamentos = useMemo(
		() => groupCardTransactions(lancamentos, { faturas, banks, groupCards }),
		[lancamentos, faturas, banks, groupCards]
	);

	const banksResumo = useMemo(() => {
		if (!banks.length) return [];
		return banks.map((bank) => {
			const bt = lancamentos.filter(
				(t) => Number(t.id_banco) === Number(bank.id_banco)
			);
			const saldo = bt
				.filter((t) => t.tipo === "receber" && t.status === "pago")
				.reduce((s, t) => s + Number(t.valor || 0), 0);
			const divida = bt
				.filter((t) => t.tipo === "pagar" && t.status === "pendente")
				.reduce((s, t) => s + Number(t.valor || 0), 0);
			return { ...bank, saldo, divida };
		});
	}, [banks, lancamentos]);

	return {
		loading,
		refreshing,
		visibilityScope,
		setVisibilityScope,
		dateRange,
		setDateRange,
		dateField,
		setDateField,
		hasFamily,
		dateRangeLabel,
		isFilterActive,
		quickActions,
		lancamentos: displayLancamentos,
		periodLancamentos: lancamentos,
		allLancamentos,
		resumo,
		banksResumo,
		groupCards,
		setGroupCards,
		onRefresh,
		openInsert,
		handlePressItem,
		handleDeleteItem,
		handleDarBaixa,
		handleRemoverBaixa,
		name: userData?.nome,
	};
}
