import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDatabase } from "@/hooks/useDatabase";
import { useErrorToast } from "@/components/ui/toast/useErrorToast";
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
	const { userData, family } = useAuth();
	const {
		createTransacao,
		createRecurringTransacoes,
		updateTransacao,
		getTransacao,
		findPessoaByName,
	} = useDatabase();

	const [isSaving, setIsSaving] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [showRecurrenceEndPicker, setShowRecurrenceEndPicker] = useState(false);
	const [isBooting, setIsBooting] = useState(true);
	const [isFromRecurrence, setIsFromRecurrence] = useState(false);
	const [recurrenceMeta, setRecurrenceMeta] = useState(null);

	const editId = useMemo(() => {
		const raw = Array.isArray(params?.id_transacao)
			? params.id_transacao[0]
			: params?.id_transacao;
		const n = Number(raw);
		return raw && !Number.isNaN(n) ? n : null;
	}, [params?.id_transacao]);

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
			observacao: "",
			share_with_family: false,
		},
	});

	const { reset, setValue } = form;

	useEffect(() => {
		const t = setTimeout(() => setIsBooting(false), 350);
		return () => clearTimeout(t);
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
				const t = await getTransacao(editId, { fallbackRemoteOnMiss: true });
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
					data_vencimento: t.data_vencimento ?? "",
					observacao: t.observacao ?? "",
					share_with_family: Number(t.is_family_shared || 0) === 1,
				});
				setIsFromRecurrence(Number(t?.is_from_recurrence || 0) === 1);
				setRecurrenceMeta({
					recurrence_uuid: t?.recurrence_uuid ?? null,
					recurrence_frequency: t?.recurrence_frequency ?? null,
					recurrence_sequence: t?.recurrence_sequence ?? null,
				});
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
		if (editId) return;
		if (tipoParam) setValue("tipo", tipoParam, { shouldDirty: false, shouldTouch: false });
		if (categoriaParam) setValue("categoria", categoriaParam, { shouldDirty: false, shouldTouch: false });
		if (dataVencimentoParam) setValue("data_vencimento", dataVencimentoParam, { shouldDirty: false, shouldTouch: false });
	}, [categoriaParam, dataVencimentoParam, editId, setValue, tipoParam]);

	useEffect(() => {
		return navigation.addListener("beforeRemove", (event) => {
			const type = event?.data?.action?.type;
			if (type !== "GO_BACK" && type !== "POP" && type !== "POP_TO_TOP") return;
			event.preventDefault();
			router.replace("/");
		});
	}, [navigation, router]);

	const handleSave = async (data) => {
		try {
			setIsSaving(true);
			const typedPessoa = String(data.pessoa || "").trim();
			const found = typedPessoa ? await findPessoaByName(typedPessoa) : null;
			const payload = {
				tipo: data.tipo,
				valor: parseBrNumber(data.valor),
				categoria: data.categoria,
				id_pessoa: found?.id_pessoa ?? null,
				pessoa: found?.nome || typedPessoa || null,
				id_imobilizado: null,
				family_id: data.share_with_family && family?.id ? Number(family.id) : null,
				is_family_shared: data.share_with_family && family?.id ? 1 : 0,
				user_id: userData?.id ?? null,
				data_transacao: new Date().toISOString(),
				data_vencimento: normalizeDate(data.data_vencimento),
				status: data.status,
				observacao: data.observacao || null,
				json: JSON.stringify({ descricao: data.descricao || null }),
			};

			if (editId) {
				await updateTransacao(editId, payload);
				showNewToast("success", "Transação atualizada com sucesso.", "Sucesso");
			} else if (data.recurrence_mode === "recorrente") {
				const result = await createRecurringTransacoes(payload, {
					frequency: data.recurrence_frequency,
					endDate: data.recurrence_end_date || null,
					skipNonWorking: Boolean(data.recurrence_skip_non_working),
					skipDirection: data.recurrence_skip_non_working
						? (data.recurrence_skip_direction || null)
						: null,
				});
				showNewToast(
					"success",
					`${result.created} lançamentos recorrentes criados com sucesso.`,
					"Sucesso"
				);
			} else {
				await createTransacao(payload);
				showNewToast("success", "Transação salva com sucesso.", "Sucesso");
			}

			reset();
			router.replace("/");
		} catch (error) {
			showNewToast("error", String(error || "Falha ao salvar transação"), "Erro");
		} finally {
			setIsSaving(false);
		}
	};

	return {
		form,
		isEditMode: !!editId,
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
		handleBack: () => router.replace("/"),
		family,
	};
}
