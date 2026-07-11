import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import {
    Wallet,
    PiggyBank,
    ArrowUpCircle,
    ArrowDownCircle,
    CircleAlert,
    Plus,
    Funnel,
    SlidersHorizontal,
} from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Button, ButtonText } from "@/components/ui/button";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { useHomeFinance } from "@/hooks/useHomeFinance";
import { buildCategoryExpenses } from "@/utils/finance/dashboardHelpers";
import { buildPeriodBalanceSeries } from "@/utils/finance/financeDesktopHelpers";
import { LAUNCHES_PATH } from "@/utils/navigation";
import { DateFilterModal } from "@/components/finance/DateFilterModal";
import { DesktopStatTile } from "./DesktopStatTile";
import { DesktopBalanceChart } from "./DesktopBalanceChart";
import { CategoryBreakdownCard } from "./CategoryBreakdownCard";
import { RecentTransactionsCard } from "./RecentTransactionsCard";
import { QuickShortcutsCard } from "./QuickShortcutsCard";
import { BanksCard } from "./BanksCard";
import { UpcomingBillsCard } from "./UpcomingBillsCard";

function FilterButton({ active, onPress, colors }) {
    const Icon = active ? SlidersHorizontal : Funnel;
    return (
        <Pressable onPress={onPress} accessibilityLabel="Filtrar período">
            <Box
                className="rounded-xl border items-center justify-center"
                style={{
                    width: 40,
                    height: 40,
                    backgroundColor: active ? colors.brand : colors.surfaceMuted,
                    borderColor: active ? colors.brand : colors.border,
                }}
            >
                <Icon size={18} color={active ? "#FFFFFF" : colors.textPrimary} />
            </Box>
        </Pressable>
    );
}

// Reaproveita o mesmo cálculo da tela de finance (buildCategoryExpenses), sobre os
// itens crus do período — os agrupados por fatura não têm categoria.
function computeCategoryBreakdown(periodLancamentos, colors) {
    const palette = [colors.brand, "#16A34A", colors.brandMark, "#DC2626", colors.textSecondary];
    const { items, maxValue } = buildCategoryExpenses(periodLancamentos, 5);
    return items.map((item, i) => ({
        nome: item.categoria,
        value: item.total,
        pct: (item.total / maxValue) * 100,
        color: palette[i % palette.length],
    }));
}

export default function HomeDesktop() {
    const { theme } = useTheme();
    const colors = getThemeColors(theme);
    const router = useRouter();

    const {
        loading,
        name,
        resumo,
        lancamentos,
        periodLancamentos,
        allLancamentos,
        banksResumo,
        dateRange,
        isFilterActive,
        groupCards,
        setGroupCards,
        openInsert,
        handlePressItem,
    } = useHomeFinance();

    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [chartCardHeight, setChartCardHeight] = useState(0);
    const chartCardRef = useRef(null);

    useEffect(() => {
        const node = chartCardRef.current;
        if (!node || typeof ResizeObserver === "undefined") return;
        const measure = () => setChartCardHeight(node.offsetHeight || 0);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    const categories = useMemo(
        () => computeCategoryBreakdown(periodLancamentos, colors),
        [periodLancamentos, colors]
    );

    const balanceSeries = useMemo(
        () =>
            buildPeriodBalanceSeries(
                allLancamentos,
                dateRange,
                periodLancamentos.filter((item) => item.is_ghost)
            ),
        [allLancamentos, dateRange, periodLancamentos]
    );

    const recentItems = useMemo(
        () =>
            [...lancamentos]
                .sort((a, b) => String(b.data_vencimento).localeCompare(String(a.data_vencimento)))
                .slice(0, 6),
        [lancamentos]
    );

    const upcomingItems = useMemo(
        () =>
            lancamentos
                .filter((item) => item.status !== "pago")
                .sort((a, b) => String(a.data_vencimento).localeCompare(String(b.data_vencimento)))
                .slice(0, 4),
        [lancamentos]
    );

    return (
        <>
            <ScrollView
                style={{ backgroundColor: colors.screen }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
            >
                <Box className="w-full gap-4">
                    <Box className="flex-row items-center justify-between gap-4 flex-wrap">
                        <Box className="gap-1">
                            <Text className="text-2xl font-extrabold" style={{ color: colors.textPrimary }}>
                                Olá, {name || "pessoa"}
                            </Text>
                            <Text className="text-sm" style={{ color: colors.textSecondary }}>
                                Aqui está o panorama completo das suas finanças.
                            </Text>
                        </Box>
                        <Box className="flex-row items-center gap-3">
                            <FilterButton
                                active={isFilterActive}
                                onPress={() => setFilterModalOpen(true)}
                                colors={colors}
                            />
                            <Button action="positive" onPress={() => openInsert()}>
                                <Plus size={16} color="#FFFFFF" />
                                <ButtonText style={{ color: "#FFFFFF" }}>Novo lançamento</ButtonText>
                            </Button>
                        </Box>
                    </Box>

                    {/* Métricas */}
                    <Box className="flex-row gap-4 flex-wrap">
                        <DesktopStatTile label="Saldo total" value={resumo.saldoReal} icon={Wallet} loading={loading} />
                        <DesktopStatTile label="Consolidado" value={resumo.saldo} icon={PiggyBank} loading={loading} />
                        <DesktopStatTile label="Entradas do período" value={resumo.entradas} icon={ArrowUpCircle} tone="income" loading={loading} />
                        <DesktopStatTile label="Saídas do período" value={resumo.saidas} icon={ArrowDownCircle} tone="expense" loading={loading} />
                        <DesktopStatTile label="Dívidas não pagas" value={resumo.dividasNaoPagas} icon={CircleAlert} tone="expense" loading={loading} />
                        <DesktopStatTile label="A receber pendente" value={resumo.receberPendente} icon={ArrowUpCircle} tone="income" loading={loading} />

                    </Box>

                    {/* Duas colunas: esquerda (saldo + recentes) / direita (categorias, atalhos, bancos, próximas) */}
                    <Box className="flex-row gap-4 flex-wrap items-start w-full">
                        <Box className="gap-4" style={{
                            flexGrow: 1,
                            flexShrink: 1,
                            flexBasis: 'calc(((100% - (5 * 16px)) / 6) * 4 + (3 * 16px))'
                        }}>
                            <Box ref={chartCardRef}>
                                <DesktopBalanceChart points={balanceSeries} loading={loading} />
                            </Box>
                            <RecentTransactionsCard
                                loading={loading}
                                items={recentItems}
                                onPressItem={handlePressItem}
                                onSeeAll={() => router.push(LAUNCHES_PATH)}
                            />
                        </Box>
                        <Box className="gap-4" style={{
                            flexGrow: 1,
                            flexShrink: 1, 
                            flexBasis: 'calc(((100% - (5 * 16px)) / 6) * 2 + (1 * 16px))'
                        }}>
                            <QuickShortcutsCard height={chartCardHeight} />
                            <UpcomingBillsCard items={upcomingItems} onPressItem={handlePressItem} />
                            <CategoryBreakdownCard categories={categories} />
                            <BanksCard banks={banksResumo} />
                        </Box>
                    </Box>
                </Box>
            </ScrollView>

            <DateFilterModal
                isOpen={filterModalOpen}
                onClose={() => setFilterModalOpen(false)}
                showGroupCards
                groupCards={groupCards}
                onToggleGroupCards={setGroupCards}
            />
        </>
    );
}
