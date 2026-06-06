import React, { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "expo-router";

const InsertInterceptContext = createContext(null);

export function InsertInterceptProvider({ children }) {
	const [isOpen, setIsOpen] = useState(false);
	const router = useRouter();

	const openIntercept = useCallback(() => setIsOpen(true), []);
	const closeIntercept = useCallback(() => setIsOpen(false), []);

	const handleNova = useCallback(() => {
		setIsOpen(false);
		router.push("/(auth)/(stack)/insert");
	}, [router]);

	const handleImportar = useCallback(() => {
		setIsOpen(false);
		console.log("Importar lançamento");
	}, []);

	return (
		<InsertInterceptContext.Provider
			value={{ isOpen, openIntercept, closeIntercept, handleNova, handleImportar }}
		>
			{children}
		</InsertInterceptContext.Provider>
	);
}

export function useInsertIntercept() {
	return useContext(InsertInterceptContext);
}
