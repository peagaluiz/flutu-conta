import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { loadSectionData } from "@/utils/auth/launches/loaders";
import { getDeleteAction, getItemKey, filterValidItems } from "@/utils/auth/launches/actions";
import { getItemType } from "@/utils/auth/launches/sections";
import { useSyncProgress } from "@/state/SyncProgressContext";

const PAGE_SIZE = 30;

export function useLaunchesData({ database, section, family, userData, filters = {} }) {
	const { startSync, endSync, updateStep } = useSyncProgress();
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);

	const loadRef = useRef(0);
	const prevSectionRef = useRef(null);

	const visibilityArgs = useMemo(
		() => ({
			userId: userData?.id ?? null,
			familyId: family?.id ? Number(family.id) : null,
			visibilityScope: family?.id ? "all" : "mine",
		}),
		[family?.id, userData?.id]
	);

	const loadData = useCallback(
		async (
			target,
			{ silent = false, append = false, page: pageToLoad = 1 } = {}
		) => {
			const id = ++loadRef.current;
			const sectionTarget = target ?? section;

			try {
				if (sectionTarget === "transacoes") {
					if (append) {
						setLoadingMore(true);
					} else if (!silent) {
						setLoading(true);
						setItems([]);
						setHasMore(true);
					}

					const dateOptions = {
						dateFrom: filters.dateFrom ?? undefined,
						dateTo: filters.dateTo ?? undefined,
						dateField: filters.dateField ?? undefined,
					};

					const rows = await loadSectionData(database, sectionTarget, {
						page: pageToLoad,
						limit: PAGE_SIZE,
						...visibilityArgs,
						...dateOptions,
					});

					if (id === loadRef.current) {
						const nextRows = Array.isArray(rows) ? rows : [];
						setItems((current) =>
							append ? [...current, ...nextRows] : nextRows
						);
						setPage(pageToLoad);
						setHasMore(nextRows.length === PAGE_SIZE);
					}
				} else {
					if (!silent) {
						setLoading(true);
						setItems([]);
					}

					const rows = await loadSectionData(
						database,
						sectionTarget,
						visibilityArgs
					);

					if (id === loadRef.current) {
						setItems(Array.isArray(rows) ? rows : []);
					}
				}
			} catch {
				if (id === loadRef.current) setItems([]);
			} finally {
				if (!silent && !append && id === loadRef.current) setLoading(false);
				if (append && id === loadRef.current) setLoadingMore(false);
			}
		},
		[database, section, visibilityArgs, filters]
	);

	useEffect(() => {
		const isFirstLoad = prevSectionRef.current === null;
		const sectionChanged = !isFirstLoad && prevSectionRef.current !== section;
		prevSectionRef.current = section;
		setPage(1);
		setHasMore(true);
		setLoadingMore(false);
		loadData(section, { silent: !isFirstLoad && !sectionChanged });
	}, [section, loadData]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		startSync("Sincronizando dados...");
		try {
			await database.syncAllPendingData({ force: true, onProgress: updateStep });
			setPage(1);
			setHasMore(true);
			await loadData(section, { silent: true, page: 1 });
		} catch {
		} finally {
			setRefreshing(false);
			endSync();
		}
	}, [database, endSync, loadData, section, startSync, updateStep]);

	const handleLoadMore = useCallback(() => {
		if (section !== "transacoes") return;
		if (loading || loadingMore || !hasMore) return;
		loadData(section, { silent: true, append: true, page: page + 1 });
	}, [hasMore, loadData, loading, loadingMore, page, section]);

	const deleteItem = useCallback(
		(item) => {
			if (item?.is_ghost) {
				Alert.alert("Excluir", "Deseja pular esta ocorrência da recorrência?", [
					{ text: "Cancelar", style: "cancel" },
					{
						text: "Excluir",
						style: "destructive",
						onPress: async () => {
							try {
								await database.materializeRecurrenceOccurrence({
									recurrenceUuid: item.recurrence_uuid,
									dueDate: item.ghost_due_date,
									deleted: true,
								});
								setPage(1);
								setHasMore(true);
								await loadData(section, { silent: true, page: 1 });
							} catch {
								Alert.alert("Erro", "Falha ao excluir.");
							}
						},
					},
				]);
				return;
			}

			const itemType = getItemType(item);
			const deleteAction = itemType
				? getDeleteAction(database, itemType)
				: null;
			if (!deleteAction) return;

			Alert.alert("Excluir", "Deseja excluir?", [
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Excluir",
					style: "destructive",
					onPress: async () => {
						try {
							await deleteAction(item);
							setPage(1);
							setHasMore(true);
							await loadData(section, { silent: true, page: 1 });
						} catch {
							Alert.alert("Erro", "Falha ao excluir.");
						}
					},
				},
			]);
		},
		[database, loadData, section]
	);

	const syncPessoa = useCallback(
		async (item) => {
			try {
				await database.syncPessoaPendente(item.nome, item.pending_ids);
				await loadData("pessoas", { silent: true });
			} catch {
				Alert.alert("Erro", "Falha ao sincronizar.");
			}
		},
		[database, loadData]
	);

	const toggleRecorrenciaStatus = useCallback(
		async (item) => {
			try {
				if (item?.status === "ativa") {
					await database.pauseRecorrencia(item.uuid);
				} else {
					await database.activateRecorrencia(item.uuid);
				}
				await loadData("recorrencias", { silent: true, page: 1 });
			} catch {
				Alert.alert("Erro", "Falha ao atualizar status da recorrência.");
			}
		},
		[database, loadData]
	);

	const darBaixa = useCallback(
		async (item) => {
			try {
				if (item?.is_ghost) {
					await database.materializeRecurrenceOccurrence({
						recurrenceUuid: item.recurrence_uuid,
						dueDate: item.ghost_due_date,
						status: "pago",
					});
				} else if (item.status === "pendente") {
					await database.darBaixa(item.id_transacao);
				} else {
					await database.removerBaixa(item.id_transacao);
				}
				setPage(1);
				setHasMore(true);
				await loadData(section, { silent: true, page: 1 });
			} catch {
				Alert.alert("Erro", "Falha ao atualizar baixa.");
			}
		},
		[database, loadData, section]
	);

	const darBaixaBulk = useCallback(
		async (ids, dataBaixa) => {
			try {
				await Promise.all([...ids].map((id) => database.darBaixa(id, dataBaixa)));
				setPage(1);
				setHasMore(true);
				await loadData(section, { silent: true, page: 1 });
			} catch {
				Alert.alert("Erro", "Falha ao dar baixa.");
			}
		},
		[database, loadData, section]
	);

	const removerBaixaBulk = useCallback(
		async (ids) => {
			try {
				await Promise.all([...ids].map((id) => database.removerBaixa(id)));
				setPage(1);
				setHasMore(true);
				await loadData(section, { silent: true, page: 1 });
			} catch {
				Alert.alert("Erro", "Falha ao remover baixa.");
			}
		},
		[database, loadData, section]
	);

	const deleteItemsBulk = useCallback(
		async (ids) => {
			try {
				await Promise.all([...ids].map((id) => database.deleteTransacao(id)));
				setPage(1);
				setHasMore(true);
				await loadData(section, { silent: true, page: 1 });
			} catch {
				Alert.alert("Erro", "Falha ao excluir itens.");
			}
		},
		[database, loadData, section]
	);

	const deleteRecorrenciaScope = useCallback(
		async (item, withTransacoes) => {
			try {
				if (withTransacoes) {
					await database.deleteRecorrenciaWithTransacoes(item.uuid);
				} else {
					await database.deleteRecorrencia(item.uuid);
				}
				setPage(1);
				setHasMore(true);
				await loadData(section, { silent: true, page: 1 });
			} catch {
				Alert.alert("Erro", "Falha ao excluir recorrência.");
			}
		},
		[database, loadData, section]
	);

	const validItems = useMemo(() => {
		const base = filterValidItems(items, section);
		const q = (filters.searchText || "").toLowerCase().trim();
		if (!q || section !== "transacoes") return base;
		return base.filter(
			(item) =>
				String(item.categoria || "").toLowerCase().includes(q) ||
				String(item.pessoa || "").toLowerCase().includes(q) ||
				String(item.observacao || "").toLowerCase().includes(q)
		);
	}, [items, section, filters.searchText]);

	return {
		validItems,
		loading,
		refreshing,
		loadingMore,
		loadData,
		onRefresh,
		handleLoadMore,
		deleteItem,
		syncPessoa,
		toggleRecorrenciaStatus,
		darBaixa,
		darBaixaBulk,
		removerBaixaBulk,
		deleteItemsBulk,
		deleteRecorrenciaScope,
	};
}
