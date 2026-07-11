import { useMemo } from "react";
import { Platform, ScrollView } from "react-native";

import { VStack } from "@/components/ui/vstack";
import { Box } from "@/components/ui/box";
import { AppModalFooter } from "@/components/ui/app-modal";

import {
	decimalMask,
	formatDateDisplay,
	parseDateValue,
	toISODate,
} from "@/components/finance/insert/insertFormConfig";
import { TransacaoMainSection } from "@/components/finance/insert/TransacaoMainSection";
import { ParcelasSection } from "@/components/finance/insert/ParcelasSection";
import { ObservacaoSection } from "@/components/finance/insert/ObservacaoSection";
import { RecurrenceSection } from "@/components/finance/insert/RecurrenceSection";
import { InsertFormSkeleton } from "@/components/finance/insert/InsertFormSkeleton";
import { RecurringEditScopeModal } from "@/components/finance/insert/RecurringEditScopeModal";

// Corpo do formulário de inserir/editar, compartilhado entre a tela cheia
// (app/(auth)/(stack)/insert.js) e o modal do desktop web (InsertModalHost).
// `topSlot` renderiza um cabeçalho acima do form (ex.: seletor de banco no modal,
// que na tela cheia mora no header do stack).
export function InsertFormView({
	state,
	themeColors,
	isDarkMode,
	insets,
	isSelectorOpen,
	topSlot = null,
	hideTitle = false,
	// Quando true (modal desktop web), o form não cria scroll interno próprio —
	// ele cresce com o conteúdo e quem rola é o container do modal (scroll "da body").
	externalScroll = false,
}) {
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
		isCartao,
		categories,
		recurringEditModalOpen,
		onCloseRecurringEditModal,
		handleRecurringEditScope,
	} = state;

	const {
		control,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
	} = form;

	const dataVencimento = watch("data_vencimento");
	const recurrenceMode = watch("recurrence_mode");
	const recurrenceFrequency = watch("recurrence_frequency");

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

	const shouldShowSkeleton = isLoading || isBooting;

	const body = (
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
						{topSlot}
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
							isCartao={isCartao}
							hideTitle={hideTitle}
						/>
						{isCartao && !isEditMode ? (
							<ParcelasSection
								control={control}
								themeColors={themeColors}
								isDarkMode={isDarkMode}
							/>
						) : null}
						{/* Recorrências dependem do banco local; indisponíveis na web */}
						{!isCartao && Platform.OS !== "web" ? (
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
						) : null}
						<VStack className="w-full justify-end">
							<ObservacaoSection
								control={control}
								errors={errors}
								isDarkMode={isDarkMode}
								themeColors={themeColors}
							/>
							<AppModalFooter
								onSave={handleSubmit(handleSave)}
								onCancel={handleBack}
								saving={isSaving || isLoading}
								savingLabel={isLoading ? "Carregando..." : "Salvando..."}
								className="w-full justify-end"
							/>
						</VStack>
					</Box>
				</Box>
	);

	return (
		<>
			{externalScroll ? (
				<Box className="w-full" style={{ backgroundColor: themeColors.screen }}>
					{body}
				</Box>
			) : (
				<ScrollView
					className="w-full"
					style={{ flex: 1, marginBottom: insets.bottom, backgroundColor: themeColors.screen }}
					contentContainerStyle={{ flexGrow: 1 }}
					keyboardShouldPersistTaps="handled"
					scrollEnabled={!isSelectorOpen}
				>
					{body}
				</ScrollView>
			)}

			<RecurringEditScopeModal
				isOpen={recurringEditModalOpen}
				onClose={onCloseRecurringEditModal}
				onConfirm={handleRecurringEditScope}
			/>
		</>
	);
}
