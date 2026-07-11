import { Platform } from "react-native";

import { LAST_ACTIVE_KEY } from "@/constants/security";

let AsyncStorage = null;
if (Platform.OS !== "web") {
	AsyncStorage = require("@react-native-async-storage/async-storage").default;
}

function getWebStorage() {
	if (typeof window === "undefined") return null;
	return window.localStorage;
}

export async function getLastActive() {
	try {
		const value = AsyncStorage
			? await AsyncStorage.getItem(LAST_ACTIVE_KEY)
			: getWebStorage()?.getItem(LAST_ACTIVE_KEY);
		const timestamp = Number(value);

		return value !== null && Number.isFinite(timestamp) ? timestamp : null;
	} catch {
		return null;
	}
}

export async function setLastActive(timestamp) {
	const value = String(timestamp);

	try {
		if (AsyncStorage) {
			await AsyncStorage.setItem(LAST_ACTIVE_KEY, value);
			return;
		}

		getWebStorage()?.setItem(LAST_ACTIVE_KEY, value);
	} catch {
		// The in-memory timer still protects the current session when storage fails.
	}
}

export async function clearLastActive() {
	try {
		if (AsyncStorage) {
			await AsyncStorage.removeItem(LAST_ACTIVE_KEY);
			return;
		}

		getWebStorage()?.removeItem(LAST_ACTIVE_KEY);
	} catch {
		// There is nothing else to clear when storage is unavailable.
	}
}
