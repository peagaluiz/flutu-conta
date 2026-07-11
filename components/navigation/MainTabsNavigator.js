import { useEffect, useRef } from "react";
import { useIsNavReady } from "@/state/NavigationContext";
import { Tabs, useRouter } from "expo-router";
import Icon from "@expo/vector-icons/MaterialIcons";
import { Animated, Platform, Pressable, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import HeaderBrand from "@/components/header/HeaderBrand";
import HeaderButtons from "@/components/header/HeaderButtons";
import { InsertInterceptProvider, useInsertIntercept } from "@/state/InsertInterceptContext";
import { ActionListModal } from "@/components/ui/ActionListModal";
import { Plus, Upload } from "lucide-react-native";
import { MAIN_SCREENS, ScreenTitle } from "./mainScreens";
import { shadow } from "@/utils/shadow";

const TAB_BAR_WIDTH = 240;

function tabScreenOptions(screen, { theme, colors, router }) {
	const options = {
		headerBackVisible: false,
		tabBarIcon: ({ color, size }) => (
			<Icon name={screen.icon} size={size} color={color} />
		),
	};

	if (screen.pushTo) {
		options.headerShown = false;
		options.tabBarButton = (props) => (
			<Pressable
				{...props}
				onPress={(event) => {
					event?.preventDefault?.();
					router.push(screen.pushTo);
				}}
			/>
		);
		return options;
	}

	options.headerLeft = () => null;
	options.headerRight = () => <HeaderButtons theme={theme} />;
	options.headerTitle = () =>
		screen.name === "index" ? (
			<HeaderBrand theme={theme} />
		) : (
			<ScreenTitle title={screen.title} colors={colors} />
		);
	return options;
}

function TabsContent() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const { isOpen, closeIntercept, handleNova, handleImportar } = useInsertIntercept();
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

	const { width: windowWidth } = useWindowDimensions();
	const tabBarLeft = Math.max(16, Math.round((windowWidth - TAB_BAR_WIDTH) / 2));
	// Na web left + margin se somam no CSS; centraliza com margin auto.
	const tabBarPosition = Platform.select({
		web: { left: 0, right: 0, marginHorizontal: "auto" },
		default: { left: tabBarLeft, marginHorizontal: tabBarLeft },
	});

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
						...tabBarPosition,
						marginBottom: insets.bottom + 10,
						width: TAB_BAR_WIDTH,
						height: 65,
						paddingBlock: 50,
						backgroundColor: tabBarBackground,
						borderColor: colors.border,
						borderWidth: 1,
						...shadow({ color: "#000", offsetY: 10, opacity: 0.5, radius: 5, elevation: 2 }),
						transform: [{ translateY: tabBarTranslate }],
					},
					tabBarActiveTintColor: colors.textPrimary,
					tabBarInactiveTintColor: colors.textSecondary,
				}}
			>
				{MAIN_SCREENS.map((screen) => (
					<Tabs.Screen
						key={screen.name}
						name={screen.name}
						options={tabScreenOptions(screen, { theme, colors, router })}
					/>
				))}
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

export default function MainTabsNavigator() {
	return (
		<InsertInterceptProvider>
			<TabsContent />
		</InsertInterceptProvider>
	);
}
