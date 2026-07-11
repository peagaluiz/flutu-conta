import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/state/AuthContext";
import { useErrorToast } from "@/components/ui/toast/useErrorToast";
import { useOfxImport } from "@/state/OfxImportContext";
import { cleanPersonName, normalizePersonKey } from "@/utils/ofx/cleanOfxFields";
import { LAUNCHES_PATH } from "@/utils/navigation";

export function useOfxImportScreen() {
	const router = useRouter();
	const database = useDatabase();
	const { userData } = useAuth();
	const { showNewToast } = useErrorToast();
	const { session, clearImport } = useOfxImport();

	const userId = userData?.id ?? null;

	const [items, setItems] = useState(() => session?.rows ?? []);
	const [importing, setImporting] = useState(false);
	const [categories, setCategories] = useState([]);
	const [pessoas, setPessoas] = useState([]);
	const [catSheet, setCatSheet] = useState({ open: false, key: null });

	const bank = session?.bank ?? null;
	const isCredit = !!session?.isCredit;
	const faturaDates = session?.faturaDates ?? null;

	// Sem sessão (acesso direto / reload) → volta para lançamentos
	useEffect(() => {
		if (!session) router.replace(LAUNCHES_PATH);
	}, [session, router]);

	useEffect(() => {
		database.listCategories?.().then((c) => setCategories(Array.isArray(c) ? c : [])).catch(() => {});
		database.listPessoas?.().then((p) => setPessoas(Array.isArray(p) ? p : [])).catch(() => {});
	}, [database]);

	const categoryOptions = useMemo(() => categories.map((c) => ({ id: c.id, label: c.nome })), [categories]);
	const pessoaOptions = useMemo(() => pessoas.map((p) => ({ id: p.nome, label: p.nome })), [pessoas]);
	const categoryNameById = (id) => categories.find((c) => Number(c.id) === Number(id))?.nome ?? "";

	const toggleItem = (key) =>
		setItems((prev) => prev.map((it) => (it.key === key ? { ...it, checked: !it.checked } : it)));
	const setItemField = (key, field, value) =>
		setItems((prev) => prev.map((it) => (it.key === key ? { ...it, [field]: value } : it)));
	const setAll = (value) => setItems((prev) => prev.map((it) => ({ ...it, checked: value })));

	const selectedCount = items.filter((it) => it.checked).length;

	const goBack = () => {
		clearImport();
		router.replace(LAUNCHES_PATH);
	};

	const handleImport = async () => {
		const selected = items.filter((it) => it.checked);
		if (!selected.length || !bank) return;
		setImporting(true);
		try {
			let idFatura = null;
			if (isCredit) {
				idFatura = await database.findOrCreateFatura({
					idBanco: Number(bank.id_banco),
					mesReferencia: faturaDates.mesReferencia,
					dataFechamento: faturaDates.dataFechamento,
					dataVencimento: faturaDates.dataVencimento,
					userId,
					familyId: null,
					isFamilyShared: false,
				});
			}

			// Resolve pessoa: acha a existente (case-insensitive) ou cria 1 com o nome canônico (Title Case)
			const pessoaCache = new Map();
			const resolvePessoa = async (rawName) => {
				const canonical = cleanPersonName(rawName, "", false) || String(rawName || "").trim();
				if (!canonical) return { id_pessoa: null, pessoa: null };
				const key = normalizePersonKey(canonical);
				if (pessoaCache.has(key)) return pessoaCache.get(key);
				let found = await database.findPessoaByName(canonical).catch(() => null);
				if (!found?.id_pessoa) {
					await database.createPessoa(canonical, { userId }).catch(() => {});
					found = await database.findPessoaByName(canonical).catch(() => null);
				}
				const res = { id_pessoa: found?.id_pessoa ?? null, pessoa: found?.nome ?? canonical };
				pessoaCache.set(key, res);
				return res;
			};

			for (const item of selected) {
				const isPagar = Number(item.amount) < 0;
				const data = item.date || null;
				const { id_pessoa, pessoa } = await resolvePessoa(item.pessoa);
				await database.createTransacao({
					tipo: isPagar ? "pagar" : "receber",
					valor: Math.abs(Number(item.amount || 0)),
					id_categoria: item.id_categoria ?? null,
					id_pessoa,
					pessoa,
					id_imobilizado: null,
					id_banco: Number(bank.id_banco),
					family_id: null,
					is_family_shared: 0,
					user_id: userId ?? null,
					data_transacao: data,
					data_vencimento: isCredit ? faturaDates.dataVencimento ?? data : data,
					data_baixa: isCredit ? null : data,
					status: isCredit ? "pendente" : "pago",
					observacao: null,
					json: JSON.stringify({ descricao: item.descricao || null }),
					id_fatura: idFatura,
					parcela_atual: item.parcelaAtual ?? null,
					parcela_total: item.parcelaTotal ?? null,
					ofx_fitid: item.fitid || null,
				});
			}

			if (isCredit && idFatura) await database.recalcFaturaTotal(idFatura).catch(() => {});

			showNewToast("success", `${selected.length} lançamento(s) importado(s).`, "OFX");
			clearImport();
			router.replace({ pathname: LAUNCHES_PATH, params: { highlightTs: String(Date.now()) } });
		} catch (error) {
			showNewToast("error", String(error?.message || error || "Falha ao importar."), "Erro");
			setImporting(false);
		}
	};

	return {
		session,
		bank,
		isCredit,
		items,
		importing,
		selectedCount,
		categoryOptions,
		pessoaOptions,
		categoryNameById,
		catSheet,
		setCatSheet,
		toggleItem,
		setItemField,
		setAll,
		goBack,
		handleImport,
	};
}
