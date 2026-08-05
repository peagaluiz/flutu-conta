import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/utils/alert";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDatabase } from "@/hooks/useDatabase";
import { useErrorToast } from "@/components/ui/toast/useErrorToast";
import { useSaveFeedback } from "@/state/SaveFeedbackContext";
import { useInsertModal } from "@/state/InsertModalContext";
import { useAuth } from "@/state/AuthContext";
import { insertSchema, toISODate } from "@/components/finance/insert/insertFormConfig";
import { LAUNCHES_PATH } from "@/utils/navigation";
import { useInsertParams } from "./useInsertParams";
import { useInsertBoot } from "./useInsertBoot";
import { buildTransacaoPayload, persistTransacao, resolveBancoId } from "./insertSave";

export function useInsertForm(options = {}) {
	const { params: paramsOverride, onDone, onCancel } = options;
	const inModal = !!onDone || !!onCancel;
	const router = useRouter();
	const navigation = useNavigation();
	const routeParams = useLocalSearchParams();
	const params = paramsOverride ?? routeParams;
	const { showNewToast } = useErrorToast();
	const { startSaving, showSuccess, showError } = useSaveFeedback();
	const notifyDataChanged = useInsertModal()?.notifyDataChanged;
	const { userData, family } = useAuth();
	const database = useDatabase();
	const { findPessoaByName, listBancos, createBanco } = database;

	const [isSaving, setIsSaving] = useState(false);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [showRecurrenceEndPicker, setShowRecurrenceEndPicker] = useState(false);
	const [recurringEditModalOpen, setRecurringEditModalOpen] = useState(false);
	const [pendingFormData, setPendingFormData] = useState(null);

	const {
		editId,
		fromParam,
		ghostRecurrenceUuid,
		ghostDueDate,
		ghostDataVencimento,
		ghostMode,
		tipoParam,
		categoriaParam,
		dataVencimentoParam,
		recurrenceModeParam,
	} = useInsertParams(params);

	// No modal (desktop web) o fim do fluxo é controlado pelo host; na tela cheia,
	// navega de volta pra origem (Lançamentos ou Início).
	const finish = useCallback(
		(savedId) => {
			if (onDone) {
				onDone(savedId ? { savedId: String(savedId) } : {});
				return;
			}
			// Rota de tela cheia (mobile): avisa Home/Finanças pra recarregarem,
			// já que aqui não passa pelo markSaved do modal desktop.
			notifyDataChanged?.();
			if (fromParam === "launches") {
				router.replace(
					savedId
						? {
								pathname: LAUNCHES_PATH,
								params: {
									highlightId: String(savedId),
									highlightTs: String(Date.now()),
								},
						  }
						: LAUNCHES_PATH
				);
			} else {
				router.replace("/");
			}
		},
		[onDone, fromParam, router, notifyDataChanged]
	);

	const cancel = useCallback(() => {
		if (onCancel) {
			onCancel();
			return;
		}
		if (fromParam === "launches") router.replace(LAUNCHES_PATH);
		else router.replace("/");
	}, [onCancel, fromParam, router]);

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
			parcelas: 1,
		},
	});

	const { reset, setValue } = form;

	const boot = useInsertBoot({
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
	});

	const {
		isLoading,
		isBooting,
		isFromRecurrence,
		recurrenceMeta,
		selectedCatalogBanco,
		setSelectedCatalogBanco,
		editingFatura,
		categories,
	} = boot;

	useEffect(() => {
		const sub = form.watch((values, { name }) => {
			if (name === "status" && values.status === "pago" && !values.data_baixa) {
				form.setValue("data_baixa", toISODate(new Date()));
			}
		});
		return () => sub.unsubscribe();
	}, [form]);

	useEffect(() => {
		if (editId || ghostMode) return;
		const opts = { shouldDirty: false, shouldTouch: false };
		if (tipoParam) setValue("tipo", tipoParam, opts);
		if (categoriaParam) setValue("categoria", categoriaParam, opts);
		if (dataVencimentoParam) setValue("data_vencimento", dataVencimentoParam, opts);
		if (recurrenceModeParam) setValue("recurrence_mode", recurrenceModeParam, opts);
	}, [categoriaParam, dataVencimentoParam, editId, ghostMode, recurrenceModeParam, setValue, tipoParam]);

	useEffect(() => {
		if (inModal) return;
		return navigation.addListener("beforeRemove", (event) => {
			const type = event?.data?.action?.type;
			if (type !== "GO_BACK" && type !== "POP" && type !== "POP_TO_TOP") return;
			event.preventDefault();
			if (fromParam === "launches") {
				router.replace(LAUNCHES_PATH);
			} else {
				router.replace("/");
			}
		});
	}, [navigation, router, fromParam, inModal]);

	const handleBancoSelect = (banco) => {
		if (!banco) {
			setSelectedCatalogBanco(null);
			setValue("id_banco", null);
			return;
		}
		setSelectedCatalogBanco(banco);
		setValue("id_banco", banco.id_banco ?? null);
	};

	const isCartao = selectedCatalogBanco?.side === "cartao";

	const executeSave = useCallback(
		async (data, recurringScope) => {
			startSaving();
			setIsSaving(true);
			try {
				const typedPessoa = String(data.pessoa || "").trim();
				const foundPessoa = typedPessoa ? await findPessoaByName(typedPessoa) : null;

				const resolvedBancoId = await resolveBancoId({
					selectedCatalogBanco,
					data,
					userId: userData?.id ?? null,
					listBancos,
					createBanco,
				});

				const payload = buildTransacaoPayload({
					data,
					idCategoria: categories.find((c) => c.nome === data.categoria)?.id ?? null,
					pessoa: foundPessoa?.nome || typedPessoa,
					idPessoa: foundPessoa?.id_pessoa ?? null,
					idBanco: resolvedBancoId,
					familyId: family?.id ?? null,
					userId: userData?.id ?? null,
					isEdit: !!editId,
				});

				const { savedId, successMessage } = await persistTransacao({
					payload,
					data,
					database,
					context: {
						editId,
						ghostMode,
						ghostRecurrenceUuid,
						ghostDueDate,
						selectedCatalogBanco,
						recurrenceMeta,
						editingFatura,
						recurringScope,
						userId: userData?.id ?? null,
					},
				});

				await showSuccess(successMessage);
				finish(savedId);
			} catch (error) {
				showError(String(error || "Não foi possível salvar o lançamento."));
				setIsSaving(false);
			}
		},
		[
			categories,
			createBanco,
			database,
			editId,
			editingFatura,
			family?.id,
			findPessoaByName,
			finish,
			ghostDueDate,
			ghostMode,
			ghostRecurrenceUuid,
			listBancos,
			recurrenceMeta,
			selectedCatalogBanco,
			showError,
			showSuccess,
			startSaving,
			userData?.id,
		]
	);

	const handleSave = useCallback(
		async (data) => {
			const faturaStatus = editingFatura?.status;
			if (editId && (faturaStatus === "fechada" || faturaStatus === "paga")) {
				Alert.alert(
					"Fatura " + (faturaStatus === "paga" ? "paga" : "fechada"),
					"Este lançamento pertence a uma fatura " +
						(faturaStatus === "paga" ? "já paga" : "fechada") +
						". Deseja editar mesmo assim?",
					[
						{ text: "Cancelar", style: "cancel" },
						{ text: "Editar", style: "destructive", onPress: () => executeSave(data, null) },
					]
				);
				return;
			}
			if (editId && isFromRecurrence) {
				setPendingFormData(data);
				setRecurringEditModalOpen(true);
				return;
			}
			await executeSave(data, null);
		},
		[editId, isFromRecurrence, executeSave, editingFatura]
	);

	const handleRecurringEditScope = useCallback(
		async (scope) => {
			setRecurringEditModalOpen(false);
			if (!pendingFormData) return;
			const data = pendingFormData;
			setPendingFormData(null);
			await executeSave(data, scope);
		},
		[pendingFormData, executeSave]
	);

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
		handleBack: cancel,
		family,
		selectedCatalogBanco,
		handleBancoSelect,
		isCartao,
		categories,
		recurringEditModalOpen,
		onCloseRecurringEditModal: () => setRecurringEditModalOpen(false),
		handleRecurringEditScope,
	};
}
