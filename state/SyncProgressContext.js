import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import {
	showSyncNotification,
	dismissSyncNotification,
} from "@/services/syncNotificationService";

const SyncProgressContext = createContext({
	startSync: () => {},
	endSync: () => {},
	updateStep: () => {},
	isSyncing: false,
});

export function SyncProgressProvider({ children }) {
	const countRef = useRef(0);
	const [isSyncing, setIsSyncing] = useState(false);

	const startSync = useCallback(async (step = "Sincronizando dados...") => {
		countRef.current += 1;
		setIsSyncing(true);
		await showSyncNotification(step);
	}, []);

	const endSync = useCallback(async () => {
		countRef.current = Math.max(0, countRef.current - 1);
		if (countRef.current === 0) {
			setIsSyncing(false);
			await dismissSyncNotification();
		}
	}, []);

	const updateStep = useCallback(async (step) => {
		if (countRef.current > 0) {
			await showSyncNotification(step);
		}
	}, []);

	return (
		<SyncProgressContext.Provider value={{ startSync, endSync, updateStep, isSyncing }}>
			{children}
		</SyncProgressContext.Provider>
	);
}

export function useSyncProgress() {
	return useContext(SyncProgressContext);
}
