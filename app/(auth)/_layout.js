import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { useAuth } from "@/state/AuthContext";
import { Redirect, Stack } from "expo-router";
import { FinanceDateProvider } from "@/state/FinanceDateContext";
import { FinanceVisibilityScopeProvider } from "@/state/FinanceVisibilityScopeContext";
import { OfxImportProvider } from "@/state/OfxImportContext";
import { InsertModalProvider } from "@/state/InsertModalContext";
import { InsertModalHost } from "@/components/finance/insert/InsertModalHost";
import { FamilyModalProvider } from "@/state/FamilyModalContext";
import { FamilyModalHost } from "@/components/family/FamilyModalHost";
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
		database.fetchAndCacheCategories().catch(() => {});
	}, [database, endSync, isLoggedIn, isReady, startSync, updateStep]);

	useEffect(() => {
		if (isReady && !isLoggedIn && !navReadySignaledRef.current) {
			navReadySignaledRef.current = true;
			signalNavReady();
		}
	}, [isReady, isLoggedIn, signalNavReady]);

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

	if (!isReady) {
		return (
			<View
				className="flex-1 justify-center items-center"
				style={{ backgroundColor: isDarkMode ? "#020617" : "#FFFFFF" }}
			>
				<Loader className="mb-[64px]" />
			</View>
		);
	}

	if (!isLoggedIn) {
		return <Redirect href="/login" />;
	}

	return (
		<FinanceDateProvider>
		<FinanceVisibilityScopeProvider>
		<OfxImportProvider>
		<InsertModalProvider>
		<FamilyModalProvider>
		<View style={{ flex: 1 }}>
			<Stack screenOptions={{ headerBackVisible: false, animation: "none" }}>
				<Stack.Screen name="(stack)" options={{ headerShown: false }} />
				<Stack.Screen name="(main)" options={{ headerShown: false }} />
				<Stack.Screen name="+not-found" />
			</Stack>

			<InsertModalHost />
			<FamilyModalHost />

			<StatusBar style={themeInverse} />

			{showLoader && (
				<Animated.View
					className="absolute inset-0 z-[998] justify-center items-center"
					style={[
						loaderStyle,
						{ backgroundColor: isDarkMode ? "#020617" : "#FFFFFF" },
					]}
				>
					<Loader className="mb-[64px]" />
				</Animated.View>
			)}
		</View>
		</FamilyModalProvider>
		</InsertModalProvider>
		</OfxImportProvider>
		</FinanceVisibilityScopeProvider>
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
