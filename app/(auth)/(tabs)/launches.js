import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, RefreshControl, Switch } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, FileText } from "lucide-react-native";
import { useAuth } from "@/state/AuthContext";

import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { useDatabase } from "@/services/database/useDatabase";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { Pressable } from "@/components/ui/pressable";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText, ButtonIcon } from "@/components/ui/button";
import Loader from "@/components/ui/loader";

import {
    BLOCKS,
    getSectionConfig,
    getItemType,
} from "@/utils/auth/launches/sections";
import { loadSectionData } from "@/utils/auth/launches/loaders";
import { getDeleteAction, getItemKey, filterValidItems } from "@/utils/auth/launches/actions";

import LaunchesSkeleton from "@/components/auth/launches/LaunchesSkeleton";
import SectionButton from "@/components/auth/launches/SectionButton";
import TransacaoCard from "@/components/auth/launches/TransacaoCard";
import PessoaCard from "@/components/auth/launches/PessoaCard";
import ImobilizadoCard from "@/components/auth/launches/ImobilizadoCard";
import RecorrenciaCard from "@/components/auth/launches/RecorrenciaCard";

export default function Launches() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const colors = getThemeColors(theme);
    const database = useDatabase();
    const { family, userData } = useAuth();

    const [section, setSection] = useState("transacoes");
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editorMode, setEditorMode] = useState("create");
    const [editingItem, setEditingItem] = useState(null);
    const [editorValue, setEditorValue] = useState("");
    const [selectedPessoaId, setSelectedPessoaId] = useState(null);
    const [pessoaOptions, setPessoaOptions] = useState([]);
    const [savingEditor, setSavingEditor] = useState(false);
    const [shareWithFamily, setShareWithFamily] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const loadRef = useRef(0);
    const config = useMemo(() => getSectionConfig(section), [section]);
    const PAGE_SIZE = 30;

    const closeEditor = useCallback(() => {
        setEditorOpen(false);
        setEditorMode("create");
        setEditingItem(null);
        setEditorValue("");
        setSelectedPessoaId(null);
        setPessoaOptions([]);
        setShareWithFamily(false);
    }, []);

    const loadPessoaOptions = useCallback(async () => {
        try {
            const rows = await database.listPessoas();
            setPessoaOptions(Array.isArray(rows) ? rows : []);
        } catch {
            setPessoaOptions([]);
        }
    }, [database]);

    const loadData = useCallback(
        async (target, { silent = false, append = false, page: pageToLoad = 1 } = {}) => {
            const id = ++loadRef.current;
            const sectionTarget = target ?? section;
            const visibilityArgs = {
                userId: userData?.id ?? null,
                familyId: family?.id ? Number(family.id) : null,
                visibilityScope: family?.id ? "all" : "mine",
            };

            try {
                if (sectionTarget === "transacoes") {
                    if (append) {
                        setLoadingMore(true);
                    } else if (!silent) {
                        setLoading(true);
                        setItems([]);
                        setHasMore(true);
                    }

                    const rows = await loadSectionData(database, sectionTarget, {
                        page: pageToLoad,
                        limit: PAGE_SIZE,
                        ...visibilityArgs,
                    });

                    if (id === loadRef.current) {
                        const nextRows = Array.isArray(rows) ? rows : [];
                        setItems((current) => (append ? [...current, ...nextRows] : nextRows));
                        setPage(pageToLoad);
                        setHasMore(nextRows.length === PAGE_SIZE);
                    }
                } else {
                    if (!silent) {
                        setLoading(true);
                        setItems([]);
                    }

                    const rows = await loadSectionData(database, sectionTarget, visibilityArgs);

                    if (id === loadRef.current) {
                        setItems(Array.isArray(rows) ? rows : []);
                    }
                }
            } catch {
                if (id === loadRef.current) {
                    setItems([]);
                }
            } finally {
                if (!silent && !append && id === loadRef.current) {
                    setLoading(false);
                }
                if (append && id === loadRef.current) {
                    setLoadingMore(false);
                }
            }
        },
        [database, family?.id, section, userData?.id]
    );
    useEffect(() => {
        setPage(1);
        setHasMore(true);
        setLoadingMore(false);
        loadData(section);
    }, [section, loadData]);

    useEffect(() => {
        if (editorOpen && section === "pessoas") {
            loadPessoaOptions();
        }
    }, [editorOpen, loadPessoaOptions, section]);

    useEffect(() => {
        closeEditor();
    }, [closeEditor, section]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);

        try {
            await database.syncAllPendingData({ force: true });
            setPage(1);
            setHasMore(true);
            await loadData(section, { silent: true, page: 1 });
        } catch {
            // mantém a tela responsiva
        } finally {
            setRefreshing(false);
        }
    }, [database, loadData, section]);

    const openCreate = useCallback(() => {
        if (section === "transacoes" || section === "recorrencias") {
            router.push("/(auth)/(stack)/insert");
            return;
        }

        setEditorMode("create");
        setEditingItem(null);
        setEditorValue("");
        setShareWithFamily(false);
        setSelectedPessoaId(null);
        setEditorOpen(true);
    }, [router, section]);

    const openEdit = useCallback((item) => {
        const itemType = getItemType(item);

        if (itemType === "transacoes") {
            router.replace({
                pathname: "/(auth)/(stack)/insert",
                params: { id_transacao: String(item.id_transacao) },
            });
            return;
        }

        setEditorMode("edit");
        setEditingItem(item);
        setEditorValue(itemType === "pessoas" ? String(item?.nome || "") : String(item?.descricao || item?.codigo || ""));
        setSelectedPessoaId(null);
        setEditorOpen(true);
    }, [router]);

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
            if (section === "pessoas") {
                const isPendingPessoa = Number(editingItem?.is_pending || 0) === 1;

                if (isPendingPessoa) {
                    if (selectedPessoaId) {
                        await database.relinkTransacoesPessoaPendente({
                            pendingName: String(editingItem?.nome || nextValue),
                            pendingTransactionIds: editingItem?.pending_ids,
                            targetPessoaId: selectedPessoaId,
                        });
                    } else {
                        await database.syncPessoaPendente(nextValue, editingItem?.pending_ids);
                    }
                } else if (editorMode === "edit" && editingItem?.id_pessoa) {
                    await database.updatePessoaAndRelinkTransacoes(
                        editingItem.id_pessoa,
                        String(editingItem?.nome || ""),
                        nextValue
                    );
                } else {
                    await database.syncPessoaPendente(nextValue, undefined, undefined, {
                        userId: userData?.id ?? null,
                        familyId: family?.id ? Number(family.id) : null,
                        isFamilyShared: Boolean(shareWithFamily && family?.id),
                    });
                }

                await loadData("pessoas");
                closeEditor();
                return;
            }

            if (section === "imobilizados") {
                if (editorMode === "edit" && editingItem?.id_imobilizado) {
                    await database.updateImobilizado(editingItem.id_imobilizado, nextValue);
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

    const deleteItem = useCallback((item) => {
        const itemType = getItemType(item);
        const deleteAction = itemType ? getDeleteAction(database, itemType) : null;

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
    }, [database, loadData, section]);

    const syncPessoa = useCallback(async (item) => {
        try {
            await database.syncPessoaPendente(item.nome, item.pending_ids);
            await loadData("pessoas", { silent: true });
        } catch {
            Alert.alert("Erro", "Falha ao sincronizar.");
        }
    }, [database, loadData]);

    const validItems = useMemo(
        () => filterValidItems(items, section),
        [items, section]
    );

    const handleLoadMore = useCallback(() => {
        if (section !== "transacoes") return;
        if (loading || loadingMore || !hasMore) return;
        loadData(section, { silent: true, append: true, page: page + 1 });
    }, [hasMore, loadData, loading, loadingMore, page, section]);

    const toggleRecorrenciaStatus = useCallback(async (item) => {
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
    }, [database, loadData]);

    const renderCard = useCallback((item, index) => {
        const key = String(getItemKey(item, index));
        const itemType = getItemType(item);

        if (itemType === "transacoes") {
            return (
                <TransacaoCard
                    key={key}
                    item={item}
                    colors={colors}
                    onEdit={() => openEdit(item)}
                    onDelete={() => deleteItem(item)}
                />
            );
        }


        if (itemType === "pessoas") {
            const pending = Number(item?.is_pending || 0) === 1;

            return (
                <PessoaCard
                    key={key}
                    item={item}
                    colors={colors}
                    onEdit={() => openEdit(item)}
                    onDelete={() => deleteItem(item)}
                    onSync={() => pending ? syncPessoa(item) : null}
                />
            );
        }

        if (itemType === "imobilizados") {
            return (
                <ImobilizadoCard
                    key={key}
                    item={item}
                    colors={colors}
                    onEdit={() => openEdit(item)}
                    onDelete={() => deleteItem(item)}
                />
            );
        }

        if (itemType === "recorrencias") {
            return (
                <RecorrenciaCard
                    key={key}
                    item={item}
                    colors={colors}
                    onToggleStatus={() => toggleRecorrenciaStatus(item)}
                    onDelete={() => deleteItem(item)}
                />
            );
        }

        return null;
    }, [colors, deleteItem, openEdit, syncPessoa, toggleRecorrenciaStatus]);

    return (
        <Box style={{ flex: 1, backgroundColor: colors.screen }}>
            <FlatList
                contentContainerStyle={{
                    flexGrow: 1,
                    paddingHorizontal: 12,
                    paddingTop: 12,
                    paddingBottom: insets.bottom + 96,
                }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                data={validItems}
                keyExtractor={(item, index) => String(getItemKey(item, index))}
                renderItem={({ item, index }) => renderCard(item, index)}
                ItemSeparatorComponent={() => <Box style={{ height: 10 }} />}
                ListHeaderComponent={
                    <Box className="gap-4 pb-4">
                        <Box
                            className="h-[145px] gap-2 rounded-3xl border p-4"
                            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                        >
                            <VStack>
                                <Text className="text-xl font-semibold" style={{ color: colors.textPrimary }}>
                                    Gerencie tudo aqui...
                                </Text>
                            </VStack>

                            <HStack className="gap-2 pt-2">
                                {BLOCKS.map((block) => (
                                    <SectionButton
                                        key={block.key}
                                        active={section === block.key}
                                        label={block.label}
                                        icon={block.icon}
                                        colors={colors}
                                        onPress={() => setSection(block.key)}
                                    />
                                ))}
                            </HStack>
                        </Box>

                        <Box
                            className="gap-2 rounded-2xl border p-4"
                            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                        >
                            <HStack className="items-center justify-between" style={{ width: "100%" }}>
                                <HStack className="items-center gap-2">
                                    <FileText size={18} color={colors.textPrimary} />
                                    <Text className="font-semibold" style={{ color: colors.textPrimary }}>
                                        {config.title}
                                    </Text>
                                </HStack>

                                <Button size="sm" onPress={openCreate}>
                                    <ButtonIcon as={Plus} />
                                    <ButtonText>Novo</ButtonText>
                                </Button>
                            </HStack>
                        </Box>
                    </Box>
                }
                ListEmptyComponent={
                    loading ? (
                        <Box className="gap-4">
                            <LaunchesSkeleton />
                        </Box>
                    ) : (
                        <Box className="gap-4">
                            <Box className="rounded-2xl border p-5" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                                <Text style={{ color: colors.textSecondary }}>Nenhum registro encontrado.</Text>
                            </Box>
                        </Box>
                    )
                }
                ListFooterComponent={
                    section === "transacoes" && loadingMore ? (
                        <Box className="py-4">
                            <Loader />
                        </Box>
                    ) : null
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.4}
            />

            <Modal isOpen={editorOpen} onClose={closeEditor} size="md">
                <ModalBackdrop />
                <ModalContent>
                    <ModalHeader>
                        <Text className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                            {editorMode === "edit" ? "Editar" : "Novo"} {section === "pessoas" ? "pessoa" : "imobilizado"}
                        </Text>
                    </ModalHeader>

                    <ModalBody>
                        <VStack className="gap-3">
                            <Text style={{ color: colors.textSecondary }}>
                                {section === "pessoas"
                                    ? Number(editingItem?.is_pending || 0) === 1
                                        ? "Corrija o texto ou vincule a uma pessoa cadastrada"
                                        : "Nome da pessoa"
                                    : "Nome do imobilizado"}
                            </Text>

                            <Input
                                variant="outline"
                                style={{ borderColor: colors.border, backgroundColor: colors.surface }}
                            >
                                <InputField
                                    value={editorValue}
                                    onChangeText={setEditorValue}
                                    placeholder={section === "pessoas" ? "Ex: João" : "Ex: Computador do escritório"}
                                    style={{ color: colors.textPrimary }}
                                />
                            </Input>

                            {section === "pessoas" && Number(editingItem?.is_pending || 0) === 1 && pessoaOptions.length ? (
                                <VStack className="gap-2">
                                    <Text className="text-xs" style={{ color: colors.textSecondary }}>
                                        Ou vincule a uma pessoa já cadastrada
                                    </Text>

                                    <VStack className="max-h-48 gap-2">
                                        {pessoaOptions.slice(0, 8).map((pessoa) => {
                                            const active = Number(selectedPessoaId) === Number(pessoa.id_pessoa);

                                            return (
                                                <Pressable key={String(pessoa.id_pessoa)} onPress={() => selectPessoaOption(pessoa)}>
                                                    <Box
                                                        className="rounded-xl border px-3 py-2"
                                                        style={{
                                                            borderColor: active ? colors.textPrimary : colors.border,
                                                            backgroundColor: active ? colors.surfaceMuted : colors.surface,
                                                        }}
                                                    >
                                                        <Text style={{ color: colors.textPrimary }}>{pessoa.nome}</Text>
                                                    </Box>
                                                </Pressable>
                                            );
                                        })}
                                    </VStack>
                                </VStack>
                            ) : null}

                            {editorMode === "create" && family?.id ? (
                                <Box className="mt-1 mb-1 rounded-xl px-3 py-3" style={{ backgroundColor: colors.surfaceMuted }}>
                                    <Box className="flex-row items-center justify-between">
                                        <Box className="flex-1 pr-3">
                                            <Text className="font-semibold" style={{ color: colors.textPrimary }}>
                                                Compartilhar com a família
                                            </Text>
                                            <Text size="sm" style={{ color: colors.textSecondary }}>
                                                Se ativado, este cadastro ficará visível para os membros da família.
                                            </Text>
                                        </Box>
                                        <Switch
                                            value={shareWithFamily}
                                            onValueChange={setShareWithFamily}
                                            trackColor={{ false: colors.borderStrong, true: colors.success }}
                                            thumbColor={colors.surface}
                                        />
                                    </Box>
                                </Box>
                            ) : null}
                        </VStack>
                    </ModalBody>

                    <ModalFooter>
                        <Button action="secondary" variant="outline" onPress={closeEditor} isDisabled={savingEditor}>
                            <ButtonText>Cancelar</ButtonText>
                        </Button>
                        <Button onPress={saveEditor} isDisabled={savingEditor}>
                            <ButtonText>{savingEditor ? "Salvando..." : "Salvar"}</ButtonText>
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box>
    );
}