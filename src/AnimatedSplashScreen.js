import React from 'react';
import LottieView from 'lottie-react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import SplashAnimation from '../assets/splash.json';

export default function AnimatedSplashScreen({ theme, onAnimationFinish = () => { } }) {
    theme = theme?.colors ? theme : (theme.mode === 'dark' ? theme.darkColors : theme.lightColors);

    return (
        <Animated.View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.surface,
        }} exiting={FadeOut.duration(500)}>
            <LottieView
                loop={false}
                autoPlay
                source={SplashAnimation}
                onAnimationFinish={onAnimationFinish}
                style={{
                    width: 450,
                    height: 450
                }}
            />
        </Animated.View>
    );
}