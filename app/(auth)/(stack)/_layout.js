import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { StackHeader } from "@/components/header/StackHeader";

function InsertBackButton({ isDarkMode }) {
	const router = useRouter();
	const params = useLocalSearchParams();
	const dest = params?.from === "launches" ? "/(auth)/(tabs)/launches" : "/";
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
			<Stack.Screen name="view" options={{ title: "Detalhes" }} />
			<Stack.Screen
				name="family"
				options={{ title: "Gerenciar família", animateTitle: true }}
			/>
		</Stack>
	);
}
