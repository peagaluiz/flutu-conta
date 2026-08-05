import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { Alert } from "@/utils/alert";
import { useAuth } from "@/state/AuthContext";
import { useInsertSavedTick } from "@/state/InsertModalContext";

import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { useDatabase } from "@/hooks/useDatabase";
import { Text } from "@/components/ui/text";
import { DataTable } from "@/components/ui/data-table";
import { Box } from "@/components/ui/box";
import { AnimatedHeight } from "@/components/ui/AnimatedHeight";

import { getDescricao } from "@/utils/finance/getDescricao";
import { getSectionConfig } from "@/utils/auth/launches/sections";
import { invalidateRecurrenceReadModel } from "@/services/database/recurrenceWeb";

import { useLaunchesData } from "@/components/auth/launches/useLaunchesData";
import { useLaunchesEditor } from "@/components/auth/launches/useLaunchesEditor";
import { useLaunchesFilters } from "@/components/auth/launches/useLaunchesFilters";
import { useLaunchesSelection } from "@/components/auth/launches/useLaunchesSelection";
import LaunchesModals from "@/components/auth/launches/LaunchesModals";

import LaunchesWebTabs from "./LaunchesWebTabs";
import { getLaunchesWebColumns } from "./launchesWebColumns";
import { getRecorrenciasWebColumns } from "./recorrenciasWebColumns";
import { QuickFilterBar } from "./QuickFilterBar";
import { TableSkeleton } from "./TableSkeleton";
import { ExpandedObservacao } from "./ExpandedObservacao";
import { LaunchesWebActionModals } from "./LaunchesWebActionModals";
import { useRecorrenciasWeb } from "./useRecorrenciasWeb";

export { TableSkeleton };

const EMPTY_TEXTS = {
    transacoes: "Nenhum lançamento encontrado.",
    pessoas: "Nenhuma pessoa encontrada.",
    bancos: "Nenhum banco encontrado.",
    imobilizados: "Nenhum ativo encontrado.",
};

// Ordenação padrão da tabela: pendentes primeiro, depois vencimento mais
// próximo, depois maior valor
function defaultRowOrder(a, b) {
    const pagoA = a.status === "pago" ? 1 : 0;
    const pagoB = b.status === "pago" ? 1 : 0;
    if (pagoA !== pagoB) return pagoA - pagoB;
    const dataA = String(a.data_vencimento || "9999-12-31");
    const dataB = String(b.data_vencimento || "9999-12-31");
    if (dataA !== dataB) return dataA < dataB ? -1 : 1;
    return Number(b.valor || 0) - Number(a.valor || 0);
}

