import { Platform, useWindowDimensions } from "react-native";

export const DESKTOP_MIN_WIDTH = 1024;

// "PC" = navegador web com tela larga. Reativo a resize; navegador de celular
// continua no layout mobile. No app nativo sempre retorna false.
export function useIsDesktopWeb() {
	const { width } = useWindowDimensions();
	return Platform.OS === "web" && width >= DESKTOP_MIN_WIDTH;
}
