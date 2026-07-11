import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Box } from "@/components/ui/box";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { useFinanceDashboard } from "@/components/finance/dashboard/useFinanceDashboard";
import { FinanceDashboardSections } from "@/components/finance/dashboard/FinanceDashboardSections";
import { FinanceDetailSheet } from "@/components/finance/dashboard/FinanceDetailSheet";
import { SaldoInicialAjusteModal } from "@/components/finance/dashboard/SaldoInicialAjusteModal";
import { LAUNCHES_PATH } from "@/utils/navigation";
import { useIsDesktopWeb } from "@/hooks/useIsDesktopWeb";
import FinanceDesktop from "@/components/finance/dashboard/desktop/FinanceDesktop";

function FinanceSkeleton() {
	return (
		<Box className="gap-4">
			<Skeleton variant="sharp" className="h-[110px] rounded-xl" />
			<Skeleton variant="sharp" className="h-[230px] rounded-xl" />
			<SkeletonText _lines={5} className="h-3" />
		</Box>
	);
}

export default function Finance() {
	const isDesktopWeb = useIsDesktopWeb();
	if (isDesktopWeb) return <FinanceDesktop />;
	return <FinanceMobile />;
}

function FinanceMobile() {
	const insets = useSafeAreaInsets();
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const router = useRouter();

	const {
		loading,
		refreshing,
		filteredItems,
		resumo,
		categorySeries,
		banksBreakdown,
		getPendentesRows,
		onRefresh,
		createAjuste,
		savingAjuste,
	} = useFinanceDashboard();

	const [detailSheetOpen, setDetailSheetOpen] = useState(false);
	const [detailTitle, setDetailTitle] = useState("Detalhes");
	const [detailItems, setDetailItems] = useState([]);
	const [detailSaldoInicial, setDetailSaldoInicial] = useState(null);
	const [ajusteModalOpen, setAjusteModalOpen] = useState(false);

	const openDetails = useCallback((title, rows, saldoInicial = null) => {
		setDetailTitle(title);
		setDetailItems(Array.isArray(rows) ? rows : []);
		setDetailSaldoInicial(saldoInicial);
		setDetailSheetOpen(true);
	}, []);

	const handleDetailItemPress = useCallback(
		(item) => {
			if (!item?.id_transacao) return;
			setDetailSheetOpen(false);
			if (item.is_ghost) {
				router.push(LAUNCHES_PATH);
				return;
			}
			router.push({
				pathname: LAUNCHES_PATH,
				params: {
					highlightId: String(item.id_transacao),
					highlightTs: String(Date.now()),
				},
			});
		},
		[router]
	);

	const handleCreateAjuste = useCallback(
		async (payload) => {
			await createAjuste(payload);
			setAjusteModalOpen(false);
		},
		[createAjuste]
	);

	return (
		<>
			<ScrollView
				style={{ backgroundColor: colors.screen }}
				contentContainerStyle={{
					flexGrow: 1,
					paddingBottom: insets.bottom + 96,
				}}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
				}
			>
				<Box className="gap-4 px-3 pt-3" style={{ minHeight: "100%" }}>
					{loading ? (
						<FinanceSkeleton />
					) : (
						<FinanceDashboardSections
							resumo={resumo}
							filteredItems={filteredItems}
							categorySeries={categorySeries}
							banksBreakdown={banksBreakdown}
							colors={colors}
							openDetails={openDetails}
							getPendentesRows={getPendentesRows}
						/>
					)}
				</Box>
			</ScrollView>

			<FinanceDetailSheet
				isOpen={detailSheetOpen}
				onClose={() => setDetailSheetOpen(false)}
				title={detailTitle}
				items={detailItems}
				colors={colors}
				onItemPress={handleDetailItemPress}
				saldoInicial={detailSaldoInicial}
				onPressSaldoInicial={() => {
					setDetailSheetOpen(false);
					setAjusteModalOpen(true);
				}}
			/>

			<SaldoInicialAjusteModal
				isOpen={ajusteModalOpen}
				onClose={() => setAjusteModalOpen(false)}
				saldoInicialLabel={resumo.saldoInicialLabel}
				saving={savingAjuste}
				onSubmit={handleCreateAjuste}
				colors={colors}
			/>
		</>
	);
}
