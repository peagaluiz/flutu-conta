import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { formatCurrency } from "@/utils/finance/helpers";
import { DesktopCard } from "./DesktopCard";

export function BanksCard({ banks }) {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);

	const sorted = [...banks].sort((a, b) => (b.saldo ?? 0) - (a.saldo ?? 0));

	return (
		<DesktopCard title="Contas bancárias" contentClassName="gap-3">
			{sorted.length === 0 ? (
				<Text className="text-sm" style={{ color: colors.textSecondary }}>
					Nenhuma conta cadastrada.
				</Text>
			) : (
				sorted.map((bank) => (
					<Box key={String(bank.id_banco)} className="flex-row items-center justify-between">
						<Box className="flex-row items-center gap-2 flex-1 mr-2">
							<Box
								className="rounded-full"
								style={{ width: 10, height: 10, backgroundColor: bank.cor_hex || "#6B7280" }}
							/>
							<Text className="text-sm" style={{ color: colors.textPrimary }} numberOfLines={1}>
								{bank.nome}
							</Text>
						</Box>
						<Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
							{formatCurrency(bank.saldo ?? 0)}
						</Text>
					</Box>
				))
			)}
		</DesktopCard>
	);
}
