import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, View } from "react-native";
import { useAuth } from "@/state/AuthContext";
import { useInsertSavedTick } from "@/state/InsertModalContext";

import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { useDatabase } from "@/hooks/useDatabase";
import { Text } from "@/components/ui/text";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Box } from "@/components/ui/box";

import { getDescricao } from "@/utils/finance/getDescricao";
import { getSectionConfig } from "@/utils/auth/launches/sections";
import { invalidateRecurrenceReadModel } from "@/services/database/recurrenceWeb";

import { useLaunchesData } from "@/components/auth/launches/useLaunchesData";
import { useLaunchesEditor } from "@/components/auth/launches/useLaunchesEditor";
import { useLaunchesFilters } from "@/components/auth/launches/useLaunchesFilters";
import { useLaunchesSelection } from "@/components/auth/launches/useLaunchesSelection";
import LaunchesModals from "@/components/auth/launches/LaunchesModals";
import { LaunchesBulkActions } from "@/components/auth/launches/LaunchesBulkActions";

import LaunchesWebTabs from "./LaunchesWebTabs";
import { getLaunchesWebColumns } from "./launchesWebColumns";
import { getRecorrenciasWebColumns } from "./recorrenciasWebColumns";

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

const QUICK_FILTERS = [
    { key: "todos", label: "Todos" },
    { key: "pagar", label: "A pagar" },
    { key: "receber", label: "A receber" },
    { key: "pendentes", label: "Pendentes" },
];

function QuickFilterBar({ quickFilter, onChange, count, colors }) {
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
            }}
        >
            {QUICK_FILTERS.map((filter) => {
                const active = quickFilter === filter.key;
                return (
                    <Pressable
                        key={filter.key}
                        onPress={() => onChange(filter.key)}
                        style={({ hovered }) => ({
                            height: 30,
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 1,
                            borderColor: active ? colors.textPrimary : colors.border,
                            backgroundColor: active
                                ? colors.textPrimary
                                : hovered
                                    ? colors.surfaceMuted
                                    : "transparent",
                        })}
                    >
                        <Text
                            className="text-xs font-medium"
                            style={{ color: active ? colors.surface : colors.textSecondary }}
                        >
                            {filter.label}
                        </Text>
                    </Pressable>
                );
            })}
            <View style={{ flex: 1 }} />
            <Text className="text-xs" style={{ color: colors.textSecondary }}>
                {count} resultado{count === 1 ? "" : "s"}
            </Text>
        </View>
    );
}

export function TableSkeleton() {
    return (
        <View style={{ flex: 1 }}>
            <Skeleton
                style={{
                    width: "100%",
                    height: 42,
                    borderRadius: 0,
                }}
            />

            <View style={{ paddingHorizontal: 8 }}>
                <View
                    style={{
                        height: 52,
                        justifyContent: "center",
                    }}
                >
                    <SkeletonText
                        _lines={1}
                        style={{
                            width: "100%",
                            height: 16,
                            borderRadius: 4,
                        }}
                    />
                </View>

                <View
                    style={{
                        height: 52,
                        flexDirection: "row",
                        alignItems: "center",
                    }}
                >
                    <View style={{ flex: 2, paddingRight: 6 }}>
                        <SkeletonText
                            _lines={1}
                            style={{
                                width: "100%",
                                height: 16,
                                borderRadius: 4,
                            }}
                        />
                    </View>

                    <View style={{ flex: 1, paddingLeft: 6 }}>
                        <SkeletonText
                            _lines={1}
                            style={{
                                width: "100%",
                                height: 16,
                                borderRadius: 4,
                            }}
                        />
                    </View>
                </View>
            </View>

            <Skeleton
                style={{
                    width: "100%",
                    height: 43,
                    marginTop: 8,
                    borderRadius: 0,
                }}
            />
        </View>
    );
}

