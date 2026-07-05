import { useState } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { Box } from "@/components/ui/box";
import { ResumoFinanceiroCard } from "@/components/finance/home/ResumoFinanceiroCard";
import { HomeQuickActionsSection } from "@/components/finance/home/HomeQuickActionsSection";
import { HomeTransactionsSection } from "@/components/finance/home/HomeTransactionsSection";
import { HomeVisibilitySelector } from "@/components/finance/home/HomeVisibilitySelector";
import { DateFilterModal } from "@/components/finance/DateFilterModal";
import { useHomeFinance } from "@/hooks/useHomeFinance";

export default function HomeFinanceList() {
	const insets = useSafeAreaInsets();
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const router = useRouter();

	const {
		loading,
		refreshing,
		visibilityScope,
		setVisibilityScope,
		hasFamily,
		dateRangeLabel,
		isFilterActive,
		quickActions,
		lancamentos,
		resumo,
		banksResumo,
		groupCards,
		setGroupCards,
		onRefresh,
		handlePressItem,
		handleDeleteItem,
		handleDarBaixa,
		handleRemoverBaixa,
		name,
	} = useHomeFinance();

	const [filterModalOpen, setFilterModalOpen] = useState(false);

	return (
		<>
			<ScrollView
				style={{ backgroundColor: colors.screen }}
				contentContainerStyle={{
					flexGrow: 1,
					paddingBottom: insets.bottom + 96,
				}}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
					/>
				}
			>
				<Box className="gap-4 px-3 pt-3" style={{ minHeight: "100%" }}>
					<ResumoFinanceiroCard
						resumo={resumo}
						name={name}
						dateRangeLabel={dateRangeLabel}
						onPressFilter={() => setFilterModalOpen(true)}
						loading={loading}
						isFilterActive={isFilterActive}
						banks={banksResumo}
					/>
					<HomeQuickActionsSection actions={quickActions} />
					{hasFamily && (
						<HomeVisibilitySelector
							value={visibilityScope}
							onChange={setVisibilityScope}
						/>
					)}
					<HomeTransactionsSection
						loading={loading}
						items={lancamentos}
						onPressItem={handlePressItem}
						onDeleteItem={handleDeleteItem}
						onDarBaixa={handleDarBaixa}
						onRemoverBaixa={handleRemoverBaixa}
						onPressSeeAll={() =>
							router.push("/(auth)/(tabs)/launches")
						}
					/>
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
