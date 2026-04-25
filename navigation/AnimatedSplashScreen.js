import React, { useRef } from 'react';
import LottieView from 'lottie-react-native';
import { View } from 'react-native';
import SplashAnimation from '../assets/splash.json';

export default function AnimatedSplashScreen({ onAnimationFinish = () => {} }) {
    const animationRef = useRef(null);
    const hasFinished = useRef(false);

    const handleFinish = () => {
        if (hasFinished.current) return;
        hasFinished.current = true;
        animationRef.current?.pause();
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                onAnimationFinish();
            });
        });
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <LottieView
                ref={animationRef}
                loop={false}
                autoPlay
                source={SplashAnimation}
                onAnimationFinish={handleFinish}
                style={{ width: 450, height: 450 }}
            />
        </View>
    );
}