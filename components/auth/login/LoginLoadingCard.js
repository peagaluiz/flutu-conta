import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	FadeOut,
	useSharedValue,
	useAnimatedStyle,
	withRepeat,
	withSequence,
	withTiming,
	Easing,
} from "react-native-reanimated";

export function LoginLoadingCard({ colors }) {
	const pulse = useSharedValue(0.45);

	useEffect(() => {
		pulse.value = withRepeat(
			withSequence(
				withTiming(1, { duration: 650, easing: Easing.inOut(Easing.ease) }),
				withTiming(0.45, { duration: 650, easing: Easing.inOut(Easing.ease) })
			),
			-1
		);
	}, []);

	const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

	const block = { backgroundColor: colors.surfaceMuted };

	return (
		<Animated.View
			exiting={FadeOut.duration(180)}
			style={{ alignItems: "center", gap: 18, paddingBottom: 6 }}
		>
			<Animated.View
				style={[pulseStyle, block, { width: 84, height: 84, borderRadius: 999 }]}
			/>

			<Animated.View style={[pulseStyle, { alignItems: "center", gap: 8 }]}>
				<View style={[block, { width: 150, height: 18, borderRadius: 9 }]} />
				<View style={[block, { width: 210, height: 13, borderRadius: 7 }]} />
			</Animated.View>

			<Animated.View
				style={[pulseStyle, block, { width: "100%", height: 54, borderRadius: 16 }]}
			/>
		</Animated.View>
	);
}
