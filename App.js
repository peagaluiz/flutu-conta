import { useEffect, useState } from 'react';
import { ThemeProvider as RNEUIThemeProvider, createTheme } from '@rneui/themed';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import Animated, { FadeIn } from 'react-native-reanimated';
import StackNavigator from './src/StackNavigator';
import AnimatedSplashScreen from './src/AnimatedSplashScreen';

// Fonts
import * as Font from 'expo-font';
import { Roboto_400Regular, Roboto_700Bold } from "@expo-google-fonts/roboto"
import { MuseoModerno_400Regular } from "@expo-google-fonts/museomoderno";

export default function App() {
    const theme = createTheme({
        mode: 'dark',
        darkColors: {
            tertiary: '#1d1b1d',
            accent: '#2c2f30',
            surface: '#232224',
            flutu: '#55539f',
            text: '#FFF',
            textSecondary: '#B5B5B5'
        },
        lightColors: {
            tertiary: '#EBEBEB',
            accent: '#FFF',
            surface: '#F4F7F9',
            flutu: '#55539f',
            text: '#000',
            textSecondary: '#B5B5B5'
        }
    });

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
        return <AnimatedSplashScreen theme={theme} onAnimationFinish={() => setSplashAnimationFinished(true)} />
    }

    return (
        <Animated.View style={{ flex: 1 }} entering={FadeIn}>
            <RNEUIThemeProvider theme={theme}>
                <StyledThemeProvider theme={theme}>
                    <StackNavigator />
                </StyledThemeProvider>
            </RNEUIThemeProvider>
        </Animated.View>
    );
}
