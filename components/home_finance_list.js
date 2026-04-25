import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Platform, RefreshControl, ScrollView } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@/components/ui/modal";

import { useDatabase } from "@/services/database/useDatabase";
import { useAuth } from "@/state/AuthContext";
import { Box } from "@/components/ui/box";
import { ResumoFinanceiroCard } from "@/components/finance/home/ResumoFinanceiroCard";
import { HomeQuickActionsSection } from "@/components/finance/home/HomeQuickActionsSection";
import { HomeTransactionsSection } from "@/components/finance/home/HomeTransactionsSection";
import {
    buildInsertParams,
    buildDefaultHomeDateRange,
    buildQuickActions,
    calculateResumo,
    filterLancamentosByRange,
    formatHomeDateRangeLabel,
    getLatestLancamento,
} from "@/utils/finance/homeScreenHelpers";
import { toISODateString } from "@/utils/finance/helpers";

const VISIBILITY_OPTIONS = [
    { value: "all", label: "Todos" },
    { value: "mine", label: "Meus" },
    { value: "family", label: "Família" },
];

export default function HomeFinanceList() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const colors = getThemeColors(theme);
    const database = useDatabase();
    const { userData, family } = useAuth();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lancamentos, setLancamentos] = useState([]);
    const [showFilterSheet, setShowFilterSheet] = useState(false);
    const [filterType, setFilterType] = useState("all");
    const [visibilityScope, setVisibilityScope] = useState("all");
    const [dateRange, setDateRange] = useState(() => buildDefaultHomeDateRange());
    const [rangeSheetOpen, setRangeSheetOpen] = useState(false);
    const [rangePickerTarget, setRangePickerTarget] = useState(null);
    const bottomSpacing = insets.bottom + 96;
    const hasFamily = Number(family?.id || userData?.familyId || 0) > 0;
    const activeFamilyId = Number(family?.id || userData?.familyId || 0) || null;

    const ultimoLancamento = useMemo(() => getLatestLancamento(lancamentos), [lancamentos]);

    const ultimaCategoria = ultimoLancamento?.categoria?.trim() || "";
    const ultimoTipo = ultimoLancamento?.tipo === "receber" ? "receber" : "pagar";
    const todayISO = useMemo(() => toISODateString(new Date()), []);
    const dateRangeLabel = useMemo(
        () => formatHomeDateRangeLabel(dateRange.start, dateRange.end),
        [dateRange.end, dateRange.start]
    );

    const openInsert = useCallback((params = {}) => {
        router.push({
            pathname: "/(auth)/(stack)/insert",
            params: buildInsertParams(todayISO, params),
        });
    }, [router, todayISO]);

    const openRangeSheet = useCallback(() => {
        setRangeSheetOpen(true);
        setRangePickerTarget(null);
    }, []);

    const closeRangeSheet = useCallback(() => {
        setRangeSheetOpen(false);
        setRangePickerTarget(null);
    }, []);

    const openRangePicker = useCallback((target) => {
        setRangePickerTarget(target);
    }, []);

    const handleRangeDateChange = useCallback(
        (event, selectedDate) => {
            if (event?.type === "dismissed" || !selectedDate) {
                if (Platform.OS !== "ios") {
                    setRangePickerTarget(null);
                }
                return;
            }

            const nextValue = toISODateString(selectedDate);

            setDateRange((current) => {
                const next = { ...current, [rangePickerTarget]: nextValue };

                if (next.start > next.end) {
                    if (rangePickerTarget === "start") {
                        next.end = next.start;
                    } else {
                        next.start = next.end;
                    }
                }

                return next;
            });

            if (Platform.OS !== "ios") {
                setRangePickerTarget(null);
            }
        },
        [rangePickerTarget]
    );

    const quickActions = useMemo(
        () => buildQuickActions({ ultimaCategoria, ultimoTipo, onOpenInsert: openInsert }),
        [ultimaCategoria, ultimoTipo, openInsert]
    );

    const lancamentosFiltrados = useMemo(
        () => filterLancamentosByRange(lancamentos, filterType),
        [lancamentos, filterType]
    );

    const resumo = useMemo(() => calculateResumo(lancamentos), [lancamentos]);

    const loadLancamentos = useCallback(async (options = { silent: false }) => {
        const silent = !!options?.silent;
        try {
            if (!silent) {
                setLoading(true);
            }
            const data = await database.getTransacao(undefined, {
                dateFrom: dateRange.start,
                dateTo: dateRange.end,
                visibilityScope: hasFamily ? visibilityScope : "mine",
                userId: userData?.id ?? null,
                familyId: activeFamilyId,
            });
            setLancamentos(Array.isArray(data) ? data : []);
        } catch {
            setLancamentos([]);
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [activeFamilyId, database, dateRange.end, dateRange.start, hasFamily, userData?.id, visibilityScope]);

    useEffect(() => {
        let active = true;

        (async () => {
            try {
                setLoading(true);
                const data = await database.getTransacao(undefined, {
                    dateFrom: dateRange.start,
                    dateTo: dateRange.end,
                    visibilityScope: hasFamily ? visibilityScope : "mine",
                    userId: userData?.id ?? null,
                    familyId: activeFamilyId,
                });
                if (active) {
                    setLancamentos(Array.isArray(data) ? data : []);
                }
            } catch {
                if (active) {
                    setLancamentos([]);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            active = false;
        };
    }, [activeFamilyId, database, dateRange.end, dateRange.start, hasFamily, userData?.id, visibilityScope]);

    useEffect(() => {
        if (!hasFamily && visibilityScope !== "mine") {
            setVisibilityScope("mine");
        }
    }, [hasFamily, visibilityScope]);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await database.syncAllPendingData({ force: true });
            await loadLancamentos({ silent: true });
        } finally {
            setRefreshing(false);
        }
    };

    const handlePressItem = (item) => {
        router.replace({
            pathname: "/(auth)/(stack)/insert",
            params: { id_transacao: String(item.id_transacao) },
        });
    };

    return (
        <>
            <ScrollView
                style={{ backgroundColor: colors.screen }}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: bottomSpacing }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <Box className="gap-4 px-3 pt-3" style={{ minHeight: "100%" }}>
                    <ResumoFinanceiroCard
                        resumo={resumo}
                        name={userData?.nome}
                        dateRangeLabel={dateRangeLabel}
                        onPressFilter={openRangeSheet}
                    />
                    <HomeQuickActionsSection actions={quickActions} />
                    <Box className="rounded-xl border p-3" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                        <HStack className="items-center justify-between">
                            <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                                Visão da home
                            </Text>
                            <HStack className="gap-2">
                                {VISIBILITY_OPTIONS.filter((option) => (hasFamily ? true : option.value !== "family")).map((option) => {
                                    const active = option.value === visibilityScope;
                                    return (
                                        <Pressable key={option.value} onPress={() => setVisibilityScope(option.value)}>
                                            <Box
                                                className="rounded-full border px-3 py-1"
                                                style={{
                                                    borderColor: active ? colors.textPrimary : colors.border,
                                                    backgroundColor: active ? colors.textPrimary : colors.surface,
                                                }}
                                            >
                                                <Text
                                                    className="text-xs font-medium"
                                                    style={{ color: active ? colors.surface : colors.textSecondary }}
                                                >
                                                    {option.label}
                                                </Text>
                                            </Box>
                                        </Pressable>
                                    );
                                })}
                            </HStack>
                        </HStack>
                    </Box>
                    <HomeTransactionsSection
                        loading={loading}
                        items={lancamentosFiltrados}
                        filterType={filterType}
                        isFilterSheetOpen={showFilterSheet}
                        onOpenFilterSheet={() => setShowFilterSheet(true)}
                        onCloseFilterSheet={() => setShowFilterSheet(false)}
                        onChangeFilter={setFilterType}
                        onPressItem={handlePressItem}
                        onPressSeeAll={() => router.push("/(auth)/(tabs)/launches")}
                    />
                </Box>
            </ScrollView>

            <Modal isOpen={rangeSheetOpen} onClose={closeRangeSheet} size="md">
                <ModalBackdrop />
                <ModalContent>
                    <ModalHeader>
                        <Text className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                            Filtrar por período
                        </Text>
                    </ModalHeader>

                    <ModalBody>
                        <Box className="gap-3">
                            <Text style={{ color: colors.textSecondary }}>
                                Escolha a data inicial e final do resumo da home.
                            </Text>

                            <HStack className="gap-2">
                                <Pressable onPress={() => openRangePicker("start")} style={{ flex: 1 }}>
                                    <Box
                                        className="rounded-xl border px-3 py-3"
                                        style={{
                                            backgroundColor: colors.surfaceMuted,
                                            borderColor: rangePickerTarget === "start" ? colors.textPrimary : colors.border,
                                        }}
                                    >
                                        <Text className="text-xs" style={{ color: colors.textSecondary }}>
                                            Início
                                        </Text>
                                        <Text className="font-semibold" style={{ color: colors.textPrimary }}>
                                            {dateRange.start}
                                        </Text>
                                    </Box>
                                </Pressable>

                                <Pressable onPress={() => openRangePicker("end")} style={{ flex: 1 }}>
                                    <Box
                                        className="rounded-xl border px-3 py-3"
                                        style={{
                                            backgroundColor: colors.surfaceMuted,
                                            borderColor: rangePickerTarget === "end" ? colors.textPrimary : colors.border,
                                        }}
                                    >
                                        <Text className="text-xs" style={{ color: colors.textSecondary }}>
                                            Fim
                                        </Text>
                                        <Text className="font-semibold" style={{ color: colors.textPrimary }}>
                                            {dateRange.end}
                                        </Text>
                                    </Box>
                                </Pressable>
                            </HStack>

                            {rangePickerTarget ? (
                                <Box className="rounded-2xl border p-2" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                                    <DateTimePicker
                                        value={new Date(`${dateRange[rangePickerTarget]}T12:00:00`)}
                                        mode="date"
                                        display={Platform.OS === "ios" ? "spinner" : "default"}
                                        onChange={handleRangeDateChange}
                                        minimumDate={rangePickerTarget === "end" ? new Date(`${dateRange.start}T00:00:00`) : undefined}
                                        maximumDate={rangePickerTarget === "start" ? new Date(`${dateRange.end}T23:59:59`) : undefined}
                                    />
                                </Box>
                            ) : null}
                        </Box>
                    </ModalBody>

                    <ModalFooter>
                        <Button variant="outline" onPress={closeRangeSheet}>
                            <ButtonText>Fechar</ButtonText>
                        </Button>
                        <Button onPress={closeRangeSheet}>
                            <ButtonText>Aplicar</ButtonText>
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
}
