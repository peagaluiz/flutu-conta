import React from "react";
import { Switch } from "react-native";
import { DatePickerDialog } from "@/components/ui/DatePickerDialog";
import { Controller, useWatch } from "react-hook-form";
import { Grid, GridItem } from "@/components/ui/grid";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import {
	FormControl,
	FormControlError,
	FormControlErrorText,
	FormControlLabel,
	FormControlLabelText,
} from "@/components/ui/form-control";
import { FormRadioGroup } from "@/components/ui/radio-button/FormRadioGroup";
import { CalendarDays, ChevronDown, Repeat, X } from "lucide-react-native";

const FREQUENCY_OPTIONS = [
	{ label: "Mensal", value: "mensal" },
	{ label: "Semanal", value: "semanal" },
	{ label: "Anual", value: "anual" },
];

export function RecurrenceSection({
	isDarkMode,
	themeColors,
	control,
	errors,
	recurrenceMode,
	recurrenceFrequency,
	recurrenceFrequencyLabel,
	dataVencimento,
	isEditMode,
	isFromRecurrence,
	recurrenceMeta,
	showRecurrenceEndPicker,
	setShowRecurrenceEndPicker,
	setValue,
	formatDateDisplay,
	parseDateValue,
	toISODate,
}) {
	const inputContainerStyle = {
		borderColor: themeColors?.borderStrong,
		backgroundColor: themeColors?.surface,
	};

	const canConfigureRecurrence = !isEditMode;
	const localMode = useWatch({ control, name: "recurrence_mode" });
	const localSkipNonWorking = useWatch({ control, name: "recurrence_skip_non_working" });

	return (
		<Grid
			className="grid w-full rounded-md border p-5 gap-x-5 gap-y-2"
			style={{
				minHeight: "auto",
				flexDirection: "row",
				backgroundColor: isDarkMode ? "#1C1C1E" : "#FFFFFF",
				borderColor: isDarkMode ? "rgba(255,255,255,0.10)" : "#E2E8F0",
			}}
		>
			<GridItem _extra={{ className: "col-span-12" }}>
				<Text
					className="text-base font-semibold"
					style={{ color: isDarkMode ? "#F8FAFC" : "#0F172A" }}
				>
					Recorrência
				</Text>
			</GridItem>

			{isEditMode ? (
				<GridItem _extra={{ className: "col-span-12" }}>
					<Box
						className="rounded-xl border px-3 py-3"
						style={{
							borderColor: themeColors.border,
							backgroundColor: themeColors.surfaceMuted,
						}}
					>
						<Text
							className="font-medium"
							style={{ color: themeColors.textPrimary }}
						>
							{isFromRecurrence
								? "Lançamento originado de recorrência"
								: "Lançamento avulso"}
						</Text>
						<Text
							className="text-xs"
							style={{ color: themeColors.textSecondary }}
						>
							{isFromRecurrence
								? `Série ${recurrenceMeta?.recurrence_frequency ||
								"mensal"
								}${recurrenceMeta?.recurrence_sequence
									? ` • ocorrência #${recurrenceMeta.recurrence_sequence}`
									: ""
								}`
								: "Transações existentes não podem virar recorrentes."}
						</Text>
					</Box>
				</GridItem>
			) : null}

			{!isEditMode ? (
				<GridItem _extra={{ className: "col-span-12" }}>
					<Controller
						control={control}
						name="recurrence_mode"
						render={({ field: { onChange, value } }) => (
							<FormRadioGroup
								label="Tipo"
								value={value}
								onChange={(nextValue) => {
									onChange(nextValue);
									if (nextValue !== "recorrente") {
										setValue("recurrence_end_date", "");
										setValue("recurrence_frequency", "mensal");
										setValue("recurrence_skip_non_working", false);
										setValue("recurrence_skip_direction", "");
									}
								}}
								options={[
									{ label: "Única", value: "unica" },
									{ label: "Recorrente", value: "recorrente" },
								]}
								error={errors.recurrence_mode}
								orientation="horizontal"
								isRequired
							/>
						)}
					/>
				</GridItem>
			) : null}

			{localMode === "recorrente" && canConfigureRecurrence ? (
				<GridItem
					_extra={{ className: "col-span-12 lg:col-span-6" }}
				>
					<Controller
						control={control}
						name="recurrence_frequency"
						render={({ field: { onChange, value } }) => (
							<FormControl
								size="md"
								isRequired
								isInvalid={!!errors.recurrence_frequency}
								className="my-1"
							>
								<FormControlLabel>
									<FormControlLabelText>
										Frequência
									</FormControlLabelText>
								</FormControlLabel>

								<Box
									className="rounded border px-3 py-3"
									style={inputContainerStyle}
								>
									<Pressable
										onPress={() =>
											onChange(
												value === "mensal"
													? "semanal"
													: value === "semanal"
														? "anual"
														: "mensal"
											)
										}
									>
										<Box className="flex-row items-center justify-between">
											<Box className="flex-row items-center gap-2">
												<Repeat
													size={16}
													color={
														themeColors.textPrimary
													}
												/>
												<Text
													style={{
														color: themeColors.textPrimary,
													}}
												>
													{recurrenceFrequencyLabel}
												</Text>
											</Box>
											<ChevronDown
												size={16}
												color={
													themeColors.textPrimary
												}
											/>
										</Box>
									</Pressable>

									<Box className="mt-2 flex-row flex-wrap gap-2">
										{FREQUENCY_OPTIONS.map((option) => {
											const active =
												option.value === value;
											return (
												<Pressable
													key={option.value}
													onPress={() =>
														onChange(
															option.value
														)
													}
												>
													<Box
														className="rounded-full border px-3 py-1"
														style={{
															borderColor:
																active
																	? themeColors.textPrimary
																	: themeColors.border,
															backgroundColor:
																active
																	? themeColors.textPrimary
																	: themeColors.surface,
														}}
													>
														<Text
															className="text-xs"
															style={{
																color: active
																	? themeColors.surface
																	: themeColors.textSecondary,
															}}
														>
															{option.label}
														</Text>
													</Box>
												</Pressable>
											);
										})}
									</Box>
								</Box>

								{errors.recurrence_frequency?.message ? (
									<FormControlError>
										<FormControlErrorText>
											{
												errors.recurrence_frequency
													.message
											}
										</FormControlErrorText>
									</FormControlError>
								) : null}
							</FormControl>
						)}
					/>
				</GridItem>
			) : null}

			{localMode === "recorrente" && canConfigureRecurrence ? (
				<GridItem
					_extra={{ className: "col-span-12 lg:col-span-6" }}
				>
					<Controller
						control={control}
						name="recurrence_end_date"
						render={({ field: { onChange, value } }) => (
							<FormControl
								size="md"
								isInvalid={!!errors.recurrence_end_date}
								className="my-1"
							>
								<FormControlLabel>
									<FormControlLabelText>
										Término (opcional)
									</FormControlLabelText>
								</FormControlLabel>

								<Pressable
									onPress={() =>
										setShowRecurrenceEndPicker(true)
									}
								>
									<Box
										className="w-full h-10 rounded border px-3 flex-row items-center justify-between"
										style={inputContainerStyle}
									>
										<Box className="flex-row items-center gap-2">
											<CalendarDays
												size={16}
												color={
													themeColors.textPrimary
												}
											/>
											<Text
												style={{
													color: value
														? themeColors.textPrimary
														: themeColors.textSecondary,
												}}
											>
												{formatDateDisplay(value)}
											</Text>
										</Box>
										{value ? (
											<Pressable onPress={() => onChange("")} hitSlop={8}>
												<X size={16} color={themeColors.textSecondary} />
											</Pressable>
										) : (
											<ChevronDown size={16} color={themeColors.textPrimary} />
										)}
									</Box>
								</Pressable>

								<DatePickerDialog
									visible={showRecurrenceEndPicker}
									locale="pt"
									mode="single"
									date={parseDateValue(value || dataVencimento)}
									onDismiss={() => setShowRecurrenceEndPicker(false)}
									onConfirm={({ date }) => {
										setShowRecurrenceEndPicker(false);
										if (date) onChange(toISODate(date));
									}}
								/>
							</FormControl>
						)}
					/>
				</GridItem>
			) : null}

			{localMode === "recorrente" && canConfigureRecurrence ? (
				<GridItem _extra={{ className: "col-span-12" }}>
					<Controller
						control={control}
						name="recurrence_skip_non_working"
						render={({ field: { onChange, value } }) => (
							<Box
								className="rounded-xl border px-3 py-3"
								style={{
									borderColor: themeColors.border,
									backgroundColor: themeColors.surfaceMuted,
								}}
							>
								<Box className="flex-row items-center justify-between">
									<Box className="flex-1 pr-3">
										<Text
											className="font-semibold"
											style={{ color: themeColors.textPrimary }}
										>
											Ignorar feriados e domingos
										</Text>
										<Text
											size="sm"
											style={{ color: themeColors.textSecondary }}
										>
											Se o vencimento cair em feriado nacional ou domingo, ajusta a data.
										</Text>
									</Box>
									<Switch
										value={Boolean(value)}
										onValueChange={(next) => {
											onChange(next);
											setValue(
												"recurrence_skip_direction",
												next ? "after" : ""
											);
										}}
										trackColor={{ false: themeColors.borderStrong, true: themeColors.success }}
										thumbColor={themeColors.surface}
									/>
								</Box>
							</Box>
						)}
					/>
				</GridItem>
			) : null}

			{localMode === "recorrente" && canConfigureRecurrence && localSkipNonWorking ? (
				<GridItem _extra={{ className: "col-span-12" }}>
					<Controller
						control={control}
						name="recurrence_skip_direction"
						render={({ field: { onChange, value } }) => (
							<FormRadioGroup
								label="Mover para"
								value={value}
								onChange={onChange}
								options={[
									{ label: "Dia anterior", value: "before" },
									{ label: "Dia seguinte", value: "after" },
								]}
								error={errors.recurrence_skip_direction}
								orientation="horizontal"
								isRequired
							/>
						)}
					/>
				</GridItem>
			) : null}

			{localMode === "recorrente" && canConfigureRecurrence ? (
				<GridItem _extra={{ className: "col-span-12" }}>
					<Text
						className="text-xs"
						style={{ color: themeColors.textSecondary }}
					>
						A data de vencimento desta transação será usada como
						base da recorrência.
					</Text>
				</GridItem>
			) : null}
		</Grid>
	);
}