export default function LaunchesWebScreen() {
    const { theme } = useTheme();
    const colors = getThemeColors(theme);
    const database = useDatabase();
	const { family, userData, familyReady } = useAuth();

    const [section, setSection] = useState("transacoes");
    const [quickFilter, setQuickFilter] = useState("todos");
    const [search, setSearch] = useState("");
    const [ofxModalOpen, setOfxModalOpen] = useState(false);
    const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
    const [viewItem, setViewItem] = useState(null);
    const [refreshTick, setRefreshTick] = useState(0);

    const {
        activeFilters,
        filterActive,
        searchText,
        setSearchText,
        localHighlightId,
        highlightTs,
        setHighlightDateOverride,
        filterOpen,
        setFilterOpen,
    } = useLaunchesFilters();

    useEffect(() => {
        if (localHighlightId) {
            setSection("transacoes");
            setQuickFilter("todos");
            setSearch("");
        }
    }, [localHighlightId]);

    const {
        validItems,
        loading,
        loadingMore,
        loadData,
        onRefresh,
        handleLoadMore,
        deleteItem,
        syncPessoa,
        darBaixa,
        darBaixaBulk,
        removerBaixaBulk,
        deleteItemsBulk,
	} = useLaunchesData({ database, section, family, userData, filters: activeFilters, ready: familyReady });

    // Recarrega ao voltar de fluxos que alteram dados (ex.: importação OFX navega com highlightTs)
    useEffect(() => {
        if (highlightTs) loadData(section);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [highlightTs]);

    // Recarrega após um salvamento/baixa/edição (modal ou operações da tabela).
    // Silencioso: atualiza os itens sem skeleton, mantendo a ordenação atual.
    const savedTick = useInsertSavedTick();
    useEffect(() => {
        if (savedTick) {
            invalidateRecurrenceReadModel();
            loadData(section, { silent: true, page: 1 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedTick]);

    const editor = useLaunchesEditor({ database, section, family, userData, loadData });

    const selection = useLaunchesSelection({
        section,
        validItems,
        deleteItemsBulk,
        darBaixaBulk,
        removerBaixaBulk,
    });

    const rows = useMemo(() => {
        if (section !== "transacoes") return validItems;
        let list = validItems;
        if (quickFilter === "pagar") list = list.filter((item) => item.tipo === "pagar");
        else if (quickFilter === "receber") list = list.filter((item) => item.tipo === "receber");
        else if (quickFilter === "pendentes") list = list.filter((item) => item.status !== "pago");
        const q = search.toLowerCase().trim();
        if (q) {
            list = list.filter(
                (item) =>
                    String(item.pessoa || getDescricao(item) || "").toLowerCase().includes(q) ||
                    String(item.categoria || "").toLowerCase().includes(q)
            );
        }
        return [...list].sort(defaultRowOrder);
    }, [validItems, section, quickFilter, search]);

    const columns = useMemo(
        () =>
            getLaunchesWebColumns(section, {
                colors,
                onDarBaixa: darBaixa,
                onEdit: editor.openEdit,
                onDelete: deleteItem,
                onSyncPessoa: syncPessoa,
                onView: setViewItem,
            }),
        [section, colors, darBaixa, editor.openEdit, deleteItem, syncPessoa]
    );

    const config = useMemo(() => getSectionConfig(section), [section]);
    const getRowId = useCallback(
        (item) => item?.[config.idKey] ?? item?.nome ?? item?.descricao ?? item?.codigo,
        [config.idKey]
    );
    const isRowSelectable = useCallback((item) => !item?.is_ghost, []);

    const handleTogglePage = useCallback(
        (pageItems, select) => {
            pageItems.forEach((item) => {
                const has = selection.selectedIds.has(item.id_transacao);
                if (has !== select) selection.handleToggleSelect(item);
            });
        },
        [selection.selectedIds, selection.handleToggleSelect]
    );

    const renderExpandedRow = useCallback(
        (item) => <ExpandedObservacao text={getDescricao(item)} colors={colors} />,
        [colors]
    );

    const selectedCount = selection.selectedIds.size;
    const allHaveBaixa =
        selection.selectedItems.length > 0 &&
        selection.selectedItems.every((item) => !!item.data_baixa);

    const closeBulkActions = useCallback(() => setBulkActionsOpen(false), []);

    const handleBulkBaixaPress = useCallback(() => {
        closeBulkActions();
        if (allHaveBaixa) selection.handleBulkRemoverBaixa();
        else selection.setBaixaDateModalOpen(true);
    }, [allHaveBaixa, closeBulkActions, selection.handleBulkRemoverBaixa, selection.setBaixaDateModalOpen]);

    const handleBulkDeletePress = useCallback(() => {
        closeBulkActions();
        Alert.alert("Excluir", `Deseja excluir ${selectedCount} item(s)?`, [
            { text: "Cancelar", style: "cancel" },
            { text: "Excluir", style: "destructive", onPress: selection.handleBulkDelete },
        ]);
    }, [closeBulkActions, selectedCount, selection.handleBulkDelete]);

    const handleClearSelection = useCallback(() => {
        closeBulkActions();
        selection.clearSelection();
    }, [closeBulkActions, selection.clearSelection]);

    const handleRefresh = useCallback(() => {
        invalidateRecurrenceReadModel();
        setRefreshTick((tick) => tick + 1);
        onRefresh();
    }, [onRefresh]);

    const recorrenciasColumns = useMemo(() => getRecorrenciasWebColumns(colors), [colors]);
    const { recorrencias, loading: recorrenciasLoading } = useRecorrenciasWeb({
        database,
        section,
        userData,
        family,
        familyReady,
        reloadKey: `${savedTick}|${refreshTick}`,
    });

    return (
        <View style={{ flex: 1, backgroundColor: colors.screen }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                    flexGrow: 1,
                    paddingHorizontal: 20,
                    paddingTop: 20,
                    paddingBottom: 40,
                }}
            >
                <Box style={{ width: "100%", gap: 16 }}>
                    <LaunchesWebTabs
                        section={section}
                        onSectionChange={setSection}
                        colors={colors}
                        searchText={search}
                        onSearchChange={setSearch}
                        onFilter={() => {
                            setHighlightDateOverride(false);
                            setFilterOpen(true);
                        }}
                        filterActive={filterActive}
                        onImportOfx={() => setOfxModalOpen(true)}
                        onRefresh={handleRefresh}
                        onCreate={editor.openCreate}
                    />

                    <Box
                        className="flex-1 rounded-xl border overflow-hidden"
                        style={{
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            overflow: "hidden",
                            position: "relative",
                            zIndex: 0,
                        }}
                    >
                        {section === "transacoes" ? (
                            <QuickFilterBar
                                quickFilter={quickFilter}
                                onChange={setQuickFilter}
                                colors={colors}
                            />
                        ) : null}
                        <AnimatedHeight>
                            {loading ? (
                                <TableSkeleton />
                            ) : (
                                <DataTable
                                    columns={columns}
                                    data={rows}
                                    getRowId={getRowId}
                                    colors={colors}
                                    pageResetKey={`${section}|${quickFilter}|${search}`}
                                    sortResetKey={`${section}|${refreshTick}`}
                                    selectable={section === "transacoes"}
                                    selectedIds={selection.selectedIds}
                                    isRowSelectable={isRowSelectable}
                                    onToggleRow={selection.handleToggleSelect}
                                    onTogglePage={handleTogglePage}
                                    onOpenBulkActions={
                                        section === "transacoes"
                                            ? () => setBulkActionsOpen(true)
                                            : undefined
                                    }
                                    expandable={section === "transacoes"}
                                    renderExpanded={renderExpandedRow}
                                    highlightId={section === "transacoes" ? localHighlightId : null}
                                    onEndReached={handleLoadMore}
                                    loadingMore={loadingMore}
                                    emptyText={EMPTY_TEXTS[section]}
                                />
                            )}
                        </AnimatedHeight>
                    </Box>

                    {section === "transacoes" ? (
                        <Box style={{ gap: 8 }}>
                            <Box className="gap-0.5">
                                <Text
                                    className="text-lg font-bold"
                                    style={{ color: colors.textPrimary }}
                                >
                                    Recorrentes
                                </Text>
                                <Text className="text-xs" style={{ color: colors.textSecondary }}>
                                    Regras de recorrência (edição e baixa no app do celular).
                                </Text>
                            </Box>
                            <Box
                                className="rounded-xl border overflow-hidden"
                                style={{
                                    backgroundColor: colors.surface,
                                    borderColor: colors.border,
                                    overflow: "hidden",
                                }}
                            >
                                {recorrenciasLoading ? (
                                    <TableSkeleton />
                                ) : (
                                    <DataTable
                                        columns={recorrenciasColumns}
                                        data={recorrencias}
                                        getRowId={(item) => item.id_recurrencia}
                                        colors={colors}
                                        pageResetKey="recorrencias"
                                        sortResetKey={`recorrencias|${refreshTick}`}
                                        pageSizeControl={false}
                                        selectable={false}
                                        emptyText="Nenhuma recorrência."
                                    />
                                )}
                            </Box>
                        </Box>
                    ) : null}
                </Box>
            </ScrollView>

            <LaunchesWebActionModals
                colors={colors}
                bulkOpen={bulkActionsOpen}
                onCloseBulk={closeBulkActions}
                selectedCount={selectedCount}
                allHaveBaixa={allHaveBaixa}
                onBaixa={handleBulkBaixaPress}
                onDelete={handleBulkDeletePress}
                onClearSelection={handleClearSelection}
                viewItem={viewItem}
                onCloseView={() => setViewItem(null)}
            />

            <LaunchesModals
                editor={editor}
                section={section}
                family={family}
                userData={userData}
                colors={colors}
                desktop
                searchText={searchText}
                onApplySearch={setSearchText}
                showFilterSearch={false}
                filterOpen={filterOpen}
                onCloseFilter={() => setFilterOpen(false)}
                baixaDateModalOpen={selection.baixaDateModalOpen}
                onCloseBaixaDate={() => selection.setBaixaDateModalOpen(false)}
                onApplyBaixaDate={selection.handleBulkDarBaixa}
                ofxModalOpen={ofxModalOpen}
                onCloseOfx={() => setOfxModalOpen(false)}
            />
        </View>
    );
}
