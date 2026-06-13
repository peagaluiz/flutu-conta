import { useEffect, useRef } from "react";
import { useIsNavReady } from "@/state/NavigationContext";
import { Tabs, useRouter } from "expo-router";
import Icon from "@expo/vector-icons/MaterialIcons";
import { Animated, Dimensions, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/state/AuthContext";

import HeaderBrand from "@/components/header/HeaderBrand";
import HeaderButtons from "@/components/header/HeaderButtons";
import { InsertInterceptProvider, useInsertIntercept } from "@/state/InsertInterceptContext";
import { ActionListModal } from "@/components/ui/ActionListModal";
import { Plus, Upload } from "lucide-react-native";

function TabsContent() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const { family } = useAuth();
    const colors = getThemeColors(theme);
    const { isOpen, closeIntercept, handleNova, handleImportar } = useInsertIntercept();
    const hasFamily = !!family?.id;
    const isNavReady = useIsNavReady();
    const tabBarBackground = theme === "dark" ? "#171A20" : "#E7ECF3";
    const tabBarTranslate = useRef(new Animated.Value(120)).current;

    useEffect(() => {
        if (!isNavReady) return;
        const timeout = setTimeout(() => {
            Animated.spring(tabBarTranslate, {
                toValue: 0,
                useNativeDriver: true,
                tension: 50,
                friction: 10,
            }).start();
        }, 320);
        return () => clearTimeout(timeout);
    }, [isNavReady]);
    const windowWidth = Dimensions.get("window").width;
    const tabBarWidth = 240;
    const tabBarLeft = Math.max(16, Math.round((windowWidth - tabBarWidth) / 2));

    return (
        <>
            <Tabs
                initialRouteName="index"
                safeAreaInsets={{ bottom: 0 }}
                screenOptions={{
                    tabBarHideOnScroll: true,
                    headerShadowVisible: false,
                    headerTitleAlign: "left",
                    tabBarHideOnKeyboard: true,
                    tabBarShowLabel: false,
                    headerStyle: { backgroundColor: colors.surface },
                    headerTintColor: colors.textPrimary,
                    headerTitleStyle: { color: colors.textPrimary },
                    sceneStyle: { backgroundColor: colors.screen },
                    tabBarItemStyle: { borderRadius: "50%" },
                    tabBarIconStyle: { height: "100%" },
                    tabBarStyle: {
                        position: "absolute",
                        borderRadius: 20,
                        left: tabBarLeft,
                        marginBottom: insets.bottom + 10,
                        width: tabBarWidth,
                        height: 65,
                        paddingBlock: 50,
                        marginHorizontal: tabBarLeft,
                        backgroundColor: tabBarBackground,
                        borderColor: colors.border,
                        borderWidth: 1,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.5,
                        shadowRadius: 5,
                        elevation: 2,
                        transform: [{ translateY: tabBarTranslate }],
                    },
                    tabBarActiveTintColor: colors.textPrimary,
                    tabBarInactiveTintColor: colors.textSecondary,
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        tabBarIcon: ({ color, size }) => (
                            <Icon name="home" size={size} color={color} />
                        ),
                        headerLeft: () => null,
                        headerTitle: () => <HeaderBrand theme={theme} />,
                        headerRight: () => <HeaderButtons theme={theme} />,
                        headerBackVisible: false,
                    }}
                />
                <Tabs.Screen
                    name="finance"
                    options={{
                        tabBarIcon: ({ color, size }) => (
                            <Icon name="bar-chart" size={size} color={color} />
                        ),
                        headerLeft: () => null,
                        headerTitle: () => (
                            <Text size="2xl" style={{ color: colors.brand }}>
                                Financeiro
                            </Text>
                        ),
                        headerRight: () => <HeaderButtons theme={theme} />,
                        headerBackVisible: false,
                    }}
                />
                <Tabs.Screen
                    name="insert"
                    options={{
                        tabBarIcon: ({ color, size }) => (
                            <Icon name="add" size={size} color={color} />
                        ),
                        headerShown: false,
                        headerBackVisible: false,
                        tabBarButton: (props) => (
                            <Pressable
                                {...props}
                                onPress={(event) => {
                                    event?.preventDefault?.();
                                    router.push("/(auth)/(stack)/insert");
                                }}
                            />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="launches"
                    options={{
                        tabBarIcon: ({ color, size }) => (
                            <Icon name="view-list" size={size} color={color} />
                        ),
                        headerLeft: () => null,
                        headerTitle: () => (
                            <Text size="2xl" style={{ color: colors.brand }}>
                                Lançamentos
                            </Text>
                        ),
                        headerRight: () => <HeaderButtons theme={theme} />,
                        headerBackVisible: false,
                    }}
                />
                <Tabs.Screen
                    name="family"
                    options={{
                        tabBarIcon: ({ color, size }) => (
                            <Icon name="groups" size={size} color={color} />
                        ),
                        headerShown: false,
                        headerBackVisible: false,
                        tabBarButton: (props) => (
                            <Pressable
                                {...props}
                                onPress={(event) => {
                                    event?.preventDefault?.();
                                    router.push("/(auth)/(stack)/family");
                                }}
                            />
                        ),
                    }}
                />
            </Tabs>
            <ActionListModal
                isOpen={isOpen}
                onClose={closeIntercept}
                title="Inserir"
                items={[
                    { label: "Nova transação", icon: Plus, onPress: handleNova },
                    { label: "Importar OFX", icon: Upload, onPress: handleImportar },
                ]}
            />
        </>
    );
}

export default function TabsLayout() {
    return (
        <InsertInterceptProvider>
            <TabsContent />
        </InsertInterceptProvider>
    );
}
