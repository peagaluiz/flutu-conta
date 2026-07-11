// Primitivos .web.tsx renderizam elementos DOM crus; react-dom rejeita arrays
// de estilo (padrão RN válido), então achatamos antes de repassar.
export function flattenWebStyle(style) {
	if (!Array.isArray(style)) return style;
	const flat = {};
	for (const entry of style.flat(Infinity)) {
		if (!entry) continue;
		Object.assign(flat, flattenWebStyle(entry));
	}
	return flat;
}
