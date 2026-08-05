import { useCallback } from "react";
import { ScrollView } from "react-native";
import { BarChart2, Download } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { useOpenInsert } from "@/hooks/useOpenInsert";
import { Alert } from "@/utils/alert";
import { downloadTextFile } from "@/utils/downloadFile";
import { buildFinanceReportHtml } from "@/utils/finance/financeReportHtml";
import { useFinanceDesktop } from "./useFinanceDesktop";
import { MonthBlock } from "./MonthBlock";
import { YearBlock } from "./YearBlock";

function FinanceDesktopSkeleton() {
	return (
		<Box className="w-full gap-4">
			<Skeleton style={{ height: 320, borderRadius: 16 }} />
			<Skeleton style={{ height: 360, borderRadius: 16 }} />
		</Box>
	);
}

function PageHeader({ colors, onExport, disabled }) {
	return (
		<Box className="flex-row items-center justify-between gap-4 flex-wrap">
			<Box className="flex-row items-center gap-3">
				<Box className="gap-1">
					<Text className="text-2xl font-extrabold" style={{ color: colors.textPrimary }}>
						Finanças
					</Text>
					<Text className="text-sm" style={{ color: colors.textSecondary }}>
						O mês em profundidade, e o ano em perspectiva.
					</Text>
				</Box>
			</Box>
			<Pressable
				accessibilityLabel="Exportar relatório em HTML"
				disabled={disabled}
				onPress={onExport}
			>
				<Box
					className="rounded-full border items-center justify-center"
					style={{
						width: 40,
						height: 40,
						backgroundColor: colors.surfaceMuted,
						borderColor: colors.border,
						opacity: disabled ? 0.4 : 1,
					}}
				>
					<Download size={17} color={colors.textPrimary} />
				</Box>
			</Pressable>
		</Box>
	);
}

export default function FinanceDesktop() {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const openInsert = useOpenInsert();

	const {
		loading,
		selectedYear,
		goYear,
		periodLabel,
		monthView,
		monthComparison,
		monthBalanceSeries,
		yearView,
		yearComparison,
	} = useFinanceDesktop();

	const handlePressItem = useCallback(
		(item) => {
			if (!item) return;
			// Previstas são display-only no web (materializar/editar só no app).
			if (item.is_ghost) return;
			openInsert({ id_transacao: String(item.id_transacao) }, { replace: true });
		},
		[openInsert]
	);

	const handleExport = useCallback(() => {
		const html = buildFinanceReportHtml({
			periodLabel,
			monthView,
			monthComparison,
			yearView,
			yearComparison,
			year: selectedYear,
		});
		const stamp = new Date().toISOString().slice(0, 10);
		const ok = downloadTextFile(
			`relatorio-financeiro-${stamp}.html`,
			html,
			"text/html;charset=utf-8"
		);
		if (!ok) {
			Alert.alert("Exportar", "Não foi possível gerar o arquivo neste dispositivo.");
		}
	}, [
		periodLabel,
		monthView,
		monthComparison,
		yearView,
		yearComparison,
		selectedYear,
	]);

	return (
		<ScrollView
			style={{ backgroundColor: colors.screen }}
			contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
		>
			<Box className="w-full gap-4">
				<PageHeader colors={colors} onExport={handleExport} disabled={loading} />

				{loading ? (
					<FinanceDesktopSkeleton />
				) : (
					<>
						<MonthBlock
							view={monthView}
							comparison={monthComparison}
							balanceSeries={monthBalanceSeries}
							periodLabel={periodLabel}
							onPressItem={handlePressItem}
							colors={colors}
						/>
						<YearBlock
							year={selectedYear}
							view={yearView}
							comparison={yearComparison}
							onPrev={() => goYear(-1)}
							onNext={() => goYear(1)}
							colors={colors}
						/>
					</>
				)}
			</Box>
		</ScrollView>
	);
}
