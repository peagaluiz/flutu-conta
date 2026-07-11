import { Platform } from "react-native";

function hexToRgba(hex, opacity) {
	if (typeof hex !== "string" || hex[0] !== "#") return hex;
	let h = hex.slice(1);
	if (h.length === 3) h = h.split("").map((c) => c + c).join("");
	const num = parseInt(h, 16);
	if (Number.isNaN(num)) return hex;
	const r = (num >> 16) & 255;
	const g = (num >> 8) & 255;
	const b = num & 255;
	return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Sombra cross-platform: na web usa boxShadow (as props shadow* são deprecadas
// no RN Web), no nativo mantém shadow*/elevation.
export function shadow({
	color = "#000",
	offsetX = 0,
	offsetY = 0,
	opacity = 0.2,
	radius = 0,
	elevation = 0,
} = {}) {
	if (Platform.OS === "web") {
		return {
			boxShadow: `${offsetX}px ${offsetY}px ${radius}px ${hexToRgba(color, opacity)}`,
		};
	}
	return {
		shadowColor: color,
		shadowOffset: { width: offsetX, height: offsetY },
		shadowOpacity: opacity,
		shadowRadius: radius,
		elevation,
	};
}
