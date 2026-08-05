import { useCallback, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";

// Anima o crescimento da altura do conteúdo; encolher é instantâneo.
export function AnimatedHeight({ children, duration = 280 }) {
    const heightAnim = useRef(new Animated.Value(0)).current;
    const currentHeight = useRef(0);
    const measured = useRef(false);
    const [ready, setReady] = useState(false);

    const onLayout = useCallback(
        (e) => {
            const h = e.nativeEvent.layout.height;
            if (!h || h === currentHeight.current) return;
            const grew = measured.current && h > currentHeight.current;
            currentHeight.current = h;
            if (grew) {
                Animated.timing(heightAnim, {
                    toValue: h,
                    duration,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: false,
                }).start();
            } else {
                // Encolher (ex.: entrar no skeleton) é instantâneo
                heightAnim.setValue(h);
                if (!measured.current) {
                    measured.current = true;
                    setReady(true);
                }
            }
        },
        [heightAnim, duration]
    );

    return (
        <Animated.View style={{ height: ready ? heightAnim : undefined, overflow: "hidden" }}>
            <View onLayout={onLayout}>{children}</View>
        </Animated.View>
    );
}
