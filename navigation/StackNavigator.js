import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import HeaderBrand from "@/components/header_brand";

export default function StackNavigator() {
  const { theme } = useTheme();
  const themeInverse = theme === "dark" ? "light" : "dark";

  return (
    <>
      <Stack
        screenOptions={{
          headerTitle: () => <HeaderBrand theme={theme} />,
          headerBackVisible: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="insert" options={{ title: "Novo Registro" }} />
        <Stack.Screen name="view" options={{ title: "Detalhes" }} />
      </Stack>

      <StatusBar style={themeInverse} />
    </>
  );
}
