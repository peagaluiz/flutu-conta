import React, { useMemo, useState } from "react";
import { ScrollView } from "react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import {
	buildYearlySeries,
	buildMonthlySeries,
	buildWeeklySeries,
	buildDailySeries,
} from "@/utils/finance/dashboardHelpers";

const GROUPINGS = [
	{ value: "year", label: "Ano" },
	{ value: "month", label: "Mês" },
	{ value: "week", label: "Sem" },
	{ value: "day", label: "Dia" },
];

const GROUPING_CONFIG = {
	year: { title: "Fluxo anual", subtitle: "Entradas e saídas por ano" },
	month: { title: "Fluxo mensal", subtitle: "Entradas e saídas por mês" },
	week: { title: "Fluxo semanal", subtitle: "Entradas e saídas por semana" },
	day: { title: "Fluxo diário", subtitle: "Entradas e saídas por dia" },
};

const BAR_HEIGHT = 110;
const SCROLL_THRESHOLD = 8;
const ITEM_SCROLL_WIDTH = 36;

export function FinanceMonthlyChartSection({ items, colors, onPressGroup }) {
	const [grouping, setGrouping] = useState("day");

	const series = useMemo(() => {
		switch (grouping) {
			case "year": return buildYearlySeries(items);
			case "week": return buildWeeklySeries(items);
			case "day": return buildDailySeries(items);
			default: return buildMonthlySeries(items);
		}
	}, [grouping, items]);

	const config = GROUPING_CONFIG[grouping];
	const useScroll = series.items.length > SCROLL_THRESHOLD;

	const barItems = series.items.map((item) => {
		const inHeight = Math.max(
			6,
			Math.round((item.entradas / series.maxValue) * BAR_HEIGHT)
		);
		const outHeight = Math.max(
			6,
			Math.round((item.saidas / series.maxValue) * BAR_HEIGHT)
		);

		return (
			<Pressable
				key={item.key}
				style={useScroll ? { width: ITEM_SCROLL_WIDTH } : { flex: 1 }}
				onPress={() =>
					onPressGroup?.(`${config.title} · ${item.label}`, item.items)
				}
			>
				<VStack className="items-center gap-2">
					<HStack
						className="items-end gap-1"
						style={{ height: BAR_HEIGHT }}
					>
						<Box
							className="w-3 rounded-t"
							style={{ height: inHeight, backgroundColor: "#16A34A" }}
						/>
						<Box
							className="w-3 rounded-t"
							style={{ height: outHeight, backgroundColor: "#DC2626" }}
						/>
					</HStack>
					<Text
						className="text-[10px] uppercase"
						style={{ color: colors.textSecondary }}
					>
						{item.label}
					</Text>
				</VStack>
			</Pressable>
		);
	});

	return (
		<Box
			className="rounded-xl border p-4"
			style={{
				backgroundColor: colors.surface,
				borderColor: colors.border,
			}}
		>
			<HStack className="items-start justify-between mb-3">
				<VStack className="gap-0.5 flex-1 pr-2">
					<Text
						className="text-base font-semibold"
						style={{ color: colors.textPrimary }}
					>
						{config.title}
					</Text>
					<Text
						className="text-xs"
						style={{ color: colors.textSecondary }}
					>
						{config.subtitle}
					</Text>
				</VStack>

				<HStack className="gap-1">
					{GROUPINGS.map((g) => {
						const active = g.value === grouping;
						return (
							<Pressable
								key={g.value}
								onPress={() => setGrouping(g.value)}
							>
								<Box
									className="rounded-full border px-2 py-1"
									style={{
										borderColor: active
											? colors.textPrimary
											: colors.border,
										backgroundColor: active
											? colors.textPrimary
											: colors.surface,
									}}
								>
									<Text
										className="text-[11px] font-medium"
										style={{
											color: active
												? colors.surface
												: colors.textSecondary,
										}}
									>
										{g.label}
									</Text>
								</Box>
							</Pressable>
						);
					})}
				</HStack>
			</HStack>

			{useScroll ? (
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
				>
					<HStack className="items-end gap-2">
						{barItems}
					</HStack>
				</ScrollView>
			) : (
				<HStack className="items-end justify-between gap-2">
					{barItems}
				</HStack>
			)}

			<HStack className="mt-3 items-center gap-4">
				<HStack className="items-center gap-1">
					<Box
						className="h-2 w-2 rounded-full"
						style={{ backgroundColor: "#16A34A" }}
					/>
					<Text
						className="text-xs"
						style={{ color: colors.textSecondary }}
					>
						Entradas
					</Text>
				</HStack>
				<HStack className="items-center gap-1">
					<Box
						className="h-2 w-2 rounded-full"
						style={{ backgroundColor: "#DC2626" }}
					/>
					<Text
						className="text-xs"
						style={{ color: colors.textSecondary }}
					>
						Saídas
					</Text>
				</HStack>
			</HStack>
		</Box>
	);
}
