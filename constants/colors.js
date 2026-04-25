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
    dangerBg: "#FEE2E2",
    dangerText: "#B91C1C",
    success: "#22C55E",
  },
  dark: {
    screen: "#121212",
    surface: "#1C1C1E",
    surfaceAlt: "#0F172A",
    surfaceMuted: "rgba(255,255,255,0.05)",
    surfaceOverlay: "rgba(255,255,255,0.10)",
    border: "rgba(255,255,255,0.10)",
    borderStrong: "rgba(255,255,255,0.14)",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
    brand: "#93C5FD",
    dangerBg: "rgba(239,68,68,0.15)",
    dangerText: "#FCA5A5",
    success: "#22C55E",
  },
};

export function getThemeColors(theme) {
  return theme === "dark" ? APP_COLORS.dark : APP_COLORS.light;
}
