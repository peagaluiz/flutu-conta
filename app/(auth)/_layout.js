import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { useAuth } from "@/state/AuthContext";
import { Box } from "@/components/ui/box";
import { Redirect, Stack } from "expo-router";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
	runOnJS,
} from 'react-native-reanimated';
import Loader from "@/components/ui/loader";
import { useDatabase } from "@/services/database/useDatabase";

export default function StackLayout() {
	const { isLoggedIn, isReady } = useAuth();
	const { theme } = useTheme();
	const database = useDatabase();
	const didAutoSyncRef = useRef(false);
	const isDarkMode = theme === "dark";
	const themeInverse = theme === "dark" ? "light" : "dark";

	const [showLoader, setShowLoader] = useState(true);
	const loaderOpacity = useSharedValue(1);

	const loaderStyle = useAnimatedStyle(() => ({
		opacity: loaderOpacity.value,
	}));

	useEffect(() => {
		if (!isReady || !isLoggedIn || didAutoSyncRef.current) return;
		didAutoSyncRef.current = true;
		database.syncAllPendingData({ force: true }).catch(() => { });
	}, [database, isLoggedIn, isReady]);

	useEffect(() => {
		if (isReady && showLoader) {
			loaderOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
				if (finished) runOnJS(setShowLoader)(false);
			});
		}
	}, [isReady]);

	if (!isLoggedIn && isReady) {
		return <Redirect href="/login" />;
	}

	return (
		<>
			{showLoader && (
				<Box className="flex-1 justify-center items-center w-full h-full">
					<Animated.View
						style={[
							loaderStyle,
							{
								position: 'absolute',
								width: '100%',
								height: '100%',
								zIndex: 998,
								backgroundColor: isDarkMode ? "#020617" : "#FFFFFF"
							}
						]}
					>
						<Loader className="mb-[64px]" />
					</Animated.View>
				</Box>
			)}

			<Stack screenOptions={{ headerBackVisible: false }}>
				<Stack.Screen name="(stack)" options={{ headerShown: false }} />
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
				<Stack.Screen name="(drawer)" options={{ headerShown: false }} />
				<Stack.Screen name="+not-found" />
			</Stack>

			<StatusBar style={themeInverse} />
		</>
	);
}