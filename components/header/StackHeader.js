import { getHeaderTitle, Header, HeaderBackButton } from "@react-navigation/elements";
import { useEffect } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
	Easing,
	interpolate,
	useAnimatedReaction,
	useAnimatedStyle,
	useDerivedValue,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { Text } from "@/components/ui/text";

const HEADER_CONTENT_HEIGHT = 64;
const SIDE_PADDING = 16;

function resolveHeaderLeft(options, back, navigation) {
	return (
		options.headerLeft ??
		(back && options.headerBackVisible !== false
			? (props) => <HeaderBackButton {...props} onPress={navigation.goBack} />
			: undefined)
	);
}

function AnimatedStackHeader({ navigation, route, options, back }) {
	const insets = useSafeAreaInsets();
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const title = getHeaderTitle(options, route.name);
	const spaceIndex = title.indexOf(" ");
	const firstWord = spaceIndex === -1 ? title : title.slice(0, spaceIndex);
	const restWord = spaceIndex === -1 ? "" : title.slice(spaceIndex);

	const headerLeft = resolveHeaderLeft(options, back, navigation);

	const progress = useSharedValue(0);
	const colorProgress = useSharedValue(0);
	const backProgress = useSharedValue(0);
	const titleWidth = useSharedValue(0);
	const rowWidth = useSharedValue(0);

	useEffect(() => {
		progress.value = withSpring(1, { damping: 9, stiffness: 90, mass: 1 });
		colorProgress.value = withTiming(1, {
			duration: 350,
			easing: Easing.inOut(Easing.quad),
		});
	}, []);

	useAnimatedReaction(
		() => progress.value,
		(current) => {
			if (current >= 0.99 && backProgress.value === 0) {
				backProgress.value = withTiming(1, {
					duration: 170,
					easing: Easing.out(Easing.cubic),
				});
			}
		}
	);

	const translateX = useDerivedValue(() => {
		if (rowWidth.value === 0 || titleWidth.value === 0) return 0;
		const center = (rowWidth.value - titleWidth.value) / 2 - SIDE_PADDING;
		return interpolate(progress.value, [0, 1], [0, center]);
	});

	const titleTransformStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: translateX.value }],
	}));

	const brandOpacity = useAnimatedStyle(() => ({
		opacity: 1 - colorProgress.value,
	}));

	const primaryOpacity = useAnimatedStyle(() => ({
		opacity: colorProgress.value,
	}));

	const backStyle = useAnimatedStyle(() => ({
		opacity: backProgress.value,
		transform: [{ translateX: interpolate(backProgress.value, [0, 1], [-12, 0]) }],
	}));

	const backColor = theme === "dark" ? "#F8FAFC" : "#0F172A";

	return (
		<View
			style={{
				height: insets.top + HEADER_CONTENT_HEIGHT,
				paddingTop: insets.top,
				backgroundColor: colors.surface,
			}}
		>
			<View
				className="flex-1 relative"
				onLayout={(e) => {
					rowWidth.value = e.nativeEvent.layout.width;
				}}
			>
				<View className="absolute top-0 bottom-0 left-4 justify-center">
					<Animated.View style={backStyle}>
						{headerLeft?.({ tintColor: backColor, canGoBack: !!back })}
					</Animated.View>
				</View>

				<View className="absolute top-0 bottom-0 left-4 justify-center">
					<Animated.View style={titleTransformStyle}>
						<View
							className="flex-row items-center"
							onLayout={(e) => {
								titleWidth.value = e.nativeEvent.layout.width;
							}}
						>
							<View className="relative">
								<Animated.View style={primaryOpacity}>
									<Text size="2xl" bold numberOfLines={1} style={{ color: colors.textPrimary }}>
										{firstWord}
									</Text>
								</Animated.View>
								<View className="absolute inset-0 justify-center">
									<Animated.View style={brandOpacity}>
										<Text size="2xl" bold numberOfLines={1} style={{ color: colors.brand }}>
											{firstWord}
										</Text>
									</Animated.View>
								</View>
							</View>
							{restWord ? (
								<Text size="2xl" numberOfLines={1} style={{ color: colors.brand }}>
									{restWord}
								</Text>
							) : null}
						</View>
					</Animated.View>
				</View>

				{options.headerRight ? (
					<View className="absolute top-0 bottom-0 right-4 justify-center">
						{options.headerRight({ tintColor: backColor, canGoBack: !!back })}
					</View>
				) : null}
			</View>
		</View>
	);
}

export function StackHeader({ navigation, route, options, back }) {
	const insets = useSafeAreaInsets();

	if (options.animateTitle) {
		return (
			<AnimatedStackHeader
				navigation={navigation}
				route={route}
				options={options}
				back={back}
			/>
		);
	}

	const title = getHeaderTitle(options, route.name);
	const headerLeft = resolveHeaderLeft(options, back, navigation);

	return (
		<Header
			{...options}
			title={title}
			back={back}
			headerLeft={headerLeft}
			headerShadowVisible={false}
			headerStatusBarHeight={insets.top}
			headerStyle={[options.headerStyle, { height: insets.top + HEADER_CONTENT_HEIGHT }]}
			headerRightContainerStyle={[{ paddingRight: 16 }, options.headerRightContainerStyle]}
		/>
	);
}
