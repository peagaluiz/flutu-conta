import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/state/AuthContext";
import { useSyncProgress } from "@/state/SyncProgressContext";
import { useFinanceDate } from "@/state/FinanceDateContext";
import { useFinanceVisibilityScope } from "@/state/FinanceVisibilityScopeContext";
import {
	buildDefaultHomeDateRange,
	buildInsertParams,
	buildQuickActions,
	calculateResumo,
	formatHomeDateRangeLabel,
	getLatestLancamento,
} from "@/utils/finance/homeScreenHelpers";
import { toISODateString } from "@/utils/finance/helpers";

export function useHomeFinance() {
	const router = useRouter();
	const database = useDatabase();
	const { userData, family } = useAuth();
	const { startSync, endSync, updateStep, isSyncing } = useSyncProgress();
	const wasSyncingRef = useRef(false);

	const { dateRange, setDateRange, dateField, setDateField } = useFinanceDate();
	const { visibilityScope, setVisibilityScope } = useFinanceVisibilityScope();

	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [lancamentos, setLancamentos] = useState([]);
	const [banks, setBanks] = useState([]);

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

	useEffect(() => {
		let active = true;
		setLoading(true);
		Promise.all([
			database.getTransacao(undefined, queryParams),
			database.listBancos({
				visibilityScope: effectiveScope,
				userId: userData?.id ?? null,
				familyId: activeFamilyId,
			}),
		])
			.then(([data, bancoData]) => {
				if (!active) return;
				setLancamentos(Array.isArray(data) ? data : []);
				setBanks(Array.isArray(bancoData) ? bancoData : []);
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
	}, [activeFamilyId, database, effectiveScope, queryParams, userData?.id]);

	useEffect(() => {
		if (!hasFamily && visibilityScope !== "mine") {
			setVisibilityScope("mine");
		}
	}, [hasFamily, visibilityScope]);

	// Recarrega quando o sync inicial (disparado pelo login) termina
	useEffect(() => {
		if (isSyncing) {
			wasSyncingRef.current = true;
		} else if (wasSyncingRef.current) {
			wasSyncingRef.current = false;
			reload();
		}
	}, [isSyncing, reload]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		startSync("Sincronizando dados...");
		try {
			await database.syncAllPendingData({ force: true, onProgress: updateStep });
			const [data, bancoData] = await Promise.all([
				database.getTransacao(undefined, queryParams),
				database.listBancos({
					visibilityScope: effectiveScope,
					userId: userData?.id ?? null,
					familyId: activeFamilyId,
				}),
			]);
			setLancamentos(Array.isArray(data) ? data : []);
			setBanks(Array.isArray(bancoData) ? bancoData : []);
		} catch {
			// silent refresh error
		} finally {
			setRefreshing(false);
			endSync();
		}
	}, [activeFamilyId, database, effectiveScope, endSync, queryParams, startSync, updateStep, userData?.id]);

	const reload = useCallback(async () => {
		try {
			const [data, bancoData] = await Promise.all([
				database.getTransacao(undefined, queryParams),
				database.listBancos({
					visibilityScope: effectiveScope,
					userId: userData?.id ?? null,
					familyId: activeFamilyId,
				}),
			]);
			setLancamentos(Array.isArray(data) ? data : []);
			setBanks(Array.isArray(bancoData) ? bancoData : []);
		} catch {
			// silent reload error
		}
	}, [activeFamilyId, database, effectiveScope, queryParams, userData?.id]);

	const handleDeleteItem = useCallback(
		async (item) => {
			await database.deleteTransacao(item.id_transacao);
			await reload();
		},
		[database, reload]
	);

	const handleDarBaixa = useCallback(
		async (item, dataBaixa) => {
			await database.darBaixa(item.id_transacao, dataBaixa);
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
			router.push({
				pathname: "/(auth)/(stack)/insert",
				params: buildInsertParams(todayISO, params),
			});
		},
		[router, todayISO]
	);

	const handlePressItem = useCallback(
		(item) => {
			router.replace({
				pathname: "/(auth)/(stack)/insert",
				params: { id_transacao: String(item.id_transacao) },
			});
		},
		[router]
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

	const resumo = useMemo(() => calculateResumo(lancamentos), [lancamentos]);

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
		lancamentos,
		resumo,
		banksResumo,
		onRefresh,
		openInsert,
		handlePressItem,
		handleDeleteItem,
		handleDarBaixa,
		handleRemoverBaixa,
		name: userData?.nome,
	};
}
