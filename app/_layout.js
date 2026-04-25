import { LogBox, Platform } from 'react-native';

LogBox.ignoreLogs([
	/shadow\*/,
	/pointerEvents is deprecated/,
]);

import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { AuthProvider } from "@/state/AuthContext";
import { ThemeProvider, useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { useEffect, useRef, useState } from "react";
import { Stack } from "expo-router";
import { db } from "@/services/database/db";
import { initializeSQLite } from "@/services/database/initializeSQLite";

import AnimatedSplashScreen from '@/navigation/AnimatedSplashScreen';
import Animated, { Easing, FadeIn, withTiming } from 'react-native-reanimated';

// ✅ Fora do RootLayout — referência estável, sem re-criação a cada render
const entering = () => {
	'worklet';
	return {
		initialValues: {
			opacity: 0,
			transform: [{ scale: 1.5 }],
		},
		animations: {
			opacity: withTiming(1, { duration: 500 }),
			transform: [{ scale: withTiming(1, { duration: 200, easing: Easing.inOut(Easing.quad) }) }],
		},
	};
};

const StackGroup = () => {
	return (
		<Stack>
			<Stack.Screen name="(auth)" options={{ headerShown: false, animation: "none" }} />
			<Stack.Screen name="login" options={{ headerShown: false, animation: "none" }} />
			<Stack.Screen name="recuperar-senha" options={{ headerShown: false, animation: "none" }} />
			<Stack.Screen name="nova-senha" options={{ headerShown: false, animation: "none" }} />
		</Stack>
	);
};

const ThemeBridge = () => {
	const { theme } = useTheme();

	return (
		<GluestackUIProvider mode={theme}>
			<Animated.View entering={Platform.OS !== 'web' ? entering : FadeIn} style={{ flex: 1 }}>
				<StackGroup />
			</Animated.View>
		</GluestackUIProvider>
	);
};

export default function RootLayout() {
	const isNative = Platform.OS !== 'web';
	const [appIsReady, setAppIsReady] = useState(!isNative);
	const [splashAnimationFinished, setSplashAnimationFinished] = useState(!isNative);
	const [dbReady, setDbReady] = useState(Platform.OS === 'web');
	const dbInitStartedRef = useRef(false);

	useEffect(() => {
		if (!isNative) return;

		async function prepare() {
			try {
				await new Promise(resolve => setTimeout(resolve, 1000));
			} catch (e) {
				console.warn(e);
			} finally {
				setAppIsReady(true);
			}
		}
		prepare();
	}, [isNative]);

	useEffect(() => {
		if (Platform.OS === 'web') {
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
				console.warn('Falha ao inicializar o SQLite local', error);
			} finally {
				if (active) setDbReady(true);
			}
		})();

		return () => {
			active = false;
		};
	}, []);

	if (isNative && (!appIsReady || !splashAnimationFinished || !dbReady)) {
		return <AnimatedSplashScreen onAnimationFinish={() => setSplashAnimationFinished(true)} />;
	}

	return (
		<AuthProvider>
			<ThemeProvider>
				<ThemeBridge />
			</ThemeProvider>
		</AuthProvider>
	);
}