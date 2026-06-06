import { useEffect } from "react";
import { Keyboard } from "react-native";
import Animated, {
	useSharedValue,
	withSpring,
	useAnimatedStyle,
} from "react-native-reanimated";

const DEFAULT_SPRING = { damping: 20, stiffness: 200 };

/**
 * Retorna um componente <KeyboardSpacer /> que cresce quando o teclado abre.
 *
 * @param {object} options
 * @param {number} [options.multiplier=0.35]  Fração da altura do teclado (0–1)
 * @param {number} [options.fixed]            Valor fixo em px (substitui multiplier)
 * @param {object} [options.spring]           Config do spring (damping, stiffness)
 */
export function useKeyboardSpacer({
	multiplier = 0.35,
	fixed,
	spring = DEFAULT_SPRING,
} = {}) {
	const spacerHeight = useSharedValue(0);

	useEffect(() => {
		const show = Keyboard.addListener("keyboardDidShow", (e) => {
			const target =
				fixed !== undefined ? fixed : e.endCoordinates.height * multiplier;
			spacerHeight.value = withSpring(target, spring);
		});
		const hide = Keyboard.addListener("keyboardDidHide", () => {
			spacerHeight.value = 0;
		});
		return () => {
			show.remove();
			hide.remove();
		};
	}, [multiplier, fixed]);

	const style = useAnimatedStyle(() => ({ height: spacerHeight.value }));

	return {
		spacer: <Animated.View style={style} />,
		height: spacerHeight,
	};
}
