import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { useAuth } from "@/state/AuthContext";
import { Redirect, Stack } from "expo-router";
import { FinanceDateProvider } from "@/state/FinanceDateContext";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
	runOnJS,
} from "react-native-reanimated";
import Loader from "@/components/ui/loader";
import { useDatabase } from "@/hooks/useDatabase";
import { useNavReady } from "@/state/NavigationContext";
import { SyncProgressProvider, useSyncProgress } from "@/state/SyncProgressContext";
import { setupSyncNotificationChannel, requestSyncNotificationPermission } from "@/services/syncNotificationService";

function StackLayoutInner() {
	const { isLoggedIn, isReady } = useAuth();
	const { theme } = useTheme();
	const database = useDatabase();
	const signalNavReady = useNavReady();
	const { startSync, endSync, updateStep } = useSyncProgress();
	const didAutoSyncRef = useRef(false);
	const navReadySignaledRef = useRef(false);
	const isDarkMode = theme === "dark";
	const themeInverse = theme === "dark" ? "light" : "dark";

	const [showLoader, setShowLoader] = useState(true);
	const loaderOpacity = useSharedValue(1);

	const loaderStyle = useAnimatedStyle(() => ({
		opacity: loaderOpacity.value,
	}));

	useEffect(() => {
		setupSyncNotificationChannel();
		requestSyncNotificationPermission();
	}, []);

	useEffect(() => {
		if (!isReady || !isLoggedIn || didAutoSyncRef.current) return;
		didAutoSyncRef.current = true;
		startSync("Sincronizando dados...");
		database.syncAllPendingData({ force: true, onProgress: updateStep })
			.catch(() => {})
			.finally(() => endSync());
		database.fetchAndCacheCatalog().catch(() => {});
	}, [database, endSync, isLoggedIn, isReady, startSync, updateStep]);

	// Caso não logado: sinaliza navReady imediatamente para a splash desaparecer
	useEffect(() => {
		if (isReady && !isLoggedIn && !navReadySignaledRef.current) {
			navReadySignaledRef.current = true;
			signalNavReady();
		}
	}, [isReady, isLoggedIn, signalNavReady]);

	// Caso logado: fade do loader e depois sinaliza navReady
	useEffect(() => {
		if (isReady && isLoggedIn && showLoader) {
			loaderOpacity.value = withTiming(
				0,
				{ duration: 200 },
				(finished) => {
					if (finished) {
						runOnJS(setShowLoader)(false);
						if (!navReadySignaledRef.current) {
							navReadySignaledRef.current = true;
							runOnJS(signalNavReady)();
						}
					}
				}
			);
		}
	}, [isReady, isLoggedIn]);

	if (!isLoggedIn && isReady) {
		return <Redirect href="/login" />;
	}

	return (
		<FinanceDateProvider>
		<View style={{ flex: 1 }}>
			<Stack screenOptions={{ headerBackVisible: false, animation: "none" }}>
				<Stack.Screen name="(stack)" options={{ headerShown: false }} />
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
				<Stack.Screen
					name="(drawer)"
					options={{ headerShown: false }}
				/>
				<Stack.Screen name="+not-found" />
			</Stack>

			<StatusBar style={themeInverse} />

			{showLoader && (
				<Animated.View
					style={[
						loaderStyle,
						StyleSheet.absoluteFill,
						{
							zIndex: 998,
							backgroundColor: isDarkMode ? "#020617" : "#FFFFFF",
							justifyContent: "center",
							alignItems: "center",
						},
					]}
				>
					<Loader className="mb-[64px]" />
				</Animated.View>
			)}
		</View>
		</FinanceDateProvider>
	);
}

export default function StackLayout() {
	return (
		<SyncProgressProvider>
			<StackLayoutInner />
		</SyncProgressProvider>
	);
}
