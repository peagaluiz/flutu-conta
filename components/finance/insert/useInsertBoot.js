import { useEffect, useState } from "react";
import {
	formatValueForInput,
	normalizeDate,
	toISODate,
} from "@/components/finance/insert/insertFormConfig";

function parseDescricao(json) {
	try {
		return JSON.parse(json)?.descricao ?? "";
	} catch {
		return "";
	}
}

const RECURRENCE_DEFAULTS = {
	recurrence_mode: "unica",
	recurrence_frequency: "mensal",
	recurrence_end_date: "",
	recurrence_skip_non_working: false,
	recurrence_skip_direction: "",
};

function buildEditFormValues(t) {
	return {
		...RECURRENCE_DEFAULTS,
		tipo: t.tipo ?? "pagar",
		status: t.status ?? "pendente",
		descricao: parseDescricao(t.json),
		valor: formatValueForInput(t.valor),
		categoria: t.categoria ?? "",
		pessoa: t.pessoa ?? "",
		data_vencimento: normalizeDate(t.data_vencimento) ?? "",
		data_baixa:
			normalizeDate(t.data_baixa) ?? (t.status === "pago" ? toISODate(new Date()) : ""),
		observacao: t.observacao ?? "",
		share_with_family: Number(t.is_family_shared || 0) === 1,
		id_banco: t.id_banco ?? null,
	};
}

function buildGhostFormValues(rec, dataVencimento) {
	const template = rec.template ?? {};
	return {
		...RECURRENCE_DEFAULTS,
		tipo: template.tipo ?? "pagar",
		status: "pendente",
		descricao: parseDescricao(template.json),
		valor: formatValueForInput(template.valor),
		categoria: rec.categoria ?? "",
		pessoa: template.pessoa ?? "",
		data_vencimento: dataVencimento ?? "",
		data_baixa: "",
		observacao: template.observacao ?? "",
		share_with_family:
			Number(template.is_family_shared ?? rec.is_family_shared ?? 0) === 1,
		id_banco: null,
	};
}

// Carregamento inicial do formulário: edição de um lançamento existente,
// materialização de uma ocorrência prevista, ou tela em branco.
export function useInsertBoot({
	editId,
	ghostMode,
	ghostRecurrenceUuid,
	ghostDueDate,
	ghostDataVencimento,
	reset,
	cancel,
	showNewToast,
	userData,
	family,
	database,
}) {
	const {
		getTransacao,
		getRecorrenciaByUuid,
		listBancos,
		listCatalog,
		listCategories,
		getFaturaById,
	} = database;

	const [isLoading, setIsLoading] = useState(false);
	const [isBooting, setIsBooting] = useState(true);
	const [isFromRecurrence, setIsFromRecurrence] = useState(false);
	const [recurrenceMeta, setRecurrenceMeta] = useState(null);
	const [selectedCatalogBanco, setSelectedCatalogBanco] = useState(null);
	const [editingFatura, setEditingFatura] = useState(null);
	const [categories, setCategories] = useState([]);

	useEffect(() => {
		const t = setTimeout(() => setIsBooting(false), 350);
		return () => clearTimeout(t);
	}, []);

	useEffect(() => {
		listCategories().then(setCategories).catch(() => {});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!editId) {
			setIsFromRecurrence(false);
			setRecurrenceMeta(null);
			return;
		}

		async function load() {
			try {
				setIsLoading(true);
				const t = await getTransacao(editId, {
					fallbackRemoteOnMiss: true,
					userId: userData?.id ?? undefined,
					familyId: family?.id ? Number(family.id) : null,
					visibilityScope: "all",
				});
				if (!t) {
					showNewToast("warning", "Lançamento não encontrado.", "Atenção");
					cancel();
					return;
				}

				reset(buildEditFormValues(t));
				setIsFromRecurrence(Number(t?.is_from_recurrence || 0) === 1);
				setRecurrenceMeta({
					recurrence_uuid: t?.recurrence_uuid ?? null,
					recurrence_frequency: t?.recurrence_frequency ?? null,
					recurrence_sequence: t?.recurrence_sequence ?? null,
				});

				if (t.id_banco) {
					const userBancos = await listBancos({
						visibilityScope: "mine",
						userId: userData?.id ?? undefined,
					});
					const userBanco = userBancos.find((b) => b.id_banco === t.id_banco);
					if (userBanco) {
						const catalog = await listCatalog().catch(() => []);
						const catalogItem = catalog.find(
							(c) => c.nome.trim().toLowerCase() === userBanco.nome.trim().toLowerCase()
						);
						setSelectedCatalogBanco({
							...userBanco,
							side: t.id_fatura ? "cartao" : "corrente",
							logo_url: catalogItem?.logo_url ?? null,
							logo_local_path: catalogItem?.logo_local_path ?? null,
						});
					}
				}

				if (t.id_fatura) {
					const fatura = await getFaturaById(Number(t.id_fatura)).catch(() => null);
					setEditingFatura(fatura);
				} else {
					setEditingFatura(null);
				}
			} catch (error) {
				showNewToast("error", String(error || "Falha ao carregar lançamento"), "Erro");
				cancel();
			} finally {
				setIsLoading(false);
			}
		}

		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [editId, getTransacao, reset, showNewToast]);

	useEffect(() => {
		if (!ghostMode) return;

		async function loadGhost() {
			try {
				setIsLoading(true);
				const rec = await getRecorrenciaByUuid(ghostRecurrenceUuid);
				if (!rec) {
					showNewToast("warning", "Recorrência não encontrada.", "Atenção");
					cancel();
					return;
				}

				reset(buildGhostFormValues(rec, ghostDataVencimento ?? ghostDueDate));
				setIsFromRecurrence(true);
				setRecurrenceMeta({
					recurrence_uuid: rec.uuid,
					recurrence_frequency: rec.frequency,
					recurrence_sequence: null,
				});
			} catch (error) {
				showNewToast("error", String(error || "Falha ao carregar lançamento"), "Erro");
				cancel();
			} finally {
				setIsLoading(false);
			}
		}

		loadGhost();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		getRecorrenciaByUuid,
		ghostDataVencimento,
		ghostDueDate,
		ghostMode,
		ghostRecurrenceUuid,
		reset,
		showNewToast,
	]);

	return {
		isLoading,
		isBooting,
		isFromRecurrence,
		recurrenceMeta,
		selectedCatalogBanco,
		setSelectedCatalogBanco,
		editingFatura,
		categories,
	};
}
