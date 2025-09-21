import { useEffect, useState } from "react"
import { Platform } from 'react-native';
import "@/global.css";
import { GluestackUIProvider } from "./components/ui/gluestack-ui-provider";
import { ThemeProvider } from "./components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import StackNavigator from './src/app/StackNavigator';

import Animated, { FadeIn, withTiming, Easing } from 'react-native-reanimated';
import AnimatedSplashScreen from './src/app/AnimatedSplashScreen';

// Fonts
import * as Font from 'expo-font';
import { Roboto_400Regular, Roboto_700Bold } from "@expo-google-fonts/roboto"
import { MuseoModerno_400Regular } from "@expo-google-fonts/museomoderno";

export default function App() {
    var entering = null;
    if (Platform.OS !== 'web') {
        const [appIsReady, setAppIsReady] = useState(false);
        const [splashAnimationFinished, setSplashAnimationFinished] = useState(false);

        useEffect(() => {
            async function prepare() {
                try {
                    await Font.loadAsync({ Roboto_400Regular, Roboto_700Bold, MuseoModerno_400Regular });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (e) {
                    console.warn(e);
                } finally {
                    setAppIsReady(true);
                }
            }
            prepare();
        }, []);

        if (!appIsReady || !splashAnimationFinished) {
            return <AnimatedSplashScreen onAnimationFinish={() => setSplashAnimationFinished(true)} />
        }

        entering = (targetValues) => {
            'worklet';
            const animations = {
                opacity: withTiming(1, { duration: 500 }),
                transform: [{ scale: withTiming(1, { duration: 200, easing: Easing.inOut(Easing.quad) }) }],
            };
            const initialValues = {
                opacity: 0,
                transform: [{ scale: 1.5 }],
            };
            return {
                initialValues,
                animations,
            };
        };
    }

    return (
        <ThemeProvider>
            <GluestackUIProvider>
				<Animated.View entering={entering || FadeIn} style={{ flex: 1 }}>
                    <StackNavigator />
                </Animated.View>
            </GluestackUIProvider>
        </ThemeProvider>
    );
}
