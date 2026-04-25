import React from "react";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";

export function FinanceResumoSection({
	resumo,
	colors,
	onPressSaldo,
	onPressEntradas,
	onPressSaidas,
	onPressPendentes,
}) {
	const cardStyle = {
		backgroundColor: colors.surface,
		borderColor: colors.border,
	};

	return (
		<VStack className="gap-3">
			<Pressable onPress={onPressSaldo}>
				<Box className="rounded-xl border p-4" style={cardStyle}>
					<Text style={{ color: colors.textSecondary }}>Saldo consolidado</Text>
					<Text className="mt-1 text-2xl font-bold" style={{ color: colors.textPrimary }}>
						{resumo.saldoLabel}
					</Text>
				</Box>
			</Pressable>

			<HStack className="gap-3">
				<Pressable className="flex-1" onPress={onPressEntradas}>
					<Box className="rounded-xl border p-3" style={cardStyle}>
						<Text className="text-xs" style={{ color: colors.textSecondary }}>
							Entradas
						</Text>
						<Text className="mt-1 text-base font-semibold" style={{ color: "#16A34A" }}>
							{resumo.entradasLabel}
						</Text>
					</Box>
				</Pressable>

				<Pressable className="flex-1" onPress={onPressSaidas}>
					<Box className="rounded-xl border p-3" style={cardStyle}>
						<Text className="text-xs" style={{ color: colors.textSecondary }}>
							Saidas
						</Text>
						<Text className="mt-1 text-base font-semibold" style={{ color: "#DC2626" }}>
							{resumo.saidasLabel}
						</Text>
					</Box>
				</Pressable>

				<Pressable className="flex-1" onPress={onPressPendentes}>
					<Box className="rounded-xl border p-3" style={cardStyle}>
						<Text className="text-xs" style={{ color: colors.textSecondary }}>
							Pendentes
						</Text>
						<Text className="mt-1 text-base font-semibold" style={{ color: colors.textPrimary }}>
							{resumo.pendentes}
						</Text>
					</Box>
				</Pressable>
			</HStack>
		</VStack>
	);
}
