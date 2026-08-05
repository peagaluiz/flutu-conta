// Download de arquivo gerado em memória. Só existe no web — no nativo retorna
// false para o chamador decidir o fallback.
export function downloadTextFile(filename, content, mimeType = "text/plain;charset=utf-8") {
	if (typeof document === "undefined" || typeof URL?.createObjectURL !== "function") {
		return false;
	}
	const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	// Revogar no mesmo tick cancela o download em alguns navegadores.
	setTimeout(() => URL.revokeObjectURL(url), 1000);
	return true;
}
