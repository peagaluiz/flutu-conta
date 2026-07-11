import {
	ChevronLeft,
	ChevronRight,
	Minus,
	TrendingDown,
	TrendingUp,
} from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { formatCurrency } from "@/utils/finance/helpers";

const SENTIMENT_COLORS = { positive: "#16A34A", negative: "#DC2626" };

export function NavArrow({ direction, onPress, colors, label }) {
	const Icon = direction === "left" ? ChevronLeft : ChevronRight;
	return (
		<Pressable onPress={onPress} accessibilityLabel={label}>
			<Box
				className="rounded-full border items-center justify-center"
				style={{
					width: 36,
					height: 36,
					backgroundColor: colors.surfaceMuted,
					borderColor: colors.border,
				}}
			>
				<Icon size={18} color={colors.textPrimary} />
			</Box>
		</Pressable>
	);
}

export function SectionTitle({ children, colors, hint }) {
	return (
		<Box className="gap-0.5">
			<Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
				{children}
			</Text>
			{hint ? (
				<Text className="text-xs" style={{ color: colors.textSecondary }}>
					{hint}
				</Text>
			) : null}
		</Box>
	);
}

// Linha de comparação com o período anterior. `delta` vem de computeDelta:
// { diff, pct, sentiment }. kind "money" formata em R$ + %, "points" em pp (para
// taxas). Sem período anterior comparável, mostra apenas `emptyLabel` em neutro.
export function ComparisonLine({ delta, prevExists, kind = "money", caption, emptyLabel, colors }) {
	if (!prevExists) {
		return (
			<Text className="text-xs" style={{ color: colors.textSecondary }} numberOfLines={1}>
				{emptyLabel}
			</Text>
		);
	}

	const color = SENTIMENT_COLORS[delta.sentiment] ?? colors.textSecondary;
	const up = delta.diff > 0.005;
	const down = delta.diff < -0.005;
	const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
	const sign = delta.diff >= 0 ? "+" : "−";
	const magnitude = Math.abs(delta.diff);
	const diffLabel =
		kind === "points"
			? `${sign}${magnitude.toFixed(1)} pp`
			: `${sign}${formatCurrency(magnitude)}`;
	const pctLabel =
		kind === "money" && delta.pct != null
			? `${delta.pct >= 0 ? "+" : "−"}${Math.abs(delta.pct).toFixed(0)}%`
			: null;

	return (
		<Box className="flex-row items-center gap-1 flex-wrap">
			<Icon size={13} color={color} />
			<Text className="text-xs font-medium" style={{ color }} numberOfLines={1}>
				{diffLabel}
				{pctLabel ? ` · ${pctLabel}` : ""}
			</Text>
			{caption ? (
				<Text className="text-xs" style={{ color: colors.textSecondary }} numberOfLines={1}>
					{caption}
				</Text>
			) : null}
		</Box>
	);
}

// Card de uma seção. Mesmo visual dos cards da tela inicial (rounded-xl border
// p-4). `headerRight` recebe um slot à direita do título (ex.: legenda).
export function SectionCard({ title, hint, headerRight, children, colors, className = "", contentClassName = "gap-3", style }) {
	return (
		<Box
			className={`rounded-xl border p-4 gap-3 ${className}`}
			style={{
				backgroundColor: colors.surface,
				borderColor: colors.border,
				...style,
			}}
		>
			{title || headerRight ? (
				<Box className="flex-row items-start justify-between gap-2">
					{title ? (
						<SectionTitle colors={colors} hint={hint}>
							{title}
						</SectionTitle>
					) : (
						<Box />
					)}
					{headerRight ?? null}
				</Box>
			) : null}
			<Box className={contentClassName}>{children}</Box>
		</Box>
	);
}
