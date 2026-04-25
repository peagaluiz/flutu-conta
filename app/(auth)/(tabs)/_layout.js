import { Tabs } from 'expo-router';
import { useRouter } from 'expo-router';
import Icon from '@expo/vector-icons/MaterialIcons';
import { Dimensions } from 'react-native';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/state/AuthContext";

import HeaderBrand from "@/components/header_brand";
import HeaderButtons from "@/components/header_buttons";

export default function TabsLayout() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { theme } = useTheme();
	const { family } = useAuth();
	const colors = getThemeColors(theme);
	const hasFamily = !!family?.id;
	const tabBarBackground = theme === "dark" ? "#171A20" : "#E7ECF3";
	const windowWidth = Dimensions.get('window').width;
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
					headerTitleAlign: 'left',
					tabBarHideOnKeyboard: true,
					tabBarShowLabel: false,
					headerStyle: { backgroundColor: colors.surface },
					headerTintColor: colors.textPrimary,
					headerTitleStyle: { color: colors.textPrimary },
					sceneStyle: { backgroundColor: colors.screen },
					tabBarItemStyle: { borderRadius: "50%" },
					tabBarIconStyle: { height: "100%" },
					tabBarStyle: {
						position: 'absolute',
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
						shadowColor: '#000',
						shadowOffset: {
							width: 0,
							height: 10,
						},
						shadowOpacity: 0.5,
						shadowRadius: 5,
						elevation: 2,
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
						headerTitle: () => <Text size="2xl" style={{ color: colors.brand }}>
							Financeiro
						</Text>,
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
									router.push('/(auth)/(stack)/insert');
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
						headerTitle: () => <Text size="2xl" style={{ color: colors.brand }}>
							Lançamentos
						</Text>,
						headerRight: () => <HeaderButtons theme={theme} />,
						headerBackVisible: false,
					}}
				/>

				<Tabs.Screen
					name="family"
					options={{
						tabBarIcon: ({ color, size }) => (
							<Icon name="groups" size={size} color={color} style={{ opacity: hasFamily ? 1 : 0.35 }} />
						),
						headerShown: false,
						headerBackVisible: false,
						tabBarButton: (props) => (
							<Pressable
								{...props}
								disabled={!hasFamily}
								style={[props.style, !hasFamily ? { opacity: 0.45 } : null]}
								onPress={(event) => {
									event?.preventDefault?.();
									if (!hasFamily) return;
									router.push('/(auth)/(stack)/family');
								}}
							/>
						),
					}}
				/>
			</Tabs>
		</>
	);
}
