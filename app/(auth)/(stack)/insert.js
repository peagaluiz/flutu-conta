import { useEffect, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "expo-router";
import { useSelectorOverlay } from "@/state/SelectorOverlayContext";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { BankSelectorButton } from "@/components/finance/insert/BankSelectorButton";
import { InsertFormView } from "@/components/finance/insert/InsertFormView";
import { useInsertForm } from "@/components/finance/insert/useInsertForm";

export default function Insert() {
	const insets = useSafeAreaInsets();
	const { theme } = useTheme();
	const { active: isSelectorOpen } = useSelectorOverlay();
	const isDarkMode = theme === "dark";
	const themeColors = getThemeColors(theme);
	const navigation = useNavigation();

	const state = useInsertForm();
	const { isSaving, selectedCatalogBanco, handleBancoSelect, family } = state;

	const actionSheetContentStyle = useMemo(
		() => ({ paddingBottom: Math.max(insets.bottom, 12) + 8 }),
		[insets.bottom]
	);

	useEffect(() => {
		navigation.setOptions({
			headerRight: () => (
				<BankSelectorButton
					selectedCatalogBanco={selectedCatalogBanco ?? null}
					onSelect={handleBancoSelect}
					themeColors={themeColors}
					actionSheetContentStyle={actionSheetContentStyle}
					disabled={isSaving}
					familyId={family?.id ? Number(family.id) : null}
				/>
			),
		});
	}, [selectedCatalogBanco, handleBancoSelect, themeColors, actionSheetContentStyle, isSaving, family?.id]);

	return (
		<InsertFormView
			state={state}
			themeColors={themeColors}
			isDarkMode={isDarkMode}
			insets={insets}
			isSelectorOpen={isSelectorOpen}
		/>
	);
}
