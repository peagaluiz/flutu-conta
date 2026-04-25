import React from "react";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { formatCurrency } from "@/utils/finance/helpers";

const BAR_COLORS = ["#0EA5E9", "#14B8A6", "#22C55E", "#F59E0B", "#F97316", "#EF4444"];

export function FinanceCategoryChartSection({ categories, colors, onPressCategory }) {
	return (
		<Box
			className="rounded-xl border p-4"
			style={{ backgroundColor: colors.surface, borderColor: colors.border }}
		>
			<Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
				Despesas por categoria
			</Text>
			<Text className="mb-3 text-xs" style={{ color: colors.textSecondary }}>
				Top categorias por valor gasto
			</Text>

			{!categories.items.length ? (
				<Text style={{ color: colors.textSecondary }}>Sem dados no periodo selecionado.</Text>
			) : (
				<VStack className="gap-3">
					{categories.items.map((item, index) => {
						const widthPercent = Math.max(4, Math.round((item.total / categories.maxValue) * 100));
						return (
							<Pressable
								key={`${item.categoria}-${index}`}
								onPress={() => onPressCategory?.(item.categoria)}
							>
								<VStack className="gap-1">
									<HStack className="items-center justify-between">
										<Text className="text-sm" style={{ color: colors.textPrimary }}>
											{item.categoria}
										</Text>
										<Text className="text-xs" style={{ color: colors.textSecondary }}>
											{formatCurrency(item.total)}
										</Text>
									</HStack>
									<Box className="h-2 w-full rounded-full" style={{ backgroundColor: "rgba(148,163,184,0.25)" }}>
										<Box
											className="h-2 rounded-full"
											style={{
												width: `${widthPercent}%`,
												backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
											}}
										/>
									</Box>
								</VStack>
							</Pressable>
						);
					})}
				</VStack>
			)}
		</Box>
	);
}
