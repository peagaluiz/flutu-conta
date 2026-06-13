import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { getItemType } from "@/utils/auth/launches/sections";

export function useLaunchesEditor({
	database,
	section,
	family,
	userData,
	loadData,
}) {
	const router = useRouter();

	const [editorOpen, setEditorOpen] = useState(false);
	const [editorMode, setEditorMode] = useState("create");
	const [editingItem, setEditingItem] = useState(null);
	const [editorValue, setEditorValue] = useState("");
	const [editorCor, setEditorCor] = useState("#6B7280");
	const [selectedPessoaId, setSelectedPessoaId] = useState(null);
	const [pessoaOptions, setPessoaOptions] = useState([]);
	const [savingEditor, setSavingEditor] = useState(false);
	const [shareWithFamily, setShareWithFamily] = useState(false);

	const [catalogSheetOpen, setCatalogSheetOpen] = useState(false);

	const closeEditor = useCallback(() => {
		setEditorOpen(false);
		setEditorMode("create");
		setEditingItem(null);
		setEditorValue("");
		setEditorCor("#6B7280");
		setSelectedPessoaId(null);
		setPessoaOptions([]);
		setShareWithFamily(false);
	}, []);

	const closeCatalogSheet = useCallback(() => {
		setCatalogSheetOpen(false);
	}, []);

	const createBancoFromCatalog = useCallback(
		async (item) => {
			try {
				await database.createBanco(item.nome, item.cor_hex, {
					userId: userData?.id ?? null,
					familyId: family?.id ? Number(family.id) : null,
					isFamilyShared: false,
				});
				await loadData("bancos");
			} catch {
				Alert.alert("Erro", "Não foi possível adicionar o banco.");
			}
		},
		[database, family?.id, loadData, userData?.id]
	);

	const loadPessoaOptions = useCallback(async () => {
		try {
			const rows = await database.listPessoas();
			setPessoaOptions(Array.isArray(rows) ? rows : []);
		} catch {
			setPessoaOptions([]);
		}
	}, [database]);

	useEffect(() => {
		if (editorOpen && section === "pessoas") loadPessoaOptions();
	}, [editorOpen, loadPessoaOptions, section]);

	useEffect(() => {
		closeEditor();
	}, [closeEditor, section]);

	const openCreate = useCallback(() => {
		if (section === "transacoes") {
			router.push({ pathname: "/(auth)/(stack)/insert", params: { from: "launches" } });
			return;
		}
		if (section === "recorrencias") {
			router.push({ pathname: "/(auth)/(stack)/insert", params: { from: "launches", recurrence_mode: "recorrente" } });
			return;
		}
		if (section === "bancos") {
			setCatalogSheetOpen(true);
			return;
		}
		setEditorMode("create");
		setEditingItem(null);
		setEditorValue("");
		setEditorCor("#6B7280");
		setShareWithFamily(false);
		setSelectedPessoaId(null);
		setEditorOpen(true);
	}, [router, section]);

	const openEdit = useCallback(
		(item) => {
			const itemType = getItemType(item);
			if (itemType === "transacoes") {
				if (item.is_ghost) {
					router.push({
						pathname: "/(auth)/(stack)/insert",
						params: {
							ghost_recurrence_uuid: String(item.recurrence_uuid),
							ghost_due_date: String(item.ghost_due_date),
							ghost_data_vencimento: String(item.data_vencimento || ""),
							from: "launches",
						},
					});
					return;
				}
				router.push({
					pathname: "/(auth)/(stack)/insert",
					params: { id_transacao: String(item.id_transacao), from: "launches" },
				});
				return;
			}
			setEditorMode("edit");
			setEditingItem(item);
			if (itemType === "bancos") {
				setEditorValue(String(item?.nome || ""));
				setEditorCor(String(item?.cor_hex || "#6B7280"));
			} else if (itemType === "pessoas") {
				setEditorValue(String(item?.nome || ""));
				setEditorCor("#6B7280");
			} else {
				setEditorValue(String(item?.descricao || item?.codigo || ""));
				setEditorCor("#6B7280");
			}
			setSelectedPessoaId(null);
			setEditorOpen(true);
		},
		[router]
	);

	const selectPessoaOption = useCallback((pessoa) => {
		setSelectedPessoaId(pessoa.id_pessoa);
		setEditorValue(pessoa.nome || "");
	}, []);

	const saveEditor = useCallback(async () => {
		const nextValue = String(editorValue || "").trim();
		if (!nextValue) {
			Alert.alert("Atenção", "Informe um valor para continuar.");
			return;
		}

		setSavingEditor(true);
		try {
			if (section === "bancos") {
				const cor = editorCor || "#6B7280";
				if (editorMode === "edit" && editingItem?.id_banco) {
					await database.updateBanco(editingItem.id_banco, nextValue, cor);
				} else {
					await database.createBanco(nextValue, cor, {
						userId: userData?.id ?? null,
						familyId: family?.id ? Number(family.id) : null,
						isFamilyShared: Boolean(shareWithFamily && family?.id),
					});
				}
				await loadData("bancos");
				closeEditor();
				return;
			}

			if (section === "pessoas") {
				const isPendingPessoa =
					Number(editingItem?.is_pending || 0) === 1;

				if (isPendingPessoa) {
					if (selectedPessoaId) {
						await database.relinkTransacoesPessoaPendente({
							pendingName: String(editingItem?.nome || nextValue),
							pendingTransactionIds: editingItem?.pending_ids,
							targetPessoaId: selectedPessoaId,
						});
					} else {
						await database.syncPessoaPendente(
							nextValue,
							editingItem?.pending_ids
						);
					}
				} else if (editorMode === "edit" && editingItem?.id_pessoa) {
					await database.updatePessoaAndRelinkTransacoes(
						editingItem.id_pessoa,
						String(editingItem?.nome || ""),
						nextValue
					);
				} else {
					await database.syncPessoaPendente(
						nextValue,
						undefined,
						undefined,
						{
							userId: userData?.id ?? null,
							familyId: family?.id ? Number(family.id) : null,
							isFamilyShared: Boolean(shareWithFamily && family?.id),
						}
					);
				}
				await loadData("pessoas");
				closeEditor();
				return;
			}

			if (section === "imobilizados") {
				if (editorMode === "edit" && editingItem?.id_imobilizado) {
					await database.updateImobilizado(
						editingItem.id_imobilizado,
						nextValue
					);
				} else {
					await database.createImobilizado(nextValue, {
						userId: userData?.id ?? null,
						familyId: family?.id ? Number(family.id) : null,
						isFamilyShared: Boolean(shareWithFamily && family?.id),
					});
				}
				await loadData("imobilizados");
				closeEditor();
			}
		} catch {
			Alert.alert("Erro", "Falha ao salvar.");
		} finally {
			setSavingEditor(false);
		}
	}, [
		closeEditor,
		database,
		editorCor,
		editorMode,
		editorValue,
		editingItem,
		family?.id,
		loadData,
		section,
		selectedPessoaId,
		shareWithFamily,
		userData?.id,
	]);

	return {
		editorOpen,
		editorMode,
		editingItem,
		editorValue,
		setEditorValue,
		editorCor,
		setEditorCor,
		selectedPessoaId,
		pessoaOptions,
		savingEditor,
		shareWithFamily,
		setShareWithFamily,
		closeEditor,
		openCreate,
		openEdit,
		selectPessoaOption,
		saveEditor,
		catalogSheetOpen,
		closeCatalogSheet,
		createBancoFromCatalog,
	};
}
