import { useEffect, useState } from 'react';
import { ThemeProvider } from 'styled-components';
import Animated, { FadeIn } from 'react-native-reanimated';
import StackNavigator from './src/StackNavigator';
import AnimatedSplashScreen from './src/AnimatedSplashScreen';

// Fonts
import * as Font from 'expo-font';
import { Roboto_400Regular, Roboto_700Bold } from "@expo-google-fonts/roboto"
import { MuseoModerno_400Regular } from "@expo-google-fonts/museomoderno";
import { theme } from './src/theme';

export default function App() {
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

    return (
        <Animated.View style={{ flex: 1 }} entering={FadeIn}>
            <ThemeProvider theme={theme}>
                <StackNavigator />
            </ThemeProvider>
        </Animated.View>
    );
}
