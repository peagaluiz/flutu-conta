import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { StatusBar } from "expo-status-bar";
import Animated from "react-native-reanimated";

export function LoginAnimatedShell({
	colors,
	insets,
	isDarkMode,
	sheetAnimatedStyle,
	children,
}) {
	return (
		<Box className="flex-1 justify-end" style={{ backgroundColor: colors.screen }}>
			<StatusBar style={isDarkMode ? "light" : "dark"} />

			<Animated.View
				style={[
					{
						width: "100%",
						borderTopLeftRadius: 28,
						borderTopRightRadius: 28,
						paddingTop: 32,
						minHeight: "58%",
						backgroundColor: colors.surface,
					},
					sheetAnimatedStyle,
				]}
				className="px-6"
			>
				<VStack className="mx-2" space={4}>
					{children}
				</VStack>
			</Animated.View>
		</Box>
	);
}
