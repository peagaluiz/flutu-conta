import { useEffect } from "react";
import {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
	Easing,
} from "react-native-reanimated";

export function useLoginAnimation() {
	const translateY = useSharedValue(260);
	const opacity = useSharedValue(0);

	useEffect(() => {
		translateY.value = withTiming(0, {
			duration: 560,
			easing: Easing.out(Easing.cubic),
		});
		opacity.value = withTiming(1, {
			duration: 380,
			easing: Easing.out(Easing.quad),
		});
	}, []);

	return useAnimatedStyle(() => ({
		opacity: opacity.value,
		transform: [{ translateY: translateY.value }],
	}));
}
