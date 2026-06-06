import { createContext, useContext, useState } from "react";
import { buildDefaultHomeDateRange } from "@/utils/finance/homeScreenHelpers";

const FinanceDateContext = createContext(null);

export function FinanceDateProvider({ children }) {
	const [dateRange, setDateRange] = useState(() => buildDefaultHomeDateRange());
	return (
		<FinanceDateContext.Provider value={{ dateRange, setDateRange }}>
			{children}
		</FinanceDateContext.Provider>
	);
}

export function useFinanceDate() {
	return useContext(FinanceDateContext);
}
