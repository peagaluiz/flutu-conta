import { useEffect } from "react";
import { Platform, useWindowDimensions } from "react-native";
import Animated, {
	useAnimatedStyle,
	useReducedMotion,
	useSharedValue,
	withDelay,
	withSpring,
} from "react-native-reanimated";

// Cena do login: < 860px (e nativo) = mobile (logo + sheet), >= 860px na web = desktop (card + orbs)
export const LOGIN_SCENE_BREAKPOINT = 860;
export const LOGIN_SHEET_DELAY = 320;

// Delays acumulados por item: título, email, senha, salvar login, botão, link
const ITEM_DELAYS = {
	mobile: [540, 620, 700, 780, 860, 940],
	desktop: [420, 520, 600, 680, 780, 880],
};

export function useLoginScene() {
	const { width } = useWindowDimensions();
	return Platform.OS === "web" && width >= LOGIN_SCENE_BREAKPOINT
		? "desktop"
		: "mobile";
}

// Não usar entering={FadeInDown.delay(...)} aqui: na web o visibility:hidden do
// entering só existe no primeiro render, então qualquer re-render antes do delay
// vencer deixava o item visível e ele "piscava" antes de animar. O shared value
// mantém opacity 0 no estilo inline desde o primeiro frame.
export function LoginEnterItem({ index, style, children }) {
	const reduceMotion = useReducedMotion();
	const scene = useLoginScene();
	const delays = ITEM_DELAYS[scene];
	const progress = useSharedValue(reduceMotion ? 1 : 0);

	useEffect(() => {
		if (reduceMotion) return;
		progress.value = withDelay(
			delays[Math.min(index, delays.length - 1)],
			withSpring(1, { duration: 450 })
		);
	}, []);

	const enterStyle = useAnimatedStyle(() => ({
		opacity: Math.min(progress.value, 1),
		transform: [{ translateY: 25 * (1 - progress.value) }],
	}));

	return <Animated.View style={[style, enterStyle]}>{children}</Animated.View>;
}
