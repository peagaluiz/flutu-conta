import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { StackHeader } from "@/components/header/StackHeader";
import { LAUNCHES_PATH } from "@/utils/navigation";
import { useIsDesktopWeb } from "@/hooks/useIsDesktopWeb";

function InsertBackButton({ isDarkMode }) {
	const router = useRouter();
	const params = useLocalSearchParams();
	const isDesktopWeb = useIsDesktopWeb();
	const dest = params?.from === "launches" ? LAUNCHES_PATH : "/";
	// No desktop web a navegação já é feita pelo drawer; o botão de voltar é desnecessário.
	if (isDesktopWeb) return null;
	return (
		<Pressable
			onPress={() => router.replace(dest)}
			style={{ paddingLeft: 8, paddingRight: 4 }}
		>
			<ChevronLeft size={24} color={isDarkMode ? "#F8FAFC" : "#0F172A"} />
		</Pressable>
	);
}

export default function StackLayout() {
	const { theme } = useTheme();
	const isDarkMode = theme === "dark";

	return (
		<Stack
			screenOptions={{
				animation: "none",
				headerBackVisible: false,
				header: (props) => <StackHeader {...props} />,
				headerStyle: {
					backgroundColor: isDarkMode ? "#1C1C1E" : "#FFFFFF",
				},
				headerTintColor: isDarkMode ? "#F8FAFC" : "#0F172A",
				headerTitleStyle: { color: isDarkMode ? "#F8FAFC" : "#0F172A" },
				contentStyle: {
					backgroundColor: isDarkMode ? "#121212" : "#F3F4F6",
				},
			}}
		>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen
				name="insert"
				options={({ route }) => ({
					title: route?.params?.id_transacao
						? "Editar Transação"
						: "Nova Transação",
					headerLeft: () => <InsertBackButton isDarkMode={isDarkMode} />,
					animateTitle: true,
				})}
			/>
			<Stack.Screen
				name="ofx-import"
				options={{
					title: "Importar OFX",
					headerLeft: () => <InsertBackButton isDarkMode={isDarkMode} />,
					animateTitle: true,
				}}
			/>
			<Stack.Screen name="view" options={{ title: "Detalhes" }} />
			<Stack.Screen
				name="family"
				options={{ title: "Gerenciar família", animateTitle: true }}
			/>
		</Stack>
	);
}
