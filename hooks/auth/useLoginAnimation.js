import { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import {
	useAnimatedStyle,
	useSharedValue,
	useReducedMotion,
	withDelay,
	withTiming,
	Easing,
} from "react-native-reanimated";
import { LOGIN_SHEET_DELAY } from "@/components/auth/login/loginEntering";

export function useLoginAnimation() {
	const { height } = useWindowDimensions();
	const reduceMotion = useReducedMotion();
	const translateY = useSharedValue(reduceMotion ? 0 : height);

	useEffect(() => {
		if (reduceMotion) return;
		translateY.value = withDelay(
			LOGIN_SHEET_DELAY,
			withTiming(0, {
				duration: 600,
				easing: Easing.out(Easing.exp),
			})
		);
	}, []);

	return useAnimatedStyle(() => ({
		transform: [{ translateY: translateY.value }],
	}));
}
