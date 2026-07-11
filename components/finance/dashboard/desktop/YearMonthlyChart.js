import { useCallback, useRef, useState } from "react";
import Svg, { Rect, Path, Line, Circle } from "react-native-svg";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { formatCurrency } from "@/utils/finance/helpers";
import { buildMonotonePath } from "@/utils/finance/monotoneCurve";
import { shadow } from "@/utils/shadow";

const INCOME_COLOR = "#16A34A";
const EXPENSE_COLOR = "#DC2626";

const CHART_HEIGHT = 210;
const PAD_TOP = 22;
const PAD_BOTTOM = 24;
const BAR_WIDTH = 12;
const TOOLTIP_WIDTH = 180;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function Legend({ colors }) {
	const items = [
		{ label: "Receitas", color: INCOME_COLOR },
		{ label: "Despesas", color: EXPENSE_COLOR },
		{ label: "Saldo", color: colors.brand },
	];
	return (
		<Box className="flex-row gap-4">
			{items.map((item) => (
				<Box key={item.label} className="flex-row items-center gap-1.5">
					<Box style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
					<Text className="text-xs" style={{ color: colors.textSecondary }}>
						{item.label}
					</Text>
				</Box>
			))}
		</Box>
	);
}

export function YearMonthlyChart({ months, monthNameLong, colors }) {
	const [width, setWidth] = useState(0);
	const [hoverIndex, setHoverIndex] = useState(null);
	const plotRef = useRef(null);
	const observerRef = useRef(null);

	const setPlotNode = useCallback((node) => {
		observerRef.current?.disconnect();
		observerRef.current = null;
		plotRef.current = node;
		if (!node || typeof ResizeObserver === "undefined") return;
		setWidth(node.offsetWidth || 0);
		const observer = new ResizeObserver(() => setWidth(node.offsetWidth || 0));
		observer.observe(node);
		observerRef.current = observer;
	}, []);

	const hasData = Array.isArray(months) && months.some((m) => m.entradas > 0 || m.saidas > 0);
	const chartWidth = width || 600;

	const saldos = months.map((m) => m.saldo);
	const maxValue = Math.max(0, ...months.map((m) => m.entradas), ...months.map((m) => m.saidas), ...saldos);
	const minValue = Math.min(0, ...saldos);
	const span = maxValue - minValue || 1;
	const usableH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
	const bandWidth = chartWidth / 12;

	const xCenter = (i) => bandWidth * (i + 0.5);
	const yFor = (v) => PAD_TOP + usableH - ((v - minValue) / span) * usableH;
	const zeroY = yFor(0);

	const nonFuture = months.filter((m) => !m.isFuture);
	const saldoLine = buildMonotonePath(
		nonFuture.map((month) => ({
			x: xCenter(month.index),
			y: yFor(month.saldo),
		}))
	);

	const handleMove = (e) => {
		if (!plotRef.current?.getBoundingClientRect) return;
		const rect = plotRef.current.getBoundingClientRect();
		const offsetX = e.clientX - rect.left;
		setHoverIndex(clamp(Math.floor(offsetX / bandWidth), 0, 11));
	};

	const active = hoverIndex != null ? months[hoverIndex] : null;
	const tooltipLeft = active
		? clamp(xCenter(hoverIndex) - TOOLTIP_WIDTH / 2, 0, Math.max(0, chartWidth - TOOLTIP_WIDTH))
		: 0;

	const tooltipRows = active
		? [
				{ label: "Receitas", value: active.entradas, color: INCOME_COLOR },
				{ label: "Despesas", value: active.saidas, color: EXPENSE_COLOR },
				{ label: "Saldo", value: active.saldo, color: colors.brand },
		  ]
		: [];

	return (
		<Box className="gap-3">
			<Box className="flex-row items-center justify-between flex-wrap gap-2">
				<Legend colors={colors} />
				{span > 1 ? (
					<Text className="text-xs" style={{ color: colors.textSecondary }}>
						{formatCurrency(maxValue)}
					</Text>
				) : null}
			</Box>

			{!hasData ? (
				<Box style={{ height: CHART_HEIGHT }} className="items-center justify-center">
					<Text className="text-sm" style={{ color: colors.textSecondary }}>
						Sem dados neste ano.
					</Text>
				</Box>
			) : (
				<Box
					ref={setPlotNode}
					style={{ height: CHART_HEIGHT, position: "relative" }}
					onMouseMove={handleMove}
					onMouseLeave={() => setHoverIndex(null)}
				>
					<Svg width={chartWidth} height={CHART_HEIGHT} style={{ overflow: "visible" }}>
						{active ? (
							<Rect
								x={bandWidth * hoverIndex}
								y={PAD_TOP - 6}
								width={bandWidth}
								height={usableH + 12}
								fill={colors.surfaceMuted}
								rx={6}
							/>
						) : null}

						<Line x1={0} y1={zeroY} x2={chartWidth} y2={zeroY} stroke={colors.border} strokeWidth={1} />

						{months.map((m) => {
							const receitaTop = yFor(m.entradas);
							const opacity = m.isFuture ? 0.3 : 1;
							return (
								<Rect
									key={`r-${m.index}`}
									x={xCenter(m.index) - BAR_WIDTH - 1.5}
									y={receitaTop}
									width={BAR_WIDTH}
									height={Math.max(0, zeroY - receitaTop)}
									rx={3}
									fill={INCOME_COLOR}
									opacity={opacity}
								/>
							);
						})}
						{months.map((m) => {
							const despesaTop = yFor(m.saidas);
							const opacity = m.isFuture ? 0.3 : 1;
							return (
								<Rect
									key={`d-${m.index}`}
									x={xCenter(m.index) + 1.5}
									y={despesaTop}
									width={BAR_WIDTH}
									height={Math.max(0, zeroY - despesaTop)}
									rx={3}
									fill={EXPENSE_COLOR}
									opacity={opacity}
								/>
							);
						})}

						{nonFuture.length >= 2 ? (
							<Path d={saldoLine} stroke={colors.brand} strokeWidth={2.5} fill="none" />
						) : null}
						{nonFuture.map((m) => (
							<Circle
								key={`s-${m.index}`}
								cx={xCenter(m.index)}
								cy={yFor(m.saldo)}
								r={hoverIndex === m.index ? 4.5 : 3}
								fill={hoverIndex === m.index ? colors.brand : colors.surface}
								stroke={colors.brand}
								strokeWidth={2}
							/>
						))}
					</Svg>

					{/* Rótulos dos meses */}
					<Box className="flex-row" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
						{months.map((m) => (
							<Text
								key={`l-${m.index}`}
								numberOfLines={1}
								className="text-xs"
								style={{
									width: bandWidth,
									textAlign: "center",
									color: m.isCurrent ? colors.textPrimary : colors.textSecondary,
									fontWeight: m.isCurrent ? "700" : "400",
									opacity: m.isFuture ? 0.4 : 1,
								}}
							>
								{m.label}
							</Text>
						))}
					</Box>

					{active ? (
						<Box
							style={{
								pointerEvents: "none",
								position: "absolute",
								top: 0,
								left: tooltipLeft,
								width: TOOLTIP_WIDTH,
								backgroundColor: colors.surface,
								borderWidth: 1,
								borderColor: colors.border,
								borderRadius: 10,
								padding: 10,
								gap: 4,
								...shadow({ color: "#000", offsetY: 2, opacity: 0.15, radius: 8 }),
							}}
						>
							<Text className="text-xs font-semibold" style={{ color: colors.textPrimary }}>
								{monthNameLong(active.index)}
							</Text>
							{tooltipRows.map((row) => (
								<Box key={row.label} className="flex-row items-center justify-between">
									<Box className="flex-row items-center gap-1.5">
										<Box style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: row.color }} />
										<Text className="text-xs" style={{ color: colors.textSecondary }}>
											{row.label}
										</Text>
									</Box>
									<Text className="text-xs font-medium" style={{ color: colors.textPrimary }}>
										{formatCurrency(row.value)}
									</Text>
								</Box>
							))}
						</Box>
					) : null}
				</Box>
			)}
		</Box>
	);
}
