import { View, Image, Pressable } from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { CommonActions, DrawerActions } from "@react-navigation/native";
import { Send } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { Avatar, AvatarFallbackText, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/state/AuthContext";
import longLogo from "@/assets/images/long-logo.png";

function DrawerNavItems({ state, navigation, descriptors, collapsed, colors }) {
	return state.routes.map((route, index) => {
		const { options } = descriptors[route.key];
		if (options.drawerItemStyle?.display === "none") return null;

		const focused = index === state.index;
		const label = options.drawerLabel ?? options.title ?? route.name;
		const color = focused ? colors.brand : colors.textSecondary;
		const icon = options.drawerIcon?.({ color, size: 24, focused });

		const onPress = () => {
			const event = navigation.emit({
				type: "drawerItemPress",
				target: route.key,
				canPreventDefault: true,
			});
			if (!event.defaultPrevented) {
				navigation.dispatch({
					...(focused ? DrawerActions.closeDrawer() : CommonActions.navigate(route)),
					target: state.key,
				});
			}
		};

		return (
			<Pressable
				key={route.key}
				onPress={onPress}
				accessibilityLabel={typeof label === "string" ? label : undefined}
			>
				{({ hovered }) => (
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							justifyContent: collapsed ? "center" : "flex-start",
							alignSelf: collapsed ? "center" : "stretch",
							width: collapsed ? 48 : undefined,
							height: 48,
							marginVertical: 4,
							marginHorizontal: collapsed ? 0 : 12,
							paddingHorizontal: collapsed ? 0 : 12,
							gap: collapsed ? 0 : 12,
							borderRadius: 14,
							backgroundColor: focused
								? colors.brandSoft
								: hovered
								? colors.surfaceMuted
								: "transparent",
						}}
					>
						{icon}
						{!collapsed && (
							<Text
								numberOfLines={1}
								style={{ color, fontSize: 14, fontWeight: focused ? "600" : "400" }}
							>
								{label}
							</Text>
						)}
					</View>
				)}
			</Pressable>
		);
	});
}

export function DrawerSidebarContent({ collapsed, colors, ...props }) {
	const { userData, family } = useAuth();

	const name = userData?.nome?.trim() || "Meu perfil";
	const initial =
		userData?.nome?.trim()?.[0]?.toUpperCase() ||
		userData?.email?.charAt(0).toUpperCase() ||
		"U";
	const subtitle = family?.id ? "Conta família" : "Conta pessoal";

	return (
		<View style={{ flex: 1 }}>
			<View
				style={{
					height: 64,
					borderBottomWidth: 1,
					borderBottomColor: colors.border,
					justifyContent: "center",
					alignItems: collapsed ? "center" : "flex-start",
					paddingHorizontal: collapsed ? 0 : 20,
				}}
			>
				{collapsed ? (
					<View
						style={{
							width: 34,
							height: 34,
							borderRadius: 10,
							backgroundColor: colors.brandMark,
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Send size={18} color="#FFFFFF" />
					</View>
				) : (
					<Image
						source={longLogo}
						style={{ width: 140, height: 28 }}
						resizeMode="contain"
					/>
				)}
			</View>

			<DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 8 }}>
				<DrawerNavItems {...props} collapsed={collapsed} colors={colors} />
			</DrawerContentScrollView>

			<View
				style={{
					borderTopWidth: 1,
					borderTopColor: colors.border,
					paddingVertical: 16,
					paddingHorizontal: collapsed ? 0 : 20,
					flexDirection: "row",
					alignItems: "center",
					justifyContent: collapsed ? "center" : "flex-start",
					gap: 10,
				}}
			>
				<Avatar size="sm" className="border-2 border-outline-100">
					<AvatarFallbackText>{initial}</AvatarFallbackText>
					{userData?.avatarUrl ? (
						<AvatarImage source={{ uri: userData.avatarUrl }} />
					) : null}
				</Avatar>
				{!collapsed && (
					<View style={{ flex: 1 }}>
						<Text
							numberOfLines={1}
							style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "600" }}
						>
							{name}
						</Text>
						<Text style={{ color: colors.textSecondary, fontSize: 11 }}>
							{subtitle}
						</Text>
					</View>
				)}
			</View>
		</View>
	);
}
