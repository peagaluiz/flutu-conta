import React, { createContext, useCallback, useContext, useState } from "react";
import { View } from "react-native";
import { Spinner } from "@/components/ui/spinner";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";

const LoadingOverlayContext = createContext({
	visible: false,
	show: () => {},
	hide: () => {},
});

export function LoadingOverlayProvider({ children }) {
	const [visible, setVisible] = useState(false);
	const show = useCallback(() => setVisible(true), []);
	const hide = useCallback(() => setVisible(false), []);

	return (
		<LoadingOverlayContext.Provider value={{ visible, show, hide }}>
			{children}
			{visible && <LoadingOverlay />}
		</LoadingOverlayContext.Provider>
	);
}

function LoadingOverlay() {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const isDark = theme === "dark";

	return (
		<View
			pointerEvents="auto"
			className="absolute inset-0 z-[998] items-center justify-center"
			style={{ backgroundColor: isDark ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.55)" }}
		>
			<Spinner size="large" color={colors.brand} />
		</View>
	);
}

export function useLoadingOverlay() {
	return useContext(LoadingOverlayContext);
}
