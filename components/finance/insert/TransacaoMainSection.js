import React from "react";
import { Platform, Switch } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Controller } from "react-hook-form";
import { Grid, GridItem } from "@/components/ui/grid";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Button, ButtonText } from "@/components/ui/button";
import {
  FormControl,
  FormControlError,
  FormControlErrorText,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetItem,
  ActionsheetItemText,
} from "@/components/ui/actionsheet";
import { FormRadioGroup } from "@/components/ui/radio-button/FormRadioGroup";
import { MaskedFormInput } from "@/components/ui/input/MaskedFormInput";
import { Landmark, Tag, CalendarDays, UserRound, ChevronDown, X } from "lucide-react-native";

export function TransacaoMainSection({
  isDarkMode,
  themeColors,
  isEditMode,
  control,
  errors,
  decimalMask,
  categorias,
  categoriaAtual,
  showCategorySheet,
  setShowCategorySheet,
  actionSheetContentStyle,
  dataVencimento,
  showDatePicker,
  setShowDatePicker,
  parseDateValue,
  toISODate,
  formatDateDisplay,
  pessoaAtual,
  pessoaSuggestions,
  isPessoaFocused,
  setIsPessoaFocused,
  setPessoaSuggestions,
  pessoaBlurTimeoutRef,
  shareWithFamily,
  canShareWithFamily,
  onShareWithFamilyChange,
}) {
  const isPessoaSuggestionsOpen =
    isPessoaFocused && (pessoaAtual || "").trim().length >= 3 && pessoaSuggestions.length > 0;
  const inputBorderColor = themeColors?.borderStrong;
  const inputBackgroundColor = themeColors?.surface;
  const textPrimary = themeColors?.textPrimary;
  const textSecondary = themeColors?.textSecondary;
  const inputContainerStyle = { borderColor: inputBorderColor, backgroundColor: inputBackgroundColor };

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
        <Text className="text-lg font-semibold" style={{ color: isDarkMode ? "#F8FAFC" : "#0F172A" }}>
          {isEditMode ? "Editar lançamento" : "Novo lançamento"}
        </Text>
      </GridItem>

      <GridItem _extra={{ className: "col-span-12" }}>
        <Controller
          control={control}
          name="descricao"
          render={({ field: { onChange, onBlur, value } }) => (
            <MaskedFormInput
              label="Descrição (opcional)"
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              error={errors.descricao}
              placeholder="Ex: Mensalidade academia"
              inputContainerStyle={inputContainerStyle}
              isRequired={false}
            />
          )}
        />
      </GridItem>

      <GridItem _extra={{ className: "col-span-12 lg:col-span-6" }}>
        <Controller
          control={control}
          name="tipo"
          render={({ field: { onChange, value } }) => (
            <FormRadioGroup
              label="Tipo da transação"
              value={value}
              onChange={onChange}
              options={[
                { label: "A pagar", value: "pagar" },
                { label: "A receber", value: "receber" },
              ]}
              error={errors.tipo}
              orientation="horizontal"
              isRequired
            />
          )}
        />
      </GridItem>

      <GridItem _extra={{ className: "col-span-12 lg:col-span-6" }}>
        <Controller
          control={control}
          name="status"
          render={({ field: { onChange, value } }) => (
            <FormRadioGroup
              label="Status"
              value={value}
              onChange={onChange}
              options={[
                { label: "Pendente", value: "pendente" },
                { label: "Pago", value: "pago" },
              ]}
              error={errors.status}
              orientation="horizontal"
              isRequired
            />
          )}
        />
      </GridItem>

      <GridItem _extra={{ className: "col-span-12 lg:col-span-4" }}>
        <Controller
          control={control}
          name="valor"
          render={({ field: { onChange, onBlur, value } }) => (
            <MaskedFormInput
              label="Valor"
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              mask={decimalMask}
              error={errors.valor}
              icon={Landmark}
              placeholder="0,00"
              keyboardType="decimal-pad"
              classNameInput="text-end"
              useMaskedValue
              style={{ color: textPrimary }}
              inputContainerStyle={inputContainerStyle}
              isRequired
            />
          )}
        />
      </GridItem>

      <GridItem _extra={{ className: "col-span-12 lg:col-span-4" }}>
        <Controller
          control={control}
          name="categoria"
          render={({ field: { onChange } }) => (
            <FormControl size="md" isRequired isInvalid={!!errors.categoria} className="my-1">
              <FormControlLabel>
                <FormControlLabelText>Categoria</FormControlLabelText>
              </FormControlLabel>

              <Pressable onPress={() => setShowCategorySheet(true)}>
                <Box
                  className="w-full h-10 rounded border px-3 flex-row items-center justify-between"
                  style={inputContainerStyle}
                >
                  <HStack space="sm" className="items-center">
                    <Tag size={16} color={textPrimary} />
                    <Text style={{ color: categoriaAtual ? textPrimary : textSecondary }}>
                      {categoriaAtual || "Selecionar categoria"}
                    </Text>
                  </HStack>
                  <ChevronDown size={16} color={textPrimary} />
                </Box>
              </Pressable>

              {errors.categoria?.message ? (
                <FormControlError>
                  <FormControlErrorText>{errors.categoria.message}</FormControlErrorText>
                </FormControlError>
              ) : null}

              <Actionsheet isOpen={showCategorySheet} onClose={() => setShowCategorySheet(false)}>
                <ActionsheetBackdrop />
                <ActionsheetContent style={actionSheetContentStyle}>
                  <ActionsheetDragIndicatorWrapper>
                    <ActionsheetDragIndicator />
                  </ActionsheetDragIndicatorWrapper>
                  {categorias.map((categoria) => (
                    <ActionsheetItem
                      key={categoria}
                      onPress={() => {
                        onChange(categoria);
                        setShowCategorySheet(false);
                      }}
                    >
                      <ActionsheetItemText>{categoria}</ActionsheetItemText>
                    </ActionsheetItem>
                  ))}
                </ActionsheetContent>
              </Actionsheet>
            </FormControl>
          )}
        />
      </GridItem>

      <GridItem _extra={{ className: "col-span-12 lg:col-span-4" }}>
        <Controller
          control={control}
          name="pessoa"
          render={({ field: { onChange, onBlur, value } }) => (
            <Box className="relative" style={{ zIndex: 50 }}>
              <MaskedFormInput
                label="Pessoa (opcional)"
                value={value}
                onChange={onChange}
                onFocus={() => {
                  if (pessoaBlurTimeoutRef.current) {
                    clearTimeout(pessoaBlurTimeoutRef.current);
                    pessoaBlurTimeoutRef.current = null;
                  }
                  setIsPessoaFocused(true);
                }}
                onBlur={() => {
                  pessoaBlurTimeoutRef.current = setTimeout(() => {
                    setIsPessoaFocused(false);
                    setPessoaSuggestions([]);
                  }, 120);
                  onBlur();
                }}
                error={errors.pessoa}
                icon={UserRound}
                placeholder="Nome do contato"
                className="my-0"
                classNameInputTag={isPessoaSuggestionsOpen ? "rounded-b-none" : ""}
                inputContainerStyle={inputContainerStyle}
                isRequired={false}
              />

              {isPessoaSuggestionsOpen ? (
                <Box
                  className="border border-t-0 rounded-b-md rounded-t-none"
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: "100%",
                    marginTop: -1,
                    zIndex: 60,
                    borderColor: isDarkMode ? "rgba(255,255,255,0.10)" : "#E2E8F0",
                    backgroundColor: isDarkMode ? "#1C1C1E" : "#FFFFFF",
                  }}
                >
                  {pessoaSuggestions.map((name) => (
                    <Pressable
                      key={name}
                      onPressIn={() => {
                        if (pessoaBlurTimeoutRef.current) {
                          clearTimeout(pessoaBlurTimeoutRef.current);
                          pessoaBlurTimeoutRef.current = null;
                        }
                      }}
                      onPress={() => {
                        onChange(name);
                        setIsPessoaFocused(false);
                        setPessoaSuggestions([]);
                      }}
                    >
                      <Box className="px-3 py-2 border-b" style={{ borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "#F1F5F9" }}>
                        <Text style={{ color: isDarkMode ? "#E2E8F0" : "#334155" }}>{name}</Text>
                      </Box>
                    </Pressable>
                  ))}
                </Box>
              ) : null}
            </Box>
          )}
        />
      </GridItem>

      <GridItem _extra={{ className: "col-span-12 lg:col-span-4" }}>
        <Controller
          control={control}
          name="data_vencimento"
          render={({ field: { onChange } }) => (
            <FormControl size="md" isInvalid={!!errors.data_vencimento} className="my-1">
              <FormControlLabel>
                <FormControlLabelText>Vencimento</FormControlLabelText>
              </FormControlLabel>

              <Pressable onPress={() => setShowDatePicker(true)}>
                <Box
                  className="w-full h-10 rounded border px-3 flex-row items-center justify-between"
                  style={inputContainerStyle}
                >
                  <HStack space="sm" className="items-center">
                    <CalendarDays size={16} color={textPrimary} />
                    <Text style={{ color: dataVencimento ? textPrimary : textSecondary }}>
                      {formatDateDisplay(dataVencimento)}
                    </Text>
                  </HStack>
                  {dataVencimento ? (
                    <Pressable onPress={() => onChange("")} hitSlop={8}>
                      <X size={16} color={textSecondary} />
                    </Pressable>
                  ) : (
                    <ChevronDown size={16} color={textPrimary} />
                  )}
                </Box>
              </Pressable>

              {showDatePicker ? (
                <DateTimePicker
                  value={parseDateValue(dataVencimento)}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, selectedDate) => {
                    if (Platform.OS === "android") setShowDatePicker(false);
                    if (selectedDate) onChange(toISODate(selectedDate));
                  }}
                />
              ) : null}
            </FormControl>
          )}
        />
      </GridItem>

      {canShareWithFamily ? (
        <GridItem _extra={{ className: "col-span-12" }}>
          <Box className="mt-1 mb-1 rounded-xl px-3 py-3" style={{ backgroundColor: themeColors.surfaceMuted }}>
            <Box className="flex-row items-center justify-between">
              <Box className="flex-1 pr-3">
                <Text className="font-semibold" style={{ color: textPrimary }}>
                  Compartilhar com a família
                </Text>
                <Text size="sm" style={{ color: textSecondary }}>
                  Quando ativo, este lançamento fica visível para os membros da família.
                </Text>
              </Box>
              <Switch
                value={Boolean(shareWithFamily)}
                onValueChange={(nextValue) => onShareWithFamilyChange?.(nextValue)}
                trackColor={{ false: themeColors.borderStrong, true: themeColors.success }}
                thumbColor={themeColors.surface}
              />
            </Box>
          </Box>
        </GridItem>
      ) : null}
    </Grid>
  );
}
