import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const CHANNEL_ID = "flutu-sync";
const NOTIF_ID = "flutu-sync-progress";

// Libera exibição de notificações com app em foreground
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowBanner: true,
		shouldShowList: true,
		shouldPlaySound: false,
		shouldSetBadge: false,
	}),
});

export async function setupSyncNotificationChannel() {
	if (Platform.OS !== "android") return;
	try {
		await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
			name: "Sincronização",
			importance: Notifications.AndroidImportance.LOW,
			enableVibrate: false,
			showBadge: false,
		});
	} catch {}
}

export async function requestSyncNotificationPermission() {
	if (Platform.OS !== "android") return;
	try {
		const { status } = await Notifications.getPermissionsAsync();
		if (status !== "granted") {
			await Notifications.requestPermissionsAsync();
		}
	} catch {}
}

// Usa identifier fixo para que chamadas subsequentes atualizem a mesma
// notificação no lugar em vez de criar novas
export async function showSyncNotification(step = "Sincronizando dados...") {
	if (Platform.OS !== "android") return;
	try {
		await Notifications.scheduleNotificationAsync({
			identifier: NOTIF_ID,
			content: {
				title: "Sincronização",
				body: step,
				sound: false,
				sticky: false,
				autoDismiss: false,
				priority: "low",
			},
			trigger: null,
		});
	} catch {}
}

export async function dismissSyncNotification() {
	try {
		await Notifications.dismissNotificationAsync(NOTIF_ID);
	} catch {}
}
