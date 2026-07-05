import React, { useMemo } from "react";
import { ScrollView } from "react-native";
import { Controller, useWatch } from "react-hook-form";
import { Grid, GridItem } from "@/components/ui/grid";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { CreditCard } from "lucide-react-native";
import { parseBrNumber } from "@/components/finance/insert/insertFormConfig";

const PARCELAS = Array.from({ length: 12 }, (_, i) => i + 1);

export function ParcelasSection({ control, themeColors, isDarkMode }) {
	const parcelas = useWatch({ control, name: "parcelas" }) || 1;
	const valorRaw = useWatch({ control, name: "valor" });

	const valorParcela = useMemo(() => {
		const total = parseBrNumber(valorRaw || "");
		const n = Math.max(1, Number(parcelas) || 1);
		if (!total) return null;
		return total / n;
	}, [valorRaw, parcelas]);

	const textPrimary = themeColors?.textPrimary;
	const textSecondary = themeColors?.textSecondary;

	return (
		<Grid
			className="grid w-full rounded-md border p-5 gap-y-2"
			style={{
				flexDirection: "row",
				backgroundColor: isDarkMode ? "#1C1C1E" : "#FFFFFF",
				borderColor: isDarkMode ? "rgba(255,255,255,0.10)" : "#E2E8F0",
			}}
		>
			<GridItem _extra={{ className: "col-span-12" }}>
				<HStack className="items-center gap-2 mb-1">
					<CreditCard size={18} color="#F59E0B" />
					<Text className="text-base font-semibold" style={{ color: textPrimary }}>
						Parcelamento
					</Text>
				</HStack>
				<Text className="text-xs mb-2" style={{ color: textSecondary }}>
					Cada parcela cai na fatura do mês correspondente.
				</Text>
			</GridItem>

			<GridItem _extra={{ className: "col-span-12" }}>
				<Controller
					control={control}
					name="parcelas"
					render={({ field: { onChange, value } }) => (
						<ScrollView horizontal showsHorizontalScrollIndicator={false}>
							<HStack className="gap-2 py-1">
								{PARCELAS.map((n) => {
									const active = Number(value) === n;
									return (
										<Pressable key={n} onPress={() => onChange(n)}>
											<Box
												className="rounded-xl border px-4 py-2"
												style={{
													borderColor: active ? "#F59E0B" : themeColors?.border,
													backgroundColor: active
														? "rgba(245,158,11,0.12)"
														: themeColors?.surface,
												}}
											>
												<Text
													className="text-sm font-semibold"
													style={{ color: active ? "#F59E0B" : textSecondary }}
												>
													{n}x
												</Text>
											</Box>
										</Pressable>
									);
								})}
							</HStack>
						</ScrollView>
					)}
				/>
			</GridItem>

			{valorParcela && Number(parcelas) > 1 ? (
				<GridItem _extra={{ className: "col-span-12" }}>
					<Text className="text-xs mt-1" style={{ color: textSecondary }}>
						{`${parcelas}x de ${valorParcela.toLocaleString("pt-BR", {
							style: "currency",
							currency: "BRL",
						})}`}
					</Text>
				</GridItem>
			) : null}
		</Grid>
	);
}
