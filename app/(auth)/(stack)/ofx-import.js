import { useEffect, useMemo, useState } from "react";
import { ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CheckSquare, Square, Tag, UserRound, CreditCard, Landmark } from "lucide-react-native";

import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/state/AuthContext";
import { useErrorToast } from "@/components/ui/toast/useErrorToast";
import { useOfxImport } from "@/state/OfxImportContext";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { SearchableSelect, SearchableSelectSheet } from "@/components/ui/search-select";

import { formatCurrency, formatDate } from "@/utils/finance/helpers";
import { cleanPersonName, normalizePersonKey } from "@/utils/ofx/cleanOfxFields";
import { LAUNCHES_PATH } from "@/utils/navigation";

export default function OfxImport() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const isDarkMode = theme === "dark";
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

	const inputContainerStyle = { borderColor: colors.borderStrong, backgroundColor: colors.surface };

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

	if (!session) {
		return <Box style={{ flex: 1, backgroundColor: colors.screen }} />;
	}

	return (
		<Box style={{ flex: 1, backgroundColor: colors.screen }}>
			<ScrollView
				contentContainerStyle={{ flexGrow: 1, padding: 12, paddingBottom: insets.bottom + 100 }}
				keyboardShouldPersistTaps="handled"
			>
				{importing ? (
					<VStack className="items-center justify-center gap-3" style={{ flex: 1, minHeight: 320 }}>
						<ActivityIndicator color={colors.textPrimary} />
						<Text style={{ color: colors.textSecondary }}>Importando...</Text>
					</VStack>
				) : (
					<VStack className="gap-3">
						<HStack
							className="items-center gap-3 rounded-xl border p-3"
							style={{ backgroundColor: colors.surface, borderColor: colors.border }}
						>
							<Box
								className="rounded-full items-center justify-center"
								style={{ width: 34, height: 34, backgroundColor: bank?.cor_hex || "#6B7280" }}
							>
								{isCredit ? <CreditCard size={17} color="#FFF" /> : <Landmark size={17} color="#FFF" />}
							</Box>
							<VStack className="flex-1">
								<Text className="font-semibold" style={{ color: colors.textPrimary }}>
									{bank?.nome}
								</Text>
								<Text className="text-xs" style={{ color: colors.textSecondary }}>
									{isCredit ? "Fatura de cartão" : "Extrato de conta"} • {selectedCount}/{items.length} selecionados
								</Text>
							</VStack>
							<HStack className="gap-3">
								<Pressable onPress={() => setAll(true)}>
									<Text className="text-xs font-semibold" style={{ color: colors.textPrimary }}>
										Todos
									</Text>
								</Pressable>
								<Pressable onPress={() => setAll(false)}>
									<Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
										Nenhum
									</Text>
								</Pressable>
							</HStack>
						</HStack>

						{items.map((item) => {
							const isPagar = Number(item.amount) < 0;
							const accent = isPagar ? "#DC2626" : "#16A34A";
							const catName = categoryNameById(item.id_categoria);
							return (
								<Box
									key={item.key}
									className="rounded-xl border overflow-hidden"
									style={{
										backgroundColor: colors.surface,
										borderColor: item.checked ? colors.borderStrong : colors.border,
										opacity: item.checked ? 1 : 0.5,
									}}
								>
									{/* Cabeçalho: seleção + data/badges + valor */}
									<HStack
										className="items-center gap-3 px-3 py-2"
										style={{ borderLeftWidth: 3, borderLeftColor: accent, backgroundColor: colors.surfaceMuted }}
									>
										<Pressable onPress={() => toggleItem(item.key)} hitSlop={8}>
											{item.checked ? (
												<CheckSquare size={22} color={colors.success ?? "#16A34A"} />
											) : (
												<Square size={22} color={colors.textSecondary} />
											)}
										</Pressable>
										<HStack className="items-center gap-2 flex-1 flex-wrap">
											<Text className="text-xs" style={{ color: colors.textSecondary }}>
												{formatDate(item.date)}
											</Text>
											{item.parcelaTotal ? (
												<Box className="rounded-full px-2 py-0.5" style={{ backgroundColor: colors.surface }}>
													<Text className="text-[10px] font-semibold" style={{ color: colors.textSecondary }}>
														{item.parcelaAtual}/{item.parcelaTotal}
													</Text>
												</Box>
											) : null}
											{item.duplicate ? (
												<Text className="text-[11px] font-semibold" style={{ color: "#F59E0B" }}>
													Duplicado
												</Text>
											) : item.matched ? (
												<Text className="text-[11px] font-semibold" style={{ color: "#F59E0B" }}>
													Já lançado
												</Text>
											) : null}
										</HStack>
										<Text className="text-base font-bold" style={{ color: accent }}>
											{formatCurrency(Math.abs(Number(item.amount || 0)))}
										</Text>
									</HStack>

									{/* Corpo: descrição / pessoa / categoria */}
									<VStack className="gap-2 px-3 py-2.5">
										<VStack className="gap-1">
											<Text className="text-[11px] font-medium" style={{ color: colors.textSecondary }}>
												Descrição
											</Text>
											<Input variant="outline" size="sm" style={inputContainerStyle}>
												<InputField
													value={item.descricao}
													onChangeText={(t) => setItemField(item.key, "descricao", t)}
													placeholder="Descrição"
													style={{ color: colors.textPrimary }}
												/>
											</Input>
										</VStack>

										<SearchableSelect
											label="Pessoa"
											value={item.pessoa}
											onChange={(v) => setItemField(item.key, "pessoa", v)}
											options={pessoaOptions}
											placeholder="Selecionar pessoa"
											searchPlaceholder="Pesquisar pessoa..."
											Icon={UserRound}
											inputContainerStyle={inputContainerStyle}
											themeColors={colors}
											isDarkMode={isDarkMode}
											autoFocusSearch
											fixedHeight={false}
											allowCreateOption
											getCreateLabel={(v) => `Criar pessoa "${v}"`}
										/>

										<Pressable onPress={() => setCatSheet({ open: true, key: item.key })}>
											<HStack
												className="items-center gap-1.5 rounded-lg border px-3 py-2 self-start"
												style={{ borderColor: colors.border }}
											>
												<Tag size={14} color={colors.textSecondary} />
												<Text
													className="text-xs"
													style={{ color: catName ? colors.textPrimary : colors.textSecondary }}
												>
													{catName || "Categoria"}
												</Text>
											</HStack>
										</Pressable>
									</VStack>
								</Box>
							);
						})}
					</VStack>
				)}
			</ScrollView>

			<Box
				className="flex-row gap-2 border-t px-3 pt-3"
				style={{ borderColor: colors.border, backgroundColor: colors.surface, paddingBottom: insets.bottom + 8 }}
			>
				<Button action="secondary" variant="outline" className="flex-1" onPress={goBack} isDisabled={importing}>
					<ButtonText>Cancelar</ButtonText>
				</Button>
				<Button className="flex-1" onPress={handleImport} isDisabled={selectedCount === 0 || importing}>
					<ButtonText>Importar ({selectedCount})</ButtonText>
				</Button>
			</Box>

			<SearchableSelectSheet
				isOpen={catSheet.open}
				onClose={() => setCatSheet({ open: false, key: null })}
				onSelect={(id) => {
					if (catSheet.key != null) setItemField(catSheet.key, "id_categoria", Number(id));
				}}
				options={categoryOptions}
				searchPlaceholder="Buscar categoria..."
				themeColors={colors}
				autoFocusSearch
				fixedHeight={false}
			/>
		</Box>
	);
}
