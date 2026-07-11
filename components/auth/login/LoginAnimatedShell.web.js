import { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import { Box } from "@/components/ui/box";
import { StatusBar } from "expo-status-bar";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	useReducedMotion,
	withDelay,
	withRepeat,
	withSpring,
	withTiming,
	Easing,
} from "react-native-reanimated";
import { LoginBrandHeader } from "@/components/auth/login/LoginBrandHeader";
import {
	useLoginScene,
	LOGIN_SHEET_DELAY,
} from "@/components/auth/login/loginEntering";

const smooth = Easing.bezier(0.22, 1, 0.36, 1);
const sheetEase = Easing.bezier(0.16, 1, 0.3, 1);

function Orb({ size, color, blur, restOpacity, peakOpacity, breatheDuration, fadeDuration, top, offsetX, offsetY }) {
	const reduceMotion = useReducedMotion();
	const visible = useSharedValue(reduceMotion ? 1 : 0);
	const breathe = useSharedValue(0);

	useEffect(() => {
		if (reduceMotion) return;
		visible.value = withTiming(1, {
			duration: fadeDuration,
			easing: Easing.out(Easing.ease),
		});
		breathe.value = withRepeat(
			withTiming(1, {
				duration: breatheDuration / 2,
				easing: Easing.inOut(Easing.ease),
			}),
			-1,
			true
		);
	}, []);

	const style = useAnimatedStyle(() => ({
		opacity:
			visible.value *
			(restOpacity + (peakOpacity - restOpacity) * breathe.value),
		transform: [{ scale: 1 + 0.14 * breathe.value }],
	}));

	return (
		<Animated.View
			pointerEvents="none"
			style={[
				{
					position: "absolute",
					width: size,
					height: size,
					borderRadius: 999,
					backgroundColor: color,
					filter: `blur(${blur}px)`,
					left: "50%",
					top,
					marginLeft: offsetX - size / 2,
					marginTop: offsetY - size / 2,
				},
				style,
			]}
		/>
	);
}

function DesktopScene({ colors, isDarkMode, children }) {
	const reduceMotion = useReducedMotion();
	const enter = useSharedValue(reduceMotion ? 1 : 0);
	const cardOpacity = useSharedValue(reduceMotion ? 1 : 0);
	const cardBlur = useSharedValue(reduceMotion ? 0 : 14);

	useEffect(() => {
		if (reduceMotion) return;
		cardOpacity.value = withDelay(140, withTiming(1, { duration: 700, easing: smooth }));
		enter.value = withDelay(140, withSpring(1, { damping: 16, stiffness: 120 }));
		cardBlur.value = withDelay(
			140,
			withTiming(0, { duration: 560, easing: Easing.out(Easing.ease) })
		);
	}, []);

	const cardStyle = useAnimatedStyle(() => ({
		opacity: cardOpacity.value,
		filter: `blur(${cardBlur.value}px)`,
		transform: [
			{ translateY: 26 * (1 - enter.value) },
			{ scale: 0.94 + 0.06 * enter.value },
		],
	}));

	return (
		<Box
			className="flex-1 items-center justify-center"
			style={{ backgroundColor: colors.screen, padding: 24, overflow: "hidden" }}
		>
			<StatusBar style={isDarkMode ? "light" : "dark"} />

			<Orb
				size={560}
				color={colors.brand}
				blur={110}
				restOpacity={0.16}
				peakOpacity={0.24}
				breatheDuration={11000}
				fadeDuration={1000}
				top="42%"
				offsetX={-84}
				offsetY={-28}
			/>
			<Orb
				size={380}
				color={colors.brandMark}
				blur={100}
				restOpacity={0.12}
				peakOpacity={0.18}
				breatheDuration={13000}
				fadeDuration={1200}
				top="55%"
				offsetX={76}
				offsetY={57}
			/>

			<Animated.View
				className="w-full"
				style={[
					{
						maxWidth: 420,
						borderRadius: 24,
						paddingTop: 36,
						paddingBottom: 36,
						paddingLeft: 32,
						paddingRight: 32,
						backgroundColor: colors.surface,
						borderWidth: 1,
						borderColor: colors.border,
						boxShadow: isDarkMode
							? "0 24px 60px rgba(0,0,0,0.55)"
							: "0 24px 60px rgba(15,23,42,0.18)",
					},
					cardStyle,
				]}
			>
				{children}
			</Animated.View>
		</Box>
	);
}

function MobileScene({ colors, isDarkMode, children }) {
	const { height } = useWindowDimensions();
	const reduceMotion = useReducedMotion();
	const sheetY = useSharedValue(reduceMotion ? 0 : height);

	useEffect(() => {
		if (reduceMotion) return;
		sheetY.value = withDelay(
			LOGIN_SHEET_DELAY,
			withTiming(0, { duration: 600, easing: sheetEase })
		);
	}, []);

	const sheetStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: sheetY.value }],
	}));

	return (
		<Box
			className="flex-1 justify-end"
			style={{ backgroundColor: colors.screen, overflow: "hidden" }}
		>
			<StatusBar style={isDarkMode ? "light" : "dark"} />

			<Box className="flex-1 items-center justify-center">
				<LoginBrandHeader colors={colors} />
			</Box>

			<Animated.View
				style={[
					{
						width: "100%",
						borderTopLeftRadius: 28,
						borderTopRightRadius: 28,
						paddingTop: 28,
						paddingHorizontal: 20,
						paddingBottom: 32,
						backgroundColor: colors.surface,
						boxShadow: isDarkMode
							? "0 -8px 30px rgba(0,0,0,0.35)"
							: "0 -8px 30px rgba(15,23,42,0.14)",
					},
					sheetStyle,
				]}
			>
				{children}
			</Animated.View>
		</Box>
	);
}

export function LoginAnimatedShell({ colors, isDarkMode, children }) {
	const scene = useLoginScene();

	// Componentes distintos por cena: trocar de cena no resize remonta a árvore
	// e reinicia a timeline de entrada correspondente
	return scene === "desktop" ? (
		<DesktopScene colors={colors} isDarkMode={isDarkMode}>
			{children}
		</DesktopScene>
	) : (
		<MobileScene colors={colors} isDarkMode={isDarkMode}>
			{children}
		</MobileScene>
	);
}
