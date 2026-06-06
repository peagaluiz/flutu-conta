import { LogBox, Platform, StyleSheet, View } from "react-native";
import { PaperProvider } from "react-native-paper";
import { registerTranslation, pt } from "react-native-paper-dates";

LogBox.ignoreLogs([/shadow\*/, /pointerEvents is deprecated/]);

registerTranslation("pt", pt);

import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { AuthProvider } from "@/state/AuthContext";
import {
	ThemeProvider,
	useTheme,
} from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { useCallback, useEffect, useRef, useState } from "react";
import { Stack } from "expo-router";
import { db } from "@/services/database/db";
import { initializeSQLite } from "@/services/database/initializeSQLite";

import AnimatedSplashScreen from "@/components/AnimatedSplashScreen";
import Animated, { FadeOut } from "react-native-reanimated";
import NavigationContext, { NavReadyStateContext } from "@/state/NavigationContext";
import { SelectorOverlayProvider } from "@/state/SelectorOverlayContext";

const StackGroup = () => {
	return (
		<Stack>
			<Stack.Screen
				name="(auth)"
				options={{ headerShown: false, animation: "none" }}
			/>
			<Stack.Screen
				name="login"
				options={{ headerShown: false, animation: "none" }}
			/>
			<Stack.Screen
				name="recuperar-senha"
				options={{ headerShown: false, animation: "none" }}
			/>
			<Stack.Screen
				name="nova-senha"
				options={{ headerShown: false, animation: "none" }}
			/>
		</Stack>
	);
};

const ThemeBridge = () => {
	const { theme } = useTheme();

	return (
		<GluestackUIProvider mode={theme}>
			<StackGroup />
		</GluestackUIProvider>
	);
};

export default function RootLayout() {
	const isNative = Platform.OS !== "web";
	const [appIsReady, setAppIsReady] = useState(!isNative);
	const [splashAnimationFinished, setSplashAnimationFinished] = useState(
		!isNative
	);
	const [dbReady, setDbReady] = useState(Platform.OS === "web");
	const [navReady, setNavReady] = useState(!isNative);
	const dbInitStartedRef = useRef(false);
	const navReadyCalledRef = useRef(!isNative);

	const signalNavReady = useCallback(() => {
		if (!navReadyCalledRef.current) {
			navReadyCalledRef.current = true;
			setNavReady(true);
		}
	}, []);

	useEffect(() => {
		if (!isNative) return;

		async function prepare() {
			try {
				await new Promise((resolve) => setTimeout(resolve, 1000));
			} catch (e) {
				console.warn(e);
			} finally {
				setAppIsReady(true);
			}
		}
		prepare();
	}, [isNative]);

	useEffect(() => {
		if (Platform.OS === "web") {
			setDbReady(true);
			return;
		}

		if (!db || dbInitStartedRef.current) return;
		dbInitStartedRef.current = true;

		let active = true;

		(async () => {
			try {
				await initializeSQLite(db);
			} catch (error) {
				console.warn("Falha ao inicializar o SQLite local", error);
			} finally {
				if (active) setDbReady(true);
			}
		})();

		return () => {
			active = false;
		};
	}, []);

	const showSplash =
		isNative &&
		(!appIsReady || !splashAnimationFinished || !dbReady || !navReady);

	return (
		<PaperProvider>
		<NavigationContext.Provider value={signalNavReady}>
		<NavReadyStateContext.Provider value={!showSplash}>
			<SelectorOverlayProvider>
			<AuthProvider>
				<ThemeProvider>
					<View style={{ flex: 1 }}>
						<ThemeBridge />
						{showSplash && (
							<Animated.View
								style={[
									StyleSheet.absoluteFill,
									{ zIndex: 999, backgroundColor: "#FFFFFF" },
								]}
								exiting={FadeOut.duration(300)}
							>
								<AnimatedSplashScreen
									onAnimationFinish={() =>
										setSplashAnimationFinished(true)
									}
								/>
							</Animated.View>
						)}
					</View>
				</ThemeProvider>
			</AuthProvider>
			</SelectorOverlayProvider>
		</NavReadyStateContext.Provider>
		</NavigationContext.Provider>
		</PaperProvider>
	);
}
