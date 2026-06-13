import { useMemo, useEffect } from "react";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "expo-router";
import { useSelectorOverlay } from "@/state/SelectorOverlayContext";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { BankSelectorButton } from "@/components/finance/insert/BankSelectorButton";

import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Save } from "lucide-react-native";

import {
	decimalMask,
	formatDateDisplay,
	parseDateValue,
	toISODate,
} from "@/components/finance/insert/insertFormConfig";
import { TransacaoMainSection } from "@/components/finance/insert/TransacaoMainSection";
import { ObservacaoSection } from "@/components/finance/insert/ObservacaoSection";
import { RecurrenceSection } from "@/components/finance/insert/RecurrenceSection";
import { InsertFormSkeleton } from "@/components/finance/insert/InsertFormSkeleton";
import { RecurringEditScopeModal } from "@/components/finance/insert/RecurringEditScopeModal";
import { useInsertForm } from "@/components/finance/insert/useInsertForm";

export default function Insert() {
	const insets = useSafeAreaInsets();
	const { theme } = useTheme();
	const { active: isSelectorOpen } = useSelectorOverlay();
	const isDarkMode = theme === "dark";
	const themeColors = getThemeColors(theme);
	const navigation = useNavigation();

	const {
		form,
		isEditMode,
		isSaving,
		isLoading,
		isBooting,
		isFromRecurrence,
		recurrenceMeta,
		showDatePicker,
		setShowDatePicker,
		showRecurrenceEndPicker,
		setShowRecurrenceEndPicker,
		handleSave,
		handleBack,
		family,
		selectedCatalogBanco,
		handleBancoSelect,
		categories,
		recurringEditModalOpen,
		onCloseRecurringEditModal,
		handleRecurringEditScope,
	} = useInsertForm();

	const { control, handleSubmit, formState: { errors }, setValue, watch } = form;

	const dataVencimento = watch("data_vencimento");
	const recurrenceMode = watch("recurrence_mode");
	const recurrenceFrequency = watch("recurrence_frequency");
	const idBanco = watch("id_banco");

	const recurrenceFrequencyLabel =
		recurrenceFrequency === "semanal"
			? "Semanal"
			: recurrenceFrequency === "anual"
			? "Anual"
			: "Mensal";

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
				/>
			),
		});
	}, [selectedCatalogBanco, handleBancoSelect, themeColors, actionSheetContentStyle, isSaving]);

	const shouldShowSkeleton = isLoading || isBooting;

	return (
		<>
		<ScrollView
			className="w-full"
			style={{ marginBottom: insets.bottom, backgroundColor: themeColors.screen }}
			contentContainerStyle={{ flexGrow: 1 }}
			keyboardShouldPersistTaps="handled"
			scrollEnabled={!isSelectorOpen}
		>
			<Box className="relative">
				{shouldShowSkeleton && (
					<Box className="absolute left-0 right-0 top-0 z-50">
						<InsertFormSkeleton isDarkMode={isDarkMode} />
					</Box>
				)}
				<Box
					className="gap-4 p-3"
					style={{ opacity: shouldShowSkeleton ? 0 : 1 }}
					pointerEvents={shouldShowSkeleton || isSaving ? "none" : "auto"}
				>
					<TransacaoMainSection
						isDarkMode={isDarkMode}
						themeColors={themeColors}
						isEditMode={isEditMode}
						control={control}
						errors={errors}
						decimalMask={decimalMask}
						categories={categories}
						actionSheetContentStyle={actionSheetContentStyle}
						dataVencimento={dataVencimento}
						showDatePicker={showDatePicker}
						setShowDatePicker={setShowDatePicker}
						parseDateValue={parseDateValue}
						toISODate={toISODate}
						formatDateDisplay={formatDateDisplay}
						canShareWithFamily={Boolean(family?.id)}
					/>
					<RecurrenceSection
						isDarkMode={isDarkMode}
						themeColors={themeColors}
						control={control}
						errors={errors}
						recurrenceMode={recurrenceMode}
						recurrenceFrequency={recurrenceFrequency}
						recurrenceFrequencyLabel={recurrenceFrequencyLabel}
						dataVencimento={dataVencimento}
						isEditMode={isEditMode}
						isFromRecurrence={isFromRecurrence}
						recurrenceMeta={recurrenceMeta}
						showRecurrenceEndPicker={showRecurrenceEndPicker}
						setShowRecurrenceEndPicker={setShowRecurrenceEndPicker}
						setValue={setValue}
						formatDateDisplay={formatDateDisplay}
						parseDateValue={parseDateValue}
						toISODate={toISODate}
					/>
					<VStack className="w-full pb-5 justify-end">
						<ObservacaoSection
							control={control}
							errors={errors}
							isDarkMode={isDarkMode}
							themeColors={themeColors}
						/>
						<HStack space="md" className="w-full justify-end">
							<Button
								action="secondary"
								size="lg"
								variant="outline"
								onPress={handleBack}
							>
								<ButtonText>Cancelar</ButtonText>
							</Button>
							<Button
								action="positive"
								size="lg"
								onPress={handleSubmit(handleSave)}
								isDisabled={isSaving || isLoading}
							>
								<ButtonIcon as={Save} />
								<ButtonText>
									{isLoading
										? "Carregando..."
										: isSaving
										? "Salvando..."
										: "Salvar"}
								</ButtonText>
							</Button>
						</HStack>
					</VStack>
				</Box>
			</Box>
		</ScrollView>

		<RecurringEditScopeModal
			isOpen={recurringEditModalOpen}
			onClose={onCloseRecurringEditModal}
			onConfirm={handleRecurringEditScope}
		/>
		</>
	);
}
