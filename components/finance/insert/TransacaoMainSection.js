import React, { useState, useMemo } from "react";
import { Switch } from "react-native";
import { Controller, useWatch } from "react-hook-form";
import { Grid, GridItem } from "@/components/ui/grid";
import { DatePickerDialog } from "@/components/ui/DatePickerDialog";
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
import { SearchableSelect } from "@/components/ui/search-select";
import { SearchableSelectPessoas } from "@/components/finance/insert/SearchableSelectPessoas";
import { FormRadioGroup } from "@/components/ui/radio-button/FormRadioGroup";
import { MaskedFormInput } from "@/components/ui/input/MaskedFormInput";
import { Landmark, Tag, CalendarDays, ChevronDown, X } from "lucide-react-native";

export function TransacaoMainSection({
    isDarkMode,
    themeColors,
    isEditMode,
    control,
    errors,
    decimalMask,
    categorias,
    actionSheetContentStyle,
    dataVencimento,
    showDatePicker,
    setShowDatePicker,
    parseDateValue,
    toISODate,
    formatDateDisplay,
    canShareWithFamily,
}) {
    const inputBorderColor = themeColors?.borderStrong;
    const inputBackgroundColor = themeColors?.surface;
    const textPrimary = themeColors?.textPrimary;
    const textSecondary = themeColors?.textSecondary;
    const inputContainerStyle = { borderColor: inputBorderColor, backgroundColor: inputBackgroundColor };

    const status = useWatch({ control, name: "status" });
    const [showDataBaixaPicker, setShowDataBaixaPicker] = useState(false);

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
                    render={({ field: { onChange, value } }) => (
                        <SearchableSelect
                            label="Categoria"
                            value={value}
                            onChange={onChange}
                            error={errors.categoria}
                            options={categorias}
                            placeholder="Selecionar categoria"
                            searchPlaceholder="Pesquisar categoria..."
                            Icon={Tag}
                            isRequired={true}
                            inputContainerStyle={inputContainerStyle}
                            actionSheetContentStyle={actionSheetContentStyle}
                            themeColors={themeColors}
                            isDarkMode={isDarkMode}
                            autoFocusSearch={true}
                            fixedHeight={false}
                        />
                    )}
                />
            </GridItem>

            <GridItem _extra={{ className: "col-span-12 lg:col-span-4" }}>
                <Controller
                    control={control}
                    name="pessoa"
                    render={({ field: { onChange, value } }) => (
                        <SearchableSelectPessoas
                            label="Pessoa (opcional)"
                            value={value}
                            onChange={onChange}
                            error={errors.pessoa}
                            placeholder="Selecionar pessoa"
                            searchPlaceholder="Pesquisar pessoa..."
                            inputContainerStyle={inputContainerStyle}
                            actionSheetContentStyle={actionSheetContentStyle}
                            themeColors={themeColors}
                            isDarkMode={isDarkMode}
                            autoFocusSearch
                        />
                    )}
                />
            </GridItem>

            <GridItem _extra={{ className: "col-span-12 lg:col-span-4" }}>
                <Controller
                    control={control}
                    name="data_vencimento"
                    render={({ field: { onChange, value } }) => (
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
                                        <Text style={{ color: value ? textPrimary : textSecondary }}>
                                            {formatDateDisplay(value)}
                                        </Text>
                                    </HStack>
                                    {value ? (
                                        <Pressable onPress={() => onChange("")} hitSlop={8}>
                                            <X size={16} color={textSecondary} />
                                        </Pressable>
                                    ) : (
                                        <ChevronDown size={16} color={textPrimary} />
                                    )}
                                </Box>
                            </Pressable>

                            <DatePickerDialog
                                visible={showDatePicker}
                                locale="pt"
                                mode="single"
                                date={parseDateValue(value)}
                                onDismiss={() => setShowDatePicker(false)}
                                onConfirm={({ date }) => {
                                    if (date) onChange(toISODate(date));
                                }}
                            />
                        </FormControl>
                    )}
                />
            </GridItem>

            {status === "pago" ? (
                <GridItem _extra={{ className: "col-span-12 lg:col-span-4" }}>
                    <Controller
                        control={control}
                        name="data_baixa"
                        render={({ field: { onChange, value } }) => (
                            <FormControl size="md" isRequired isInvalid={!!errors.data_baixa} className="my-1">
                                <FormControlLabel>
                                    <FormControlLabelText>Data de baixa</FormControlLabelText>
                                </FormControlLabel>

                                <Pressable onPress={() => setShowDataBaixaPicker(true)}>
                                    <Box
                                        className="w-full h-10 rounded border px-3 flex-row items-center justify-between"
                                        style={inputContainerStyle}
                                    >
                                        <HStack space="sm" className="items-center">
                                            <CalendarDays size={16} color={textPrimary} />
                                            <Text style={{ color: value ? textPrimary : textSecondary }}>
                                                {formatDateDisplay(value)}
                                            </Text>
                                        </HStack>
                                        <ChevronDown size={16} color={textPrimary} />
                                    </Box>
                                </Pressable>

                                <DatePickerDialog
                                    visible={showDataBaixaPicker}
                                    locale="pt"
                                    mode="single"
                                    date={parseDateValue(value)}
                                    onDismiss={() => setShowDataBaixaPicker(false)}
                                    onConfirm={({ date }) => {
                                        if (date) onChange(toISODate(date));
                                    }}
                                />

                                {errors.data_baixa?.message ? (
                                    <FormControlError>
                                        <FormControlErrorText>{errors.data_baixa.message}</FormControlErrorText>
                                    </FormControlError>
                                ) : null}
                            </FormControl>
                        )}
                    />
                </GridItem>
            ) : null}

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
                            <Controller
                                control={control}
                                name="share_with_family"
                                render={({ field: { value, onChange } }) => (
                                    <Switch
                                        value={Boolean(value)}
                                        onValueChange={onChange}
                                        trackColor={{ false: themeColors.borderStrong, true: themeColors.success }}
                                        thumbColor={themeColors.surface}
                                    />
                                )}
                            />
                        </Box>
                    </Box>
                </GridItem>
            ) : null}
        </Grid>
    );
}
