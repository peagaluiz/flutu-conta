import { useState, useCallback, useEffect } from "react";
import { Switch, TextInput } from "react-native";
import { CalendarDays, ChevronDown, Search } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";
import {
	Modal,
	ModalBackdrop,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
} from "@/components/ui/modal";
import { DatePickerDialog } from "@/components/ui/DatePickerDialog";
import { FormRadioGroup } from "@/components/ui/radio-button/FormRadioGroup";
import { MonthStepper } from "@/components/finance/MonthStepper";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { toISODateString } from "@/utils/finance/helpers";
import {
	buildDefaultHomeDateRange,
	buildMonthDateRange,
} from "@/utils/finance/homeScreenHelpers";
import { useFinanceDate } from "@/state/FinanceDateContext";

const DATE_FIELD_OPTIONS = [
	{ label: "Vencimento", value: "data_vencimento" },
	{ label: "Data de baixa", value: "data_baixa" },
];

const INPUT_MODE_OPTIONS = [
	{ label: "Simplificado", value: "simplificado" },
	{ label: "Detalhado", value: "detalhado" },
];

export function DateFilterModal({
	isOpen,
	onClose,
	showSearch = false,
	searchText = "",
	onApplySearch,
	showGroupCards = false,
	groupCards = true,
	onToggleGroupCards,
}) {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const {
		dateRange,
		setDateRange,
		dateField,
		setDateField,
		dateInputMode,
		setDateInputMode,
	} = useFinanceDate();

	const [pendingSearch, setPendingSearch] = useState("");
	const [pendingStart, setPendingStart] = useState(dateRange?.start ?? null);
	const [pendingEnd, setPendingEnd] = useState(dateRange?.end ?? null);
	const [pendingDateField, setPendingDateField] = useState(
		dateField ?? "data_vencimento"
	);
	const [pendingMode, setPendingMode] = useState(dateInputMode ?? "detalhado");
	const [showRangePicker, setShowRangePicker] = useState(false);

	useEffect(() => {
		if (isOpen) {
			setPendingSearch(searchText ?? "");
			setPendingStart(dateRange?.start ?? null);
			setPendingEnd(dateRange?.end ?? null);
			setPendingDateField(dateField ?? "data_vencimento");
			setPendingMode(dateInputMode ?? "detalhado");
		}
	}, [
		isOpen,
		searchText,
		dateRange?.start,
		dateRange?.end,
		dateField,
		dateInputMode,
	]);

	const stepperDate = pendingStart
		? new Date(`${pendingStart}T12:00:00`)
		: new Date();

	const handleModeChange = useCallback(
		(mode) => {
			setPendingMode(mode);
			if (mode === "simplificado") {
				const base = pendingStart
					? new Date(`${pendingStart}T12:00:00`)
					: new Date();
				const { start, end } = buildMonthDateRange(
					base.getFullYear(),
					base.getMonth()
				);
				setPendingStart(start);
				setPendingEnd(end);
			}
		},
		[pendingStart]
	);

	const handleMonthChange = useCallback((year, monthIndex) => {
		const { start, end } = buildMonthDateRange(year, monthIndex);
		setPendingStart(start);
		setPendingEnd(end);
	}, []);

	const handleRangeConfirm = useCallback(({ startDate, endDate }) => {
		setShowRangePicker(false);
		if (startDate) setPendingStart(toISODateString(startDate));
		if (endDate) setPendingEnd(toISODateString(endDate));
	}, []);

	const handleApply = useCallback(() => {
		if (pendingStart && pendingEnd) {
			setDateRange({ start: pendingStart, end: pendingEnd });
		}
		setDateField(pendingDateField);
		setDateInputMode(pendingMode);
		if (showSearch && onApplySearch) onApplySearch(pendingSearch.trim());
		onClose();
	}, [
		pendingStart,
		pendingEnd,
		pendingDateField,
		pendingMode,
		pendingSearch,
		showSearch,
		onApplySearch,
		setDateRange,
		setDateField,
		setDateInputMode,
		onClose,
	]);

	const handleClear = useCallback(() => {
		const def = buildDefaultHomeDateRange();
		setPendingSearch("");
		setPendingStart(def.start);
		setPendingEnd(def.end);
		setPendingDateField("data_vencimento");
	}, []);

	const handleClose = useCallback(() => {
		setShowRangePicker(false);
		onClose();
	}, [onClose]);

	const dateLabel =
		pendingStart && pendingEnd
			? `${pendingStart.split("-").reverse().join("/")} até ${pendingEnd.split("-").reverse().join("/")}`
			: "Selecionar período";

	return (
		<>
			<Modal isOpen={isOpen} onClose={handleClose} size="md">
				<ModalBackdrop />
				<ModalContent>
					<ModalHeader>
						<Text
							className="text-lg font-semibold"
							style={{ color: colors.textPrimary }}
						>
							Filtrar por período
						</Text>
					</ModalHeader>

					<ModalBody>
						<Box className="gap-4">
							{showSearch ? (
								<Box className="gap-2">
									<Text
										className="text-xs"
										style={{ color: colors.textSecondary }}
									>
										Pesquisar
									</Text>
									<Box
										className="flex-row items-center rounded-xl border px-3 py-2 gap-2"
										style={{
											backgroundColor: colors.surfaceMuted,
											borderColor: colors.border,
										}}
									>
										<Search size={16} color={colors.textSecondary} />
										<TextInput
											value={pendingSearch}
											onChangeText={setPendingSearch}
											placeholder="Categoria, pessoa ou descrição..."
											placeholderTextColor={colors.textSecondary}
											style={{
												flex: 1,
												color: colors.textPrimary,
												fontSize: 14,
												paddingVertical: 2,
											}}
											returnKeyType="done"
											autoCorrect={false}
										/>
									</Box>
								</Box>
							) : null}

							<FormRadioGroup
								label="Filtrar por"
								value={pendingDateField}
								onChange={setPendingDateField}
								options={DATE_FIELD_OPTIONS}
								orientation="horizontal"
							/>

							<FormRadioGroup
								label="Tipo de campo"
								value={pendingMode}
								onChange={handleModeChange}
								options={INPUT_MODE_OPTIONS}
								orientation="horizontal"
							/>

							<Box className="gap-2">
								<Text
									className="text-xs"
									style={{ color: colors.textSecondary }}
								>
									Período
								</Text>
								{pendingMode === "simplificado" ? (
									<MonthStepper
										year={stepperDate.getFullYear()}
										monthIndex={stepperDate.getMonth()}
										onChange={handleMonthChange}
										colors={colors}
									/>
								) : (
									<Pressable onPress={() => setShowRangePicker(true)}>
										<Box
											className="flex-row items-center justify-between rounded-xl border px-3 py-3"
											style={{
												backgroundColor: colors.surfaceMuted,
												borderColor: colors.border,
											}}
										>
											<HStack className="items-center gap-2">
												<CalendarDays
													size={16}
													color={colors.textPrimary}
												/>
												<Text
													style={{
														color:
															pendingStart && pendingEnd
																? colors.textPrimary
																: colors.textSecondary,
													}}
												>
													{dateLabel}
												</Text>
											</HStack>
											<ChevronDown
												size={16}
												color={colors.textSecondary}
											/>
										</Box>
									</Pressable>
								)}
							</Box>

							{showGroupCards ? (
								<Box
									className="flex-row items-center justify-between rounded-xl px-3 py-3"
									style={{ backgroundColor: colors.surfaceMuted }}
								>
									<Box className="flex-1 pr-3">
										<Text
											className="font-semibold"
											style={{ color: colors.textPrimary }}
										>
											Agrupar lançamentos de cartão
										</Text>
										<Text size="sm" style={{ color: colors.textSecondary }}>
											Mostra a fatura como uma linha única. Desligue para
											ver cada compra.
										</Text>
									</Box>
									<Switch
										value={Boolean(groupCards)}
										onValueChange={onToggleGroupCards}
										trackColor={{
											false: colors.borderStrong,
											true: colors.success,
										}}
										thumbColor={colors.surface}
									/>
								</Box>
							) : null}
						</Box>
					</ModalBody>

					<ModalFooter>
						<HStack className="gap-2 flex-1">
							<Button
								variant="outline"
								className="flex-1"
								onPress={handleClear}
							>
								<ButtonText>Limpar tudo</ButtonText>
							</Button>
							<Button className="flex-1" onPress={handleApply}>
								<ButtonText>Aplicar Filtros</ButtonText>
							</Button>
						</HStack>
					</ModalFooter>
				</ModalContent>
			</Modal>

			<DatePickerDialog
				visible={showRangePicker}
				locale="pt"
				mode="range"
				startDate={
					pendingStart ? new Date(`${pendingStart}T00:00:00`) : undefined
				}
				endDate={pendingEnd ? new Date(`${pendingEnd}T12:00:00`) : undefined}
				onDismiss={() => setShowRangePicker(false)}
				onConfirm={handleRangeConfirm}
			/>
		</>
	);
}
