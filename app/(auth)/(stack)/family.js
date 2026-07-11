import React from "react";
import { ScrollView } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { Pressable } from "@/components/ui/pressable";
import { useFamilyManagement } from "@/hooks/useFamilyManagement";
import { FamilyManagementView, getFamilyTitle } from "@/components/family/FamilyManagementView";

function BackButton({ isDarkMode }) {
	const router = useRouter();
	return (
		<Pressable onPress={() => router.back()} style={{ paddingLeft: 8, paddingRight: 4 }}>
			<ChevronLeft size={24} color={isDarkMode ? "#F8FAFC" : "#0F172A"} />
		</Pressable>
	);
}

export default function FamilyManagementScreen() {
	const insets = useSafeAreaInsets();
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const isDarkMode = theme === "dark";

	const fm = useFamilyManagement();

	const scrollProps = {
		style: { backgroundColor: colors.screen },
		contentContainerStyle: { paddingBottom: insets.bottom + 32 },
	};

	const headerLeft = () => <BackButton isDarkMode={isDarkMode} />;
	const headerBase = { headerLeft, headerTitleAlign: "center", headerTitleContainerStyle: { marginLeft: 0, paddingLeft: 0 } };

	return (
		<ScrollView {...scrollProps}>
			<Stack.Screen options={{ title: getFamilyTitle(fm), ...headerBase }} />
			<FamilyManagementView fm={fm} colors={colors} />
		</ScrollView>
	);
}