function AnimatedHeight({ children, duration = 280 }) {
    const heightAnim = useRef(new Animated.Value(0)).current;
    const currentHeight = useRef(0);
    const measured = useRef(false);
    const [ready, setReady] = useState(false);

    const onLayout = useCallback(
        (e) => {
            const h = e.nativeEvent.layout.height;
            if (!h || h === currentHeight.current) return;
            const grew = measured.current && h > currentHeight.current;
            currentHeight.current = h;
            if (grew) {
                Animated.timing(heightAnim, {
                    toValue: h,
                    duration,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: false,
                }).start();
            } else {
                // Encolher (ex.: entrar no skeleton) é instantâneo
                heightAnim.setValue(h);
                if (!measured.current) {
                    measured.current = true;
                    setReady(true);
                }
            }
        },
        [heightAnim, duration]
    );

    return (
        <Animated.View style={{ height: ready ? heightAnim : undefined, overflow: "hidden" }}>
            <View onLayout={onLayout}>{children}</View>
        </Animated.View>
    );
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

    const [refreshTick, setRefreshTick] = useState(0);
    const handleRefresh = useCallback(() => {
        invalidateRecurrenceReadModel();
        setRefreshTick((tick) => tick + 1);
        onRefresh();
    }, [onRefresh]);

    // Segunda tabela "Recorrentes" (só leitura) abaixo das transações no web.
    const [recorrencias, setRecorrencias] = useState([]);
    const [recorrenciasLoading, setRecorrenciasLoading] = useState(false);
    const recorrenciasColumns = useMemo(() => getRecorrenciasWebColumns(colors), [colors]);
    // Só mostra skeleton ao (re)entrar na aba; refreshes por savedTick/refreshTick
    // atualizam a lista silenciosamente.
    const recSkeletonSectionRef = useRef(null);

    useEffect(() => {
		if (section !== "transacoes" || !familyReady || !userData?.id) return;
        let active = true;
        if (recSkeletonSectionRef.current !== section) {
            recSkeletonSectionRef.current = section;
            setRecorrenciasLoading(true);
        }
        database
            .listRecorrencias({
                userId: userData?.id ?? null,
                familyId: family?.id ?? null,
                visibilityScope: family?.id ? "all" : "mine",
            })
            .then((rows) => {
                if (active) setRecorrencias(Array.isArray(rows) ? rows : []);
            })
            .catch(() => {
                if (active) setRecorrencias([]);
            })
            .finally(() => {
                if (active) setRecorrenciasLoading(false);
            });
        return () => {
            active = false;
        };
	}, [section, database, userData?.id, family?.id, familyReady, savedTick, refreshTick]);

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

                    {selection.selectionMode && section === "transacoes" ? (
                        <LaunchesBulkActions
                            selectedIds={selection.selectedIds}
                            selectedItems={selection.selectedItems}
                            colors={colors}
                            onDelete={selection.handleBulkDelete}
                            onDarBaixa={() => selection.setBaixaDateModalOpen(true)}
                            onRemoverBaixa={selection.handleBulkRemoverBaixa}
                            onClear={selection.clearSelection}
                        />
                    ) : null}

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
                                count={rows.length}
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
                                    pageSize={8}
                                    pageResetKey={`${section}|${quickFilter}|${search}`}
                                    sortResetKey={`${section}|${refreshTick}`}
                                    selectable={section === "transacoes"}
                                    selectedIds={selection.selectedIds}
                                    isRowSelectable={isRowSelectable}
                                    onToggleRow={selection.handleToggleSelect}
                                    onTogglePage={handleTogglePage}
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
                                        pageSize={8}
                                        pageResetKey="recorrencias"
                                        sortResetKey={`recorrencias|${refreshTick}`}
                                        selectable={false}
                                        emptyText="Nenhuma recorrência."
                                    />
                                )}
                            </Box>
                        </Box>
                    ) : null}
                </Box>
            </ScrollView>

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
