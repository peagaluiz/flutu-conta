import { useState } from "react";
import { Pressable } from "react-native";
import { Drawer } from "expo-router/drawer";
import { useRouter } from "expo-router";
import Icon from "@expo/vector-icons/MaterialIcons";
import { PanelLeft } from "lucide-react-native";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import HeaderButtons from "@/components/header/HeaderButtons";
import { DrawerSidebarContent } from "@/components/header/DrawerSidebarContent";
import { useOpenInsert } from "@/hooks/useOpenInsert";
import { useOpenFamily } from "@/hooks/useOpenFamily";
import { MAIN_SCREENS } from "./mainScreens";

function drawerScreenOptions(screen, colors) {
	return {
		title: screen.title,
		drawerItemStyle: screen.drawerHidden ? { display: "none" } : undefined,
		// Desktop web não mostra título no header — só o toggle de colapsar e o perfil.
		headerTitle: () => null,
		drawerIcon: ({ color, size }) => (
			<Icon name={screen.icon} size={size} color={color} />
		),
	};
}

export default function MainDrawerNavigator() {
	const router = useRouter();
	const openInsert = useOpenInsert();
	const openFamily = useOpenFamily();
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	// Drawer permanente não colapsa via toggleDrawer; controlamos a largura na mão.
	const [collapsed, setCollapsed] = useState(false);

	return (
		<Drawer
			initialRouteName="index"
			drawerContent={(props) => (
				<DrawerSidebarContent {...props} collapsed={collapsed} colors={colors} />
			)}
			screenOptions={{
				drawerType: "permanent",
				overlayColor: "transparent",
				headerShadowVisible: false,
				headerTitleAlign: "left",
				headerStyle: { backgroundColor: colors.surface },
				headerTintColor: colors.textPrimary,
				sceneContainerStyle: { backgroundColor: colors.screen },
				drawerStyle: {
					width: collapsed ? 84 : 240,
					backgroundColor: colors.surface,
					borderRightColor: colors.border,
					overflow: "hidden",
					transitionProperty: "width",
					transitionDuration: "180ms",
					transitionTimingFunction: "ease",
				},
				headerLeft: () => (
					<Pressable
						onPress={() => setCollapsed((c) => !c)}
						style={{
							marginLeft: 16,
							width: 36,
							height: 36,
							borderRadius: 10,
							borderWidth: 1,
							borderColor: colors.border,
							backgroundColor: colors.surfaceMuted,
							alignItems: "center",
							justifyContent: "center",
						}}
						accessibilityLabel="Alternar menu lateral"
					>
						<PanelLeft size={18} color={colors.textPrimary} />
					</Pressable>
				),
				headerRight: () => <HeaderButtons theme={theme} />,
			}}
		>
			{MAIN_SCREENS.map((screen) => (
				<Drawer.Screen
					key={screen.name}
					name={screen.name}
					options={drawerScreenOptions(screen, colors)}
					listeners={
						screen.pushTo
							? {
									drawerItemPress: (event) => {
										event.preventDefault();
										if (screen.name === "insert") openInsert();
										else if (screen.name === "family") openFamily();
										else router.push(screen.pushTo);
									},
							  }
							: undefined
					}
				/>
			))}
		</Drawer>
	);
}
