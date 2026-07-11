import { Box } from "@/components/ui/box";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Animated from "react-native-reanimated";
import { LoginBrandHeader } from "@/components/auth/login/LoginBrandHeader";
import { shadow } from "@/utils/shadow";

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

            <Box
                className="flex-1 items-center justify-center"
                style={{ paddingTop: insets?.top ?? 0 }}
            >
                <LoginBrandHeader colors={colors} />
            </Box>

            <Animated.View
                style={[
                    {
                        width: "100%",
                        borderTopLeftRadius: 28,
                        borderTopRightRadius: 28,
                        paddingTop: 14,
                        paddingHorizontal: 35,
                        paddingBottom: 70,
                        backgroundColor: colors.surface,
                        ...shadow({ color: "#000", offsetY: -16, opacity: isDarkMode ? 0.7 : 0.18, radius: 30, elevation: 18 }),
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
