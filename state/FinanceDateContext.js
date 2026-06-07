import { createContext, useContext, useState } from "react";
import { buildDefaultHomeDateRange } from "@/utils/finance/homeScreenHelpers";

const FinanceDateContext = createContext(null);

export function FinanceDateProvider({ children }) {
	const [dateRange, setDateRange] = useState(() => buildDefaultHomeDateRange());
	const [dateField, setDateField] = useState("data_vencimento");
	return (
		<FinanceDateContext.Provider value={{ dateRange, setDateRange, dateField, setDateField }}>
			{children}
		</FinanceDateContext.Provider>
	);
}

export function useFinanceDate() {
	return useContext(FinanceDateContext);
}
