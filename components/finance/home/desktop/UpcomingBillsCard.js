import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { formatCurrency, formatDate } from "@/utils/finance/helpers";
import { getDescricao } from "@/utils/finance/getDescricao";
import { FaturaGroupListItem } from "@/components/finance/home/FaturaGroupListItem";
import { DesktopCard } from "./DesktopCard";

export function UpcomingBillsCard({ items, onPressItem }) {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);

	return (
		<DesktopCard title="Próximas contas" contentClassName="gap-3">
			{items.length === 0 ? (
				<Text className="text-sm" style={{ color: colors.textSecondary }}>
					Nenhuma conta pendente à frente.
				</Text>
			) : (
				items.map((item) => {
					if (item.is_fatura_group) {
						return (
							<FaturaGroupListItem
								key={String(item.id_transacao)}
								group={item}
								compact
							/>
						);
					}
					const isReceber = item.tipo === "receber";
					const titulo = item.pessoa || getDescricao(item) || item.categoria || "Lançamento";
					return (
						<Box
							key={String(item.id_transacao ?? item.recurrence_uuid)}
							className="flex-row items-center justify-between gap-2"
						>
							<Box className="flex-row items-center gap-3 flex-1 mr-2">
								<Text className="text-xs w-9" style={{ color: colors.textSecondary }}>
									{formatDate(item.data_vencimento)?.slice(0, 5)}
								</Text>
								<Text className="text-sm flex-1" style={{ color: colors.textPrimary }} numberOfLines={1}>
									{titulo}
								</Text>
							</Box>
							<Text
								className="text-sm font-semibold"
								style={{ color: isReceber ? "#16A34A" : colors.textPrimary }}
							>
								{isReceber ? "+" : ""}
								{formatCurrency(item.valor)}
							</Text>
						</Box>
					);
				})
			)}
		</DesktopCard>
	);
}
