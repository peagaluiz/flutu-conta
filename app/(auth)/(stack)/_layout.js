import { Stack, useRouter } from "expo-router";
import { Pressable } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";

function InsertBackButton({ isDarkMode }) {
	const router = useRouter();
	return (
		<Pressable
			onPress={() => router.replace("/")}
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
			<Stack.Screen name="index" />
			<Stack.Screen
				name="insert"
				options={({ route }) => ({
					title: route?.params?.id_transacao
						? "Editar Transação"
						: "Nova Transação",
					headerLeft: () => <InsertBackButton isDarkMode={isDarkMode} />,
					headerTitleAlign: "center",
					headerTitleContainerStyle: {
						marginLeft: 0,
						paddingLeft: 0,
					},
				})}
			/>
			<Stack.Screen name="view" options={{ title: "Detalhes" }} />
			<Stack.Screen
				name="family"
				options={{ title: "Gerenciar família" }}
			/>
		</Stack>
	);
}
