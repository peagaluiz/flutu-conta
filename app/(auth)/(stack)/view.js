import { useEffect, useMemo, useState } from "react";
import { ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { useDatabase } from "@/hooks/useDatabase";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { formatCurrency } from "@/utils/finance/helpers";

export default function ViewScreen() {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const database = useDatabase();
	const params = useLocalSearchParams();
	const [item, setItem] = useState(null);

	const transacaoId = useMemo(() => {
		const raw = Array.isArray(params?.id_transacao)
			? params?.id_transacao[0]
			: params?.id_transacao;
		const parsed = Number(raw);
		return Number.isFinite(parsed) ? parsed : null;
	}, [params?.id_transacao]);

	useEffect(() => {
		let active = true;

		const load = async () => {
			if (!transacaoId) return;
			try {
				const transacao = await database.getTransacao(transacaoId, {
					fallbackRemoteOnMiss: true,
				});
				if (active) setItem(transacao || null);
			} catch {
				if (active) setItem(null);
			}
		};

		load();

		return () => {
			active = false;
		};
	}, [database, transacaoId]);

	return (
		<ScrollView
			style={{ backgroundColor: colors.screen }}
			contentContainerStyle={{ padding: 16, gap: 12 }}
		>
			<Box
				className="rounded-2xl border p-4"
				style={{
					backgroundColor: colors.surface,
					borderColor: colors.border,
				}}
			>
				<Text
					className="text-lg font-semibold"
					style={{ color: colors.textPrimary }}
				>
					Detalhes do lançamento
				</Text>
			</Box>

			{!item ? (
				<Box
					className="rounded-2xl border p-4"
					style={{
						backgroundColor: colors.surface,
						borderColor: colors.border,
					}}
				>
					<Text style={{ color: colors.textSecondary }}>
						Lançamento não encontrado.
					</Text>
				</Box>
			) : (
				<Box
					className="rounded-2xl border p-4"
					style={{
						backgroundColor: colors.surface,
						borderColor: colors.border,
					}}
				>
					<Text style={{ color: colors.textSecondary }}>
						Categoria
					</Text>
					<Text
						className="mb-2 font-semibold"
						style={{ color: colors.textPrimary }}
					>
						{item.categoria || "Sem categoria"}
					</Text>

					<Text style={{ color: colors.textSecondary }}>Valor</Text>
					<Text
						className="mb-2 font-semibold"
						style={{ color: colors.textPrimary }}
					>
						{formatCurrency(item.valor)}
					</Text>

					<Text style={{ color: colors.textSecondary }}>
						Vencimento
					</Text>
					<Text
						className="mb-2 font-semibold"
						style={{ color: colors.textPrimary }}
					>
						{item.data_vencimento || "Sem vencimento"}
					</Text>

					<Text style={{ color: colors.textSecondary }}>Origem</Text>
					<Text
						className="font-semibold"
						style={{ color: colors.textPrimary }}
					>
						{Number(item?.is_from_recurrence || 0) === 1
							? `Recorrência (${
									item?.recurrence_frequency || "mensal"
							  })`
							: "Lançamento avulso"}
					</Text>
				</Box>
			)}
		</ScrollView>
	);
}
