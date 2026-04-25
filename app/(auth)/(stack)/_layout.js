import { Stack } from "expo-router";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";

export default function StackLayout() {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  return (
    <Stack
      screenOptions={{
        headerBackVisible: false,
        headerStyle: { backgroundColor: isDarkMode ? "#1C1C1E" : "#FFFFFF" },
        headerTintColor: isDarkMode ? "#F8FAFC" : "#0F172A",
        headerTitleStyle: { color: isDarkMode ? "#F8FAFC" : "#0F172A" },
        contentStyle: { backgroundColor: isDarkMode ? "#121212" : "#F3F4F6" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="insert"
        options={({ route }) => ({
          title: route?.params?.id_transacao ? "Editar Transação" : "Nova Transação",
          headerBackVisible: true,
          headerBackTitleVisible: false,
          headerBackButtonDisplayMode: "minimal",
          headerTitleAlign: "center",
          headerLeftContainerStyle: {
            marginLeft: 0,
            paddingLeft: 0,
            width: 44,
          },
          headerTitleContainerStyle: {
            marginLeft: 0,
            paddingLeft: 0,
          },
        })}
      />
      <Stack.Screen name="view" options={{ title: "Detalhes" }} />
      <Stack.Screen name="family" options={{ title: "Gerenciar família" }} />
    </Stack>
  );
}
