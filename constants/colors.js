export const APP_COLORS = {
	light: {
		screen: "#F3F4F6",
		surface: "#FFFFFF",
		surfaceAlt: "#F8FAFC",
		surfaceMuted: "#EEF2F7",
		surfaceOverlay: "rgba(255,255,255,0.80)",
		border: "#E2E8F0",
		borderStrong: "#CBD5E1",
		textPrimary: "#0F172A",
		textSecondary: "#64748B",
		brand: "#2563EB",
		brandSoft: "#DBE7FE",
		brandMark: "#6D5AE8",
		dangerBg: "#FEE2E2",
		dangerText: "#B91C1C",
		success: "#22C55E",
	},
	dark: {
		screen: "#0B0B0C",
		surface: "#1C1C1E",
		surfaceAlt: "#0F172A",
		surfaceMuted: "rgba(255,255,255,0.06)",
		surfaceOverlay: "rgba(255,255,255,0.10)",
		border: "rgba(255,255,255,0.10)",
		borderStrong: "rgba(255,255,255,0.16)",
		textPrimary: "#F8FAFC",
		textSecondary: "#94A3B8",
		brand: "#3B82F6",
		brandSoft: "rgba(59,130,246,0.18)",
		brandMark: "#8B7CF6",
		dangerBg: "rgba(239,68,68,0.15)",
		dangerText: "#FCA5A5",
		success: "#22C55E",
	},
};

export function getThemeColors(theme) {
	return theme === "dark" ? APP_COLORS.dark : APP_COLORS.light;
}
