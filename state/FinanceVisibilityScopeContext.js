import { createContext, useContext, useState } from "react";

const FinanceVisibilityScopeContext = createContext(null);

export function FinanceVisibilityScopeProvider({ children }) {
	const [visibilityScope, setVisibilityScope] = useState("all");
	return (
		<FinanceVisibilityScopeContext.Provider value={{ visibilityScope, setVisibilityScope }}>
			{children}
		</FinanceVisibilityScopeContext.Provider>
	);
}

export function useFinanceVisibilityScope() {
	return useContext(FinanceVisibilityScopeContext);
}
