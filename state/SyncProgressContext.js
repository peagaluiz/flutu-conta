import React, { createContext, useCallback, useContext, useRef } from "react";
import {
	showSyncNotification,
	dismissSyncNotification,
} from "@/services/syncNotificationService";

const SyncProgressContext = createContext({
	startSync: () => {},
	endSync: () => {},
	updateStep: () => {},
});

export function SyncProgressProvider({ children }) {
	const countRef = useRef(0);

	const startSync = useCallback(async (step = "Sincronizando dados...") => {
		countRef.current += 1;
		await showSyncNotification(step);
	}, []);

	const endSync = useCallback(async () => {
		countRef.current = Math.max(0, countRef.current - 1);
		if (countRef.current === 0) {
			await dismissSyncNotification();
		}
	}, []);

	const updateStep = useCallback(async (step) => {
		if (countRef.current > 0) {
			await showSyncNotification(step);
		}
	}, []);

	return (
		<SyncProgressContext.Provider value={{ startSync, endSync, updateStep }}>
			{children}
		</SyncProgressContext.Provider>
	);
}

export function useSyncProgress() {
	return useContext(SyncProgressContext);
}
