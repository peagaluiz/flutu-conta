import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDatabase } from "@/hooks/useDatabase";
import { useErrorToast } from "@/components/ui/toast/useErrorToast";
import { useSaveFeedback } from "@/state/SaveFeedbackContext";
import { useAuth } from "@/state/AuthContext";
import {
	insertSchema,
	normalizeDate,
	formatValueForInput,
	parseBrNumber,
	toISODate,
} from "@/components/finance/insert/insertFormConfig";

export function useInsertForm() {
	const router = useRouter();
	const navigation = useNavigation();
	const params = useLocalSearchParams();
	const { showNewToast } = useErrorToast();
	const { startSaving, showSuccess, showError } = useSaveFeedback();
	const { userData, family } = useAuth();
	const {
		createTransacao,
		createRecurringTransacoes,
		updateTransacao,
		applyEditToRecurrenceTransacoes,
		materializeRecurrenceOccurrence,
		getRecorrenciaByUuid,
		getTransacao,
		findPessoaByName,
		listBancos,
		createBanco,
		listCatalog,
		listCategories,
	} = useDatabase();

	const [isSaving, setIsSaving] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [showRecurrenceEndPicker, setShowRecurrenceEndPicker] = useState(false);
	const [isBooting, setIsBooting] = useState(true);
	const [isFromRecurrence, setIsFromRecurrence] = useState(false);
	const [recurrenceMeta, setRecurrenceMeta] = useState(null);
	const [selectedCatalogBanco, setSelectedCatalogBanco] = useState(null);
	const [categories, setCategories] = useState([]);
	const [recurringEditModalOpen, setRecurringEditModalOpen] = useState(false);
	const [pendingFormData, setPendingFormData] = useState(null);

	const editId = useMemo(() => {
		const raw = Array.isArray(params?.id_transacao)
			? params.id_transacao[0]
			: params?.id_transacao;
		const n = Number(raw);
		return raw && !Number.isNaN(n) ? n : null;
	}, [params?.id_transacao]);

	const fromParam = useMemo(() => {
		const v = Array.isArray(params?.from) ? params.from[0] : params?.from;
		return v === "launches" ? "launches" : null;
	}, [params?.from]);

	const ghostRecurrenceUuid = useMemo(() => {
		const v = Array.isArray(params?.ghost_recurrence_uuid)
			? params.ghost_recurrence_uuid[0]
			: params?.ghost_recurrence_uuid;
		return typeof v === "string" && v.trim() ? v.trim() : null;
	}, [params?.ghost_recurrence_uuid]);

	const ghostDueDate = useMemo(() => {
		const v = Array.isArray(params?.ghost_due_date)
			? params.ghost_due_date[0]
			: params?.ghost_due_date;
		return normalizeDate(v);
	}, [params?.ghost_due_date]);

	const ghostDataVencimento = useMemo(() => {
		const v = Array.isArray(params?.ghost_data_vencimento)
			? params.ghost_data_vencimento[0]
			: params?.ghost_data_vencimento;
		return normalizeDate(v);
	}, [params?.ghost_data_vencimento]);

	const ghostMode = Boolean(ghostRecurrenceUuid && ghostDueDate && !editId);

	const tipoParam = useMemo(() => {
		const v = Array.isArray(params?.tipo) ? params.tipo[0] : params?.tipo;
		return v === "receber" || v === "pagar" ? v : null;
	}, [params?.tipo]);

	const categoriaParam = useMemo(() => {
		const v = Array.isArray(params?.categoria)
			? params.categoria[0]
			: params?.categoria;
		return typeof v === "string" && v.trim() ? v.trim() : null;
	}, [params?.categoria]);

	const dataVencimentoParam = useMemo(() => {
		const v = Array.isArray(params?.data_vencimento)
			? params.data_vencimento[0]
			: params?.data_vencimento;
		return normalizeDate(v);
	}, [params?.data_vencimento]);

	const recurrenceModeParam = useMemo(() => {
		const v = Array.isArray(params?.recurrence_mode) ? params.recurrence_mode[0] : params?.recurrence_mode;
		return v === "recorrente" ? "recorrente" : null;
	}, [params?.recurrence_mode]);

	const form = useForm({
		resolver: yupResolver(insertSchema),
		defaultValues: {
			tipo: "pagar",
			status: "pendente",
			recurrence_mode: "unica",
			recurrence_frequency: "mensal",
			recurrence_end_date: "",
			recurrence_skip_non_working: false,
			recurrence_skip_direction: "",
			descricao: "",
			valor: "",
			categoria: "",
			pessoa: "",
			data_vencimento: toISODate(new Date()),
			data_baixa: toISODate(new Date()),
			observacao: "",
			share_with_family: false,
			id_banco: null,
		},
	});

	const { reset, setValue } = form;

	useEffect(() => {
		const sub = form.watch((values, { name }) => {
			if (name === "status" && values.status === "pago" && !values.data_baixa) {
				form.setValue("data_baixa", toISODate(new Date()));
			}
		});
		return () => sub.unsubscribe();
	}, [form]);

	useEffect(() => {
		const t = setTimeout(() => setIsBooting(false), 350);
		return () => clearTimeout(t);
	}, []);

	useEffect(() => {
		listCategories().then(setCategories).catch(() => {});
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
					router.replace("/");
					return;
				}
				let descricao = "";
				try {
					descricao = JSON.parse(t.json)?.descricao ?? "";
				} catch {}
				reset({
					tipo: t.tipo ?? "pagar",
					status: t.status ?? "pendente",
					recurrence_mode: "unica",
					recurrence_frequency: "mensal",
					recurrence_end_date: "",
					recurrence_skip_non_working: false,
					recurrence_skip_direction: "",
					descricao,
					valor: formatValueForInput(t.valor),
					categoria: t.categoria ?? "",
					pessoa: t.pessoa ?? "",
					data_vencimento: normalizeDate(t.data_vencimento) ?? "",
					data_baixa:
						normalizeDate(t.data_baixa) ??
						(t.status === "pago" ? toISODate(new Date()) : ""),
					observacao: t.observacao ?? "",
					share_with_family: Number(t.is_family_shared || 0) === 1,
					id_banco: t.id_banco ?? null,
				});
				setIsFromRecurrence(Number(t?.is_from_recurrence || 0) === 1);
				setRecurrenceMeta({
					recurrence_uuid: t?.recurrence_uuid ?? null,
					recurrence_frequency: t?.recurrence_frequency ?? null,
					recurrence_sequence: t?.recurrence_sequence ?? null,
				});

				if (t.id_banco) {
					const userBancos = await listBancos({ visibilityScope: "mine", userId: userData?.id ?? undefined });
					const userBanco = userBancos.find((b) => b.id_banco === t.id_banco);
					if (userBanco) {
						const catalog = await listCatalog().catch(() => []);
						const catalogItem = catalog.find(
							(c) => c.nome.trim().toLowerCase() === userBanco.nome.trim().toLowerCase()
						);
						setSelectedCatalogBanco(
							catalogItem ?? { id: null, nome: userBanco.nome, cor_hex: userBanco.cor_hex }
						);
					}
				}
			} catch (error) {
				showNewToast(
					"error",
					String(error || "Falha ao carregar lançamento"),
					"Erro"
				);
				router.replace("/");
			} finally {
				setIsLoading(false);
			}
		}
		load();
	}, [editId, getTransacao, reset, router, showNewToast]);

	useEffect(() => {
		if (!ghostMode) return;
		async function loadGhost() {
			try {
				setIsLoading(true);
				const rec = await getRecorrenciaByUuid(ghostRecurrenceUuid);
				if (!rec) {
					showNewToast("warning", "Recorrência não encontrada.", "Atenção");
					router.replace(fromParam === "launches" ? "/(auth)/(tabs)/launches" : "/");
					return;
				}
				const template = rec.template ?? {};
				let descricao = "";
				try {
					descricao = JSON.parse(template.json)?.descricao ?? "";
				} catch {}
				reset({
					tipo: template.tipo ?? "pagar",
					status: "pendente",
					recurrence_mode: "unica",
					recurrence_frequency: "mensal",
					recurrence_end_date: "",
					recurrence_skip_non_working: false,
					recurrence_skip_direction: "",
					descricao,
					valor: formatValueForInput(template.valor),
					categoria: rec.categoria ?? "",
					pessoa: template.pessoa ?? "",
					data_vencimento: ghostDataVencimento ?? ghostDueDate ?? "",
					data_baixa: "",
					observacao: template.observacao ?? "",
					share_with_family:
						Number(template.is_family_shared ?? rec.is_family_shared ?? 0) === 1,
					id_banco: null,
				});
				setIsFromRecurrence(true);
				setRecurrenceMeta({
					recurrence_uuid: rec.uuid,
					recurrence_frequency: rec.frequency,
					recurrence_sequence: null,
				});
			} catch (error) {
				showNewToast(
					"error",
					String(error || "Falha ao carregar lançamento"),
					"Erro"
				);
				router.replace(fromParam === "launches" ? "/(auth)/(tabs)/launches" : "/");
			} finally {
				setIsLoading(false);
			}
		}
		loadGhost();
	}, [fromParam, getRecorrenciaByUuid, ghostDataVencimento, ghostDueDate, ghostMode, ghostRecurrenceUuid, reset, router, showNewToast]);

	useEffect(() => {
		if (editId || ghostMode) return;
		if (tipoParam) setValue("tipo", tipoParam, { shouldDirty: false, shouldTouch: false });
		if (categoriaParam) setValue("categoria", categoriaParam, { shouldDirty: false, shouldTouch: false });
		if (dataVencimentoParam) setValue("data_vencimento", dataVencimentoParam, { shouldDirty: false, shouldTouch: false });
		if (recurrenceModeParam) setValue("recurrence_mode", recurrenceModeParam, { shouldDirty: false, shouldTouch: false });
	}, [categoriaParam, dataVencimentoParam, editId, recurrenceModeParam, setValue, tipoParam]);

	useEffect(() => {
		return navigation.addListener("beforeRemove", (event) => {
			const type = event?.data?.action?.type;
			if (type !== "GO_BACK" && type !== "POP" && type !== "POP_TO_TOP") return;
			event.preventDefault();
			if (fromParam === "launches") {
				router.replace("/(auth)/(tabs)/launches");
			} else {
				router.replace("/");
			}
		});
	}, [navigation, router, fromParam]);

	const handleBancoSelect = (catalogItem) => {
		if (!catalogItem) {
			setSelectedCatalogBanco(null);
			setValue("id_banco", null);
			return;
		}
		setSelectedCatalogBanco(catalogItem);
	};

	const executeSave = useCallback(async (data, recurringScope) => {
		startSaving();
		setIsSaving(true);
		try {
			const typedPessoa = String(data.pessoa || "").trim();
			const foundPessoa = typedPessoa ? await findPessoaByName(typedPessoa) : null;

			let resolvedBancoId = data.id_banco ?? null;
			if (selectedCatalogBanco) {
				const userBancos = await listBancos({ visibilityScope: "mine", userId: userData?.id ?? undefined });
				const existingBanco = userBancos.find(
					(b) => b.nome.trim().toLowerCase() === selectedCatalogBanco.nome.trim().toLowerCase()
				);
				resolvedBancoId = existingBanco
					? existingBanco.id_banco
					: (await createBanco(selectedCatalogBanco.nome, selectedCatalogBanco.cor_hex ?? "#6B7280", { userId: userData?.id ?? null })).id_banco;
			}

			const id_categoria = categories.find((c) => c.nome === data.categoria)?.id ?? null;

			const payload = {
				tipo: data.tipo,
				valor: parseBrNumber(data.valor),
				id_categoria,
				id_pessoa: foundPessoa?.id_pessoa ?? null,
				pessoa: foundPessoa?.nome || typedPessoa || null,
				id_imobilizado: null,
				id_banco: resolvedBancoId,
				family_id: data.share_with_family && family?.id ? Number(family.id) : null,
				is_family_shared: data.share_with_family && family?.id ? 1 : 0,
				user_id: editId ? null : (userData?.id ?? null),
				data_transacao: new Date().toISOString(),
				data_vencimento: normalizeDate(data.data_vencimento),
				data_baixa: data.status === "pago" ? normalizeDate(data.data_baixa) : null,
				status: data.status,
				observacao: data.observacao || null,
				json: JSON.stringify({ descricao: data.descricao || null }),
			};

			let savedId = null;
			let successMessage = "Lançamento salvo!";
			if (ghostMode) {
				const result = await materializeRecurrenceOccurrence({
					recurrenceUuid: ghostRecurrenceUuid,
					dueDate: ghostDueDate,
					overrides: payload,
					status: payload.status,
					dataBaixa: payload.data_baixa,
				});
				savedId = result?.id_transacao ?? null;
			} else if (editId) {
				await updateTransacao(editId, payload);
				if (recurringScope && recurringScope !== "only_this" && recurrenceMeta?.recurrence_uuid) {
					await applyEditToRecurrenceTransacoes({
						recurrenceUuid: recurrenceMeta.recurrence_uuid,
						currentTransacaoId: editId,
						scope: recurringScope,
						templatePayload: {
							tipo: payload.tipo,
							valor: payload.valor,
							id_categoria: payload.id_categoria,
							id_pessoa: payload.id_pessoa,
							pessoa: payload.pessoa,
							id_imobilizado: payload.id_imobilizado,
							id_banco: payload.id_banco,
							family_id: payload.family_id,
							is_family_shared: payload.is_family_shared,
							observacao: payload.observacao,
							json: payload.json,
							user_id: userData?.id ?? null,
						},
					});
				}
				savedId = editId;
				successMessage = "Lançamento atualizado!";
			} else if (data.recurrence_mode === "recorrente") {
				const result = await createRecurringTransacoes(payload, {
					frequency: data.recurrence_frequency,
					endDate: data.recurrence_end_date || null,
					skipNonWorking: Boolean(data.recurrence_skip_non_working),
					skipDirection: data.recurrence_skip_non_working
						? (data.recurrence_skip_direction || null)
						: null,
				});
				savedId = result?.ids?.[0] ?? null;
				successMessage = "Recorrência criada!";
			} else {
				const result = await createTransacao(payload);
				savedId = result?.insertId ?? null;
				successMessage = "Lançamento salvo!";
			}

			await showSuccess(successMessage);
			if (fromParam === "launches") {
				router.replace(
					savedId
						? {
								pathname: "/(auth)/(tabs)/launches",
								params: {
									highlightId: String(savedId),
									highlightTs: String(Date.now()),
								},
							}
						: "/(auth)/(tabs)/launches"
				);
			} else {
				router.replace("/");
			}
		} catch (error) {
			showError(String(error || "Não foi possível salvar o lançamento."));
			setIsSaving(false);
		}
	}, [
		applyEditToRecurrenceTransacoes,
		categories,
		createBanco,
		createRecurringTransacoes,
		createTransacao,
		editId,
		family?.id,
		findPessoaByName,
		fromParam,
		ghostDueDate,
		ghostMode,
		ghostRecurrenceUuid,
		listBancos,
		materializeRecurrenceOccurrence,
		recurrenceMeta,
		router,
		selectedCatalogBanco,
		showError,
		showSuccess,
		startSaving,
		updateTransacao,
		userData?.id,
	]);

	const handleSave = useCallback(async (data) => {
		if (editId && isFromRecurrence) {
			setPendingFormData(data);
			setRecurringEditModalOpen(true);
			return;
		}
		await executeSave(data, null);
	}, [editId, isFromRecurrence, executeSave]);

	const handleRecurringEditScope = useCallback(async (scope) => {
		setRecurringEditModalOpen(false);
		if (!pendingFormData) return;
		const data = pendingFormData;
		setPendingFormData(null);
		await executeSave(data, scope);
	}, [pendingFormData, executeSave]);

	return {
		form,
		isEditMode: !!editId || ghostMode,
		isSaving,
		isLoading,
		isBooting,
		isFromRecurrence,
		recurrenceMeta,
		showDatePicker,
		setShowDatePicker,
		showRecurrenceEndPicker,
		setShowRecurrenceEndPicker,
		handleSave,
		handleBack: () => fromParam === "launches" ? router.replace("/(auth)/(tabs)/launches") : router.replace("/"),
		family,
		selectedCatalogBanco,
		handleBancoSelect,
		categories,
		recurringEditModalOpen,
		onCloseRecurringEditModal: () => setRecurringEditModalOpen(false),
		handleRecurringEditScope,
	};
}
