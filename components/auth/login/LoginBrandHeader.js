import { useEffect } from "react";
import { View, Text as RNText } from "react-native";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	useReducedMotion,
	withDelay,
	withSpring,
	withTiming,
	Easing,
} from "react-native-reanimated";
import { Send } from "lucide-react-native";
import { shadow } from "@/utils/shadow";

const smooth = Easing.bezier(0.22, 1, 0.36, 1);

export function LoginBrandHeader({ colors }) {
	const reduceMotion = useReducedMotion();
	const logo = useSharedValue(reduceMotion ? 1 : 0);
	const logoOpacity = useSharedValue(reduceMotion ? 1 : 0);
	const word = useSharedValue(reduceMotion ? 1 : 0);

	useEffect(() => {
		if (reduceMotion) return;
		logoOpacity.value = withTiming(1, { duration: 260 });
		// Bounce com leve overshoot, só no logo mark
		logo.value = withSpring(1, { damping: 14, stiffness: 180 });
		word.value = withDelay(200, withTiming(1, { duration: 560, easing: smooth }));
	}, []);

	const logoStyle = useAnimatedStyle(() => ({
		opacity: logoOpacity.value,
		transform: [
			{ translateY: -22 * (1 - logo.value) },
			{ scale: 0.7 + 0.3 * logo.value },
		],
	}));

	const wordStyle = useAnimatedStyle(() => ({
		opacity: word.value,
		transform: [{ translateY: 10 * (1 - word.value) }],
	}));

	return (
		<View style={{ alignItems: "center", gap: 12 }}>
			<Animated.View
				style={[
					{
						width: 64,
						height: 64,
						borderRadius: 18,
						backgroundColor: colors.brandMark,
						alignItems: "center",
						justifyContent: "center",
						...shadow({ color: colors.brandMark, offsetY: 10, opacity: 0.35, radius: 14, elevation: 8 }),
					},
					logoStyle,
				]}
			>
				<Send size={28} color="#FFFFFF" strokeWidth={2} />
			</Animated.View>

			<Animated.View style={wordStyle}>
				<RNText
					style={{
						fontSize: 22,
						fontWeight: "800",
						letterSpacing: -0.4,
						color: colors.textPrimary,
					}}
				>
					flutu <RNText style={{ color: colors.brandMark }}>conta</RNText>
				</RNText>
			</Animated.View>
		</View>
	);
}
