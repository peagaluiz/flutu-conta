import React from "react";
import { CreditCard, Landmark } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { formatCurrency } from "@/utils/finance/helpers";

const METRICS = [
	{
		key: "recebidos",
		label: "Recebidos",
		color: "#16A34A",
		match: (i) => i.tipo === "receber" && i.status === "pago",
	},
	{
		key: "gastos",
		label: "Gastos",
		color: "#DC2626",
		match: (i) => i.tipo === "pagar" && i.status === "pago",
	},
	{
		key: "gastosFuturos",
		label: "Gastos futuros",
		color: "#F59E0B",
		match: (i) => i.tipo === "pagar" && i.status !== "pago",
	},
];

function BankMetricBar({ bank, metric, maxValue, colors, onPressDetail }) {
	const value = bank[metric.key] ?? 0;
	const widthPercent = value > 0 ? Math.max(4, Math.round((value / maxValue) * 100)) : 0;

	return (
		<Pressable
			disabled={value <= 0}
			onPress={() =>
				onPressDetail?.(
					`${bank.nome} • ${metric.label}`,
					bank.items.filter(metric.match)
				)
			}
		>
			<VStack className="gap-1">
				<HStack className="items-center justify-between">
					<HStack className="items-center gap-1.5">
						<Box
							className="rounded-full"
							style={{ width: 6, height: 6, backgroundColor: metric.color }}
						/>
						<Text className="text-xs" style={{ color: colors.textSecondary }}>
							{metric.label}
						</Text>
					</HStack>
					<Text className="text-xs font-semibold" style={{ color: colors.textPrimary }}>
						{formatCurrency(value)}
					</Text>
				</HStack>
				<Box
					className="h-2 w-full rounded-full"
					style={{ backgroundColor: "rgba(148,163,184,0.25)" }}
				>
					<Box
						className="h-2 rounded-full"
						style={{ width: `${widthPercent}%`, backgroundColor: metric.color }}
					/>
				</Box>
			</VStack>
		</Pressable>
	);
}

function BankBox({ bank, maxValue, colors, onPressDetail }) {
	const isCartao = bank.kind === "cartao";
	return (
		<Box
			className="rounded-xl border p-3"
			style={{ backgroundColor: colors.surfaceMuted, borderColor: colors.border }}
		>
			<HStack className="mb-3 items-center gap-2">
				<Box
					className="rounded-full"
					style={{ width: 10, height: 10, backgroundColor: bank.cor_hex }}
				/>
				<Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
					{bank.nome}
				</Text>
				{isCartao ? (
					<Box className="rounded-full px-2 py-0.5" style={{ backgroundColor: "rgba(245,158,11,0.15)" }}>
						<Text className="text-[10px] font-semibold" style={{ color: "#F59E0B" }}>
							CARTÃO
						</Text>
					</Box>
				) : null}
			</HStack>

			<VStack className="gap-2.5">
				{METRICS.map((metric) => (
					<BankMetricBar
						key={metric.key}
						bank={bank}
						metric={metric}
						maxValue={maxValue}
						colors={colors}
						onPressDetail={onPressDetail}
					/>
				))}
			</VStack>
		</Box>
	);
}

function BankSection({ title, Icon, iconColor, bankList, maxValue, colors, onPressDetail }) {
	if (!bankList.length) return null;
	return (
		<VStack className="gap-3">
			<HStack className="items-center gap-2">
				<Icon size={16} color={iconColor} />
				<Text className="text-xs font-semibold uppercase" style={{ color: colors.textSecondary }}>
					{title}
				</Text>
			</HStack>
			{bankList.map((bank) => (
				<BankBox
					key={`${bank.id_banco ?? "sem-banco"}:${bank.kind}`}
					bank={bank}
					maxValue={maxValue}
					colors={colors}
					onPressDetail={onPressDetail}
				/>
			))}
		</VStack>
	);
}

export function FinanceBanksChartSection({ banks, colors, onPressDetail }) {
	const contas = banks.items.filter((b) => b.kind !== "cartao");
	const cartoes = banks.items.filter((b) => b.kind === "cartao");

	return (
		<Box
			className="rounded-xl border p-4"
			style={{ backgroundColor: colors.surface, borderColor: colors.border }}
		>
			<Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
				Por banco
			</Text>
			<Text className="mb-3 text-xs" style={{ color: colors.textSecondary }}>
				Gastos, gastos futuros e recebidos por conta e cartão
			</Text>

			{!banks.items.length ? (
				<Text style={{ color: colors.textSecondary }}>
					Sem dados no periodo selecionado.
				</Text>
			) : (
				<VStack className="gap-5">
					<BankSection
						title="Contas"
						Icon={Landmark}
						iconColor={colors.textSecondary}
						bankList={contas}
						maxValue={banks.maxValue}
						colors={colors}
						onPressDetail={onPressDetail}
					/>
					<BankSection
						title="Cartões de crédito"
						Icon={CreditCard}
						iconColor="#F59E0B"
						bankList={cartoes}
						maxValue={banks.maxValue}
						colors={colors}
						onPressDetail={onPressDetail}
					/>
				</VStack>
			)}
		</Box>
	);
}
