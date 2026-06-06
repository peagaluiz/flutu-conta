import { Box } from "@/components/ui/box";
import { View } from "react-native";
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
						borderTopLeftRadius: 32,
						borderTopRightRadius: 32,
						paddingTop: 14,
						paddingHorizontal: 35,
						paddingBottom: 70,
						backgroundColor: colors.surface,
						shadowColor: "#000",
						shadowOpacity: isDarkMode ? 0.7 : 0.18,
						shadowRadius: 30,
						shadowOffset: { width: 0, height: -16 },
						elevation: 18,
					},
					sheetAnimatedStyle,
				]}
			>
				<View
					style={{
						width: 42,
						height: 5,
						borderRadius: 9,
						backgroundColor: colors.borderStrong,
						opacity: 0.7,
						alignSelf: "center",
						marginBottom: 22,
					}}
				/>
				{children}
			</Animated.View>
		</Box>
	);
}
