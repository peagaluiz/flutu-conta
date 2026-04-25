import React from "react";
import { Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Controller } from "react-hook-form";
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
import { MaskedFormInput } from "@/components/ui/input/MaskedFormInput";
import { CalendarDays, ChevronDown, Repeat } from "lucide-react-native";

const FREQUENCY_OPTIONS = [
  { label: "Mensal", value: "mensal" },
  { label: "Semanal", value: "semanal" },
  { label: "Anual", value: "anual" },
  { label: "Personalizada (dias)", value: "dias" },
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
        <Text className="text-base font-semibold" style={{ color: isDarkMode ? "#F8FAFC" : "#0F172A" }}>
          Recorrência
        </Text>
      </GridItem>

      {isEditMode ? (
        <GridItem _extra={{ className: "col-span-12" }}>
          <Box className="rounded-xl border px-3 py-3" style={{ borderColor: themeColors.border, backgroundColor: themeColors.surfaceMuted }}>
            <Text className="font-medium" style={{ color: themeColors.textPrimary }}>
              {isFromRecurrence ? "Lançamento originado de recorrência" : "Lançamento avulso"}
            </Text>
            <Text className="text-xs" style={{ color: themeColors.textSecondary }}>
              {isFromRecurrence
                ? `Série ${recurrenceMeta?.recurrence_frequency || "mensal"}${recurrenceMeta?.recurrence_sequence ? ` • ocorrência #${recurrenceMeta.recurrence_sequence}` : ""}`
                : "Transações existentes não podem virar recorrentes."}
            </Text>
          </Box>
        </GridItem>
      ) : null}

      <GridItem _extra={{ className: "col-span-12" }}>
        <Controller
          control={control}
          name="recurrence_mode"
          render={({ field: { onChange, value } }) => (
            <FormRadioGroup
              label="Tipo"
              value={value}
              onChange={(nextValue) => {
                if (!canConfigureRecurrence) return;
                onChange(nextValue);
                if (nextValue !== "recorrente") {
                  setValue("recurrence_end_date", "");
                  setValue("recurrence_interval_days", "");
                  setValue("recurrence_frequency", "mensal");
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

      {recurrenceMode === "recorrente" && canConfigureRecurrence ? (
        <>
          <GridItem _extra={{ className: "col-span-12 lg:col-span-6" }}>
            <Controller
              control={control}
              name="recurrence_frequency"
              render={({ field: { onChange, value } }) => (
                <FormControl size="md" isRequired isInvalid={!!errors.recurrence_frequency} className="my-1">
                  <FormControlLabel>
                    <FormControlLabelText>Frequência</FormControlLabelText>
                  </FormControlLabel>

                  <Box className="rounded border px-3 py-3" style={inputContainerStyle}>
                    <Pressable onPress={() => onChange(value === "mensal" ? "semanal" : value === "semanal" ? "anual" : value === "anual" ? "dias" : "mensal")}>
                      <Box className="flex-row items-center justify-between">
                        <Box className="flex-row items-center gap-2">
                          <Repeat size={16} color={themeColors.textPrimary} />
                          <Text style={{ color: themeColors.textPrimary }}>{recurrenceFrequencyLabel}</Text>
                        </Box>
                        <ChevronDown size={16} color={themeColors.textPrimary} />
                      </Box>
                    </Pressable>

                    <Box className="mt-2 flex-row flex-wrap gap-2">
                      {FREQUENCY_OPTIONS.map((option) => {
                        const active = option.value === value;
                        return (
                          <Pressable key={option.value} onPress={() => onChange(option.value)}>
                            <Box
                              className="rounded-full border px-3 py-1"
                              style={{
                                borderColor: active ? themeColors.textPrimary : themeColors.border,
                                backgroundColor: active ? themeColors.textPrimary : themeColors.surface,
                              }}
                            >
                              <Text className="text-xs" style={{ color: active ? themeColors.surface : themeColors.textSecondary }}>
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
                      <FormControlErrorText>{errors.recurrence_frequency.message}</FormControlErrorText>
                    </FormControlError>
                  ) : null}
                </FormControl>
              )}
            />
          </GridItem>

          <GridItem _extra={{ className: "col-span-12 lg:col-span-6" }}>
            <Controller
              control={control}
              name="recurrence_end_date"
              render={({ field: { onChange, value } }) => (
                <FormControl size="md" isInvalid={!!errors.recurrence_end_date} className="my-1">
                  <FormControlLabel>
                    <FormControlLabelText>Término (opcional)</FormControlLabelText>
                  </FormControlLabel>

                  <Pressable onPress={() => setShowRecurrenceEndPicker(true)}>
                    <Box className="w-full h-10 rounded border px-3 flex-row items-center justify-between" style={inputContainerStyle}>
                      <Box className="flex-row items-center gap-2">
                        <CalendarDays size={16} color={themeColors.textPrimary} />
                        <Text style={{ color: value ? themeColors.textPrimary : themeColors.textSecondary }}>
                          {formatDateDisplay(value)}
                        </Text>
                      </Box>
                      <ChevronDown size={16} color={themeColors.textPrimary} />
                    </Box>
                  </Pressable>

                  {showRecurrenceEndPicker ? (
                    <DateTimePicker
                      value={parseDateValue(value || dataVencimento)}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={(_, selectedDate) => {
                        if (Platform.OS === "android") setShowRecurrenceEndPicker(false);
                        if (selectedDate) onChange(toISODate(selectedDate));
                      }}
                    />
                  ) : null}
                </FormControl>
              )}
            />
          </GridItem>

          {recurrenceFrequency === "dias" ? (
            <GridItem _extra={{ className: "col-span-12 lg:col-span-6" }}>
              <Controller
                control={control}
                name="recurrence_interval_days"
                render={({ field: { onChange, onBlur, value } }) => (
                  <MaskedFormInput
                    label="Intervalo em dias"
                    value={String(value || "")}
                    onChange={(nextValue) => onChange(nextValue.replace(/\D/g, ""))}
                    onBlur={onBlur}
                    error={errors.recurrence_interval_days}
                    placeholder="Ex: 10"
                    keyboardType="number-pad"
                    inputContainerStyle={inputContainerStyle}
                    isRequired
                  />
                )}
              />
            </GridItem>
          ) : null}

          <GridItem _extra={{ className: "col-span-12" }}>
            <Text className="text-xs" style={{ color: themeColors.textSecondary }}>
              A data de vencimento desta transação será usada como base da recorrência.
            </Text>
          </GridItem>
        </>
      ) : null}
    </Grid>
  );
}
