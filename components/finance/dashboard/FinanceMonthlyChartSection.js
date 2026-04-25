import React from "react";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";

export function FinanceMonthlyChartSection({ series, colors, onPressMonth }) {
	return (
		<Box
			className="rounded-xl border p-4"
			style={{ backgroundColor: colors.surface, borderColor: colors.border }}
		>
			<Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
				Fluxo mensal
			</Text>
			<Text className="mb-3 text-xs" style={{ color: colors.textSecondary }}>
				Entradas e saidas dos ultimos 6 meses
			</Text>

			<HStack className="items-end justify-between gap-2">
				{series.items.map((item) => {
					const inHeight = Math.max(6, Math.round((item.entradas / series.maxValue) * 110));
					const outHeight = Math.max(6, Math.round((item.saidas / series.maxValue) * 110));

					return (
						<Pressable key={item.key} className="flex-1" onPress={() => onPressMonth?.(item.key)}>
							<VStack className="items-center gap-2">
								<HStack className="items-end gap-1" style={{ height: 110 }}>
									<Box className="w-3 rounded-t" style={{ height: inHeight, backgroundColor: "#16A34A" }} />
									<Box className="w-3 rounded-t" style={{ height: outHeight, backgroundColor: "#DC2626" }} />
								</HStack>
								<Text className="text-[10px] uppercase" style={{ color: colors.textSecondary }}>
									{item.label}
								</Text>
							</VStack>
						</Pressable>
					);
				})}
			</HStack>

			<HStack className="mt-3 items-center gap-4">
				<HStack className="items-center gap-1">
					<Box className="h-2 w-2 rounded-full" style={{ backgroundColor: "#16A34A" }} />
					<Text className="text-xs" style={{ color: colors.textSecondary }}>
						Entradas
					</Text>
				</HStack>
				<HStack className="items-center gap-1">
					<Box className="h-2 w-2 rounded-full" style={{ backgroundColor: "#DC2626" }} />
					<Text className="text-xs" style={{ color: colors.textSecondary }}>
						Saidas
					</Text>
				</HStack>
			</HStack>
		</Box>
	);
}
