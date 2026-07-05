import { createContext, useContext, useState, useCallback } from "react";

// Passa a sessão de importação OFX do modal (escolha arquivo + banco) para a tela de revisão.
const OfxImportContext = createContext(null);

export function OfxImportProvider({ children }) {
	const [session, setSession] = useState(null);

	const startImport = useCallback((data) => setSession(data), []);
	const clearImport = useCallback(() => setSession(null), []);

	return (
		<OfxImportContext.Provider value={{ session, startImport, clearImport }}>
			{children}
		</OfxImportContext.Provider>
	);
}

export function useOfxImport() {
	const ctx = useContext(OfxImportContext);
	if (!ctx) throw new Error("useOfxImport deve ser usado dentro de OfxImportProvider");
	return ctx;
}
