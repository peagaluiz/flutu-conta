import { createContext, useContext, useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildDefaultHomeDateRange } from "@/utils/finance/homeScreenHelpers";

const DATE_INPUT_MODE_KEY = "finance_date_input_mode";

const FinanceDateContext = createContext(null);

export function FinanceDateProvider({ children }) {
	const [dateRange, setDateRange] = useState(() => buildDefaultHomeDateRange());
	const [dateField, setDateField] = useState("data_vencimento");
	const [dateInputMode, setDateInputModeState] = useState("detalhado");

	useEffect(() => {
		AsyncStorage.getItem(DATE_INPUT_MODE_KEY)
			.then((stored) => {
				if (stored === "simplificado" || stored === "detalhado") {
					setDateInputModeState(stored);
				}
			})
			.catch(() => {});
	}, []);

	const setDateInputMode = useCallback((mode) => {
		setDateInputModeState(mode);
		AsyncStorage.setItem(DATE_INPUT_MODE_KEY, mode).catch(() => {});
	}, []);

	return (
		<FinanceDateContext.Provider
			value={{
				dateRange,
				setDateRange,
				dateField,
				setDateField,
				dateInputMode,
				setDateInputMode,
			}}
		>
			{children}
		</FinanceDateContext.Provider>
	);
}

export function useFinanceDate() {
	return useContext(FinanceDateContext);
}
