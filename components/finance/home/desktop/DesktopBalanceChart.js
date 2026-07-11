import { useCallback, useRef, useState } from "react";
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from "react-native-svg";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { formatCurrency } from "@/utils/finance/helpers";
import { DesktopCard } from "./DesktopCard";
import { shadow } from "@/utils/shadow";

const CHART_HEIGHT = 180;
const PAD_TOP = 16;
const PAD_BOTTOM = 16;
const PAD_X = 0;
const TOOLTIP_WIDTH = 170;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function DesktopBalanceChart({ points, loading = false }) {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const [width, setWidth] = useState(0);
	const [hoverIndex, setHoverIndex] = useState(null);
	const plotRef = useRef(null);
	const observerRef = useRef(null);

	// Callback ref: o Box do gráfico só monta quando há dados, então anexamos o
	// ResizeObserver no momento em que o nó realmente existe (não na montagem).
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

	const hasData = Array.isArray(points) && points.length >= 2;
	const chartWidth = width || 600;

	const series = [
		{ key: "saldo", label: "Saldo", color: colors.brand },
		{ key: "entradas", label: "Entradas", color: "#16A34A" },
		{ key: "saidas", label: "Saídas", color: "#DC2626" },
	];

	const allValues = hasData
		? points.flatMap((p) => [p.saldo, p.entradas, p.saidas])
		: [];
	const maxValue = hasData ? Math.max(0, ...allValues) : 0;
	const minValue = hasData ? Math.min(0, ...allValues) : 0;
	const span = maxValue - minValue;
	const usableH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

	const xFor = (i) => PAD_X + (i / (points.length - 1)) * (chartWidth - 2 * PAD_X);
	const yFor = (v) => {
		const ratio = span === 0 ? 0.5 : (v - minValue) / span;
		return PAD_TOP + usableH - ratio * usableH;
	};

	// Spline suave (Catmull-Rom → Bézier) para uma linha curva sem quinas.
	const buildLine = (key) => {
		const pts = points.map((p, i) => ({ x: xFor(i), y: yFor(p[key]) }));
		if (pts.length < 2) return "";
		let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
		for (let i = 0; i < pts.length - 1; i++) {
			const p0 = pts[i - 1] || pts[i];
			const p1 = pts[i];
			const p2 = pts[i + 1];
			const p3 = pts[i + 2] || p2;
			const cp1x = p1.x + (p2.x - p0.x) / 6;
			const cp1y = p1.y + (p2.y - p0.y) / 6;
			const cp2x = p2.x - (p3.x - p1.x) / 6;
			const cp2y = p2.y - (p3.y - p1.y) / 6;
			d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
		}
		return d;
	};

	const saldoLine = hasData ? buildLine("saldo") : "";
	const saldoArea = hasData
		? `${saldoLine} L ${xFor(points.length - 1).toFixed(1)} ${yFor(minValue).toFixed(1)} L ${xFor(0).toFixed(1)} ${yFor(minValue).toFixed(1)} Z`
		: "";

	const handleMove = (e) => {
		if (!hasData || !plotRef.current?.getBoundingClientRect) return;
		const rect = plotRef.current.getBoundingClientRect();
		const offsetX = e.clientX - rect.left;
		const ratio = (offsetX - PAD_X) / (chartWidth - 2 * PAD_X);
		const idx = clamp(Math.round(ratio * (points.length - 1)), 0, points.length - 1);
		setHoverIndex(idx);
	};

	const active = hoverIndex != null ? points[hoverIndex] : null;
	const hoverX = active ? xFor(hoverIndex) : 0;
	const tooltipLeft = clamp(hoverX - TOOLTIP_WIDTH / 2, 0, Math.max(0, chartWidth - TOOLTIP_WIDTH));

	return (
		<DesktopCard title="Evolução do saldo" contentClassName="gap-3" style={{ minHeight: 306 }}>
			{loading ? (
				<Skeleton style={{ height: CHART_HEIGHT + 32, borderRadius: 12 }} />
			) : !hasData ? (
				<Box style={{ height: CHART_HEIGHT }} className="items-center justify-center">
					<Text className="text-sm" style={{ color: colors.textSecondary }}>
						Sem dados suficientes neste período.
					</Text>
				</Box>
			) : (
				<>
					<Box className="flex-row gap-4">
						{series.map((s) => (
							<Box key={s.key} className="flex-row items-center gap-1.5">
								<Box style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
								<Text className="text-xs" style={{ color: colors.textSecondary }}>
									{s.label}
								</Text>
							</Box>
						))}
					</Box>

					<Box
						ref={setPlotNode}
						style={{ height: CHART_HEIGHT, position: "relative" }}
						onMouseMove={handleMove}
						onMouseLeave={() => setHoverIndex(null)}
					>
						{span !== 0 && (
							<>
								<Text
									className="text-xs"
									style={{ position: "absolute", top: 0, right: 0, color: colors.textSecondary }}
								>
									{formatCurrency(maxValue)}
								</Text>
								<Text
									className="text-xs"
									style={{ position: "absolute", bottom: 0, right: 0, color: colors.textSecondary }}
								>
									{formatCurrency(minValue)}
								</Text>
							</>
						)}
						<Svg width={chartWidth} height={CHART_HEIGHT} style={{ overflow: "visible" }}>
							<Defs>
								<LinearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
									<Stop offset="0" stopColor={colors.brand} stopOpacity="0.22" />
									<Stop offset="1" stopColor={colors.brand} stopOpacity="0.02" />
								</LinearGradient>
							</Defs>
							<Path d={saldoArea} fill="url(#balanceFill)" />
							{series.map((s) => (
								<Path key={s.key} d={buildLine(s.key)} stroke={s.color} strokeWidth={2.5} fill="none" />
							))}
							{active && (
								<Line
									x1={hoverX}
									y1={PAD_TOP}
									x2={hoverX}
									y2={CHART_HEIGHT - PAD_BOTTOM}
									stroke={colors.border}
									strokeWidth={1}
									strokeDasharray="4 4"
								/>
							)}
							{series.map((s) =>
								points.map((p, i) => {
									const isActive = i === hoverIndex;
									return (
										<Circle
											key={`${s.key}-${i}`}
											cx={xFor(i)}
											cy={yFor(p[s.key])}
											r={isActive ? 4.5 : 3}
											fill={isActive ? s.color : colors.surface}
											stroke={s.color}
											strokeWidth={2}
										/>
									);
								})
							)}
						</Svg>

						{active && (
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
									{active.label}
								</Text>
								{series.map((s) => (
									<Box key={s.key} className="flex-row items-center justify-between">
										<Box className="flex-row items-center gap-1.5">
											<Box style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} />
											<Text className="text-xs" style={{ color: colors.textSecondary }}>
												{s.label}
											</Text>
										</Box>
										<Text className="text-xs font-medium" style={{ color: colors.textPrimary }}>
											{formatCurrency(active[s.key])}
										</Text>
									</Box>
								))}
							</Box>
						)}
					</Box>

					<Box style={{ height: 16, position: "relative" }}>
						{points.map((p, i) => {
							const isFirst = i === 0;
							const isLast = i === points.length - 1;
							const anchor = isFirst
								? { left: 0, textAlign: "left" }
								: isLast
								? { right: 0, textAlign: "right" }
								: { left: xFor(i) - 30, width: 60, textAlign: "center" };
							return (
								<Text
									key={i}
									numberOfLines={1}
									className="text-xs"
									style={{ position: "absolute", color: colors.textSecondary, ...anchor }}
								>
									{p.label}
								</Text>
							);
						})}
					</Box>
				</>
			)}
		</DesktopCard>
	);
}
