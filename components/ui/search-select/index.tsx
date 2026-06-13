import React, { useState, useMemo, useEffect } from "react";
import { FlatList, Keyboard, Dimensions, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
    useSharedValue,
    withTiming,
    Easing,
    useAnimatedStyle,
} from "react-native-reanimated";

import { ChevronRight, Circle, CircleCheckBig, CirclePlus, ChevronDown, Search, LucideIcon } from "lucide-react-native";

// Timing sem overshoot: acompanha o teclado e para exatamente onde ele parar
const TIMING = { duration: 250, easing: Easing.out(Easing.cubic) };
// Cache da última altura do teclado. Persiste entre renders pra animar
// imediatamente no onFocus, sem esperar keyboardDidShow.
let cachedKeyboardHeight = 0;
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
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
import { MaskedFormInput } from "@/components/ui/input/MaskedFormInput";
import { useSelectorOverlay } from "@/state/SelectorOverlayContext";

type NormalizedOption = {
    id: string | number;
    label: string;
    rawLabel?: string;
    variant?: "catalog";
};

type Option = string | NormalizedOption;

const SCREEN_HEIGHT = Dimensions.get("window").height;
const MAX_HEIGHT = SCREEN_HEIGHT * 0.55;
// Drag indicator (~16) + padding do ActionsheetContent (pt-2 + p-5 ≈ 28)
const SHEET_HEADER_HEIGHT = 44;

// ─── Sheet (parte interna do actionsheet, controlada externamente) ───────────

interface SearchableSelectSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (id: string | number) => void;
    options: NormalizedOption[];
    value?: string | number | null;
    searchPlaceholder?: string;
    themeColors?: { textPrimary?: string; textSecondary?: string };
    autoFocusSearch?: boolean;
    fixedHeight?: boolean;
    actionSheetContentStyle?: object;
    inputContainerStyle?: object;
    allowCreateOption?: boolean;
    getCreateLabel?: (search: string) => string;
}

export function SearchableSelectSheet({
    isOpen,
    onClose,
    onSelect,
    options = [],
    value,
    searchPlaceholder = "Pesquisar...",
    themeColors,
    autoFocusSearch = false,
    fixedHeight = true,
    actionSheetContentStyle,
    inputContainerStyle,
    allowCreateOption = false,
    getCreateLabel,
}: SearchableSelectSheetProps) {
    const insets = useSafeAreaInsets();
    const [searchTerm, setSearchTerm] = useState("");
    const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
    const kbOffset = useSharedValue(0);

    useEffect(() => {
        const show = Keyboard.addListener("keyboardDidShow", (e) => {
            const kh = e.endCoordinates.height;
            cachedKeyboardHeight = kh;
            // Corrige para a altura real caso o onFocus tenha usado o cache/fallback
            if (Math.abs(kbOffset.value + kh) > 5) {
                kbOffset.value = withTiming(-kh, TIMING);
            }
        });
        const hide = Keyboard.addListener("keyboardDidHide", () => {
            kbOffset.value = withTiming(0, TIMING);
        });
        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

    const handleInputFocus = () => {
        if (kbOffset.value < -10) return; // já animado
        const kh = cachedKeyboardHeight || 300;
        kbOffset.value = withTiming(-kh, TIMING);
    };

    const kbWrapperStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: kbOffset.value }],
        width: "100%",
        height: "100%",
    }));

    const availableHeight =
        SCREEN_HEIGHT - insets.top - SHEET_HEADER_HEIGHT;

    const containerStyle = useAnimatedStyle(() => ({
        width: "100%",
        paddingHorizontal: 8,
        paddingBottom: 16,
        height: Math.min(MAX_HEIGHT, availableHeight + kbOffset.value),
    }));

    const textPrimary = themeColors?.textPrimary;
    const textSecondary = themeColors?.textSecondary;

    const filteredOptions = useMemo(() => {
        const trimmed = searchTerm.trim();
        let list = options.filter((item) =>
            item.label.toLowerCase().includes(trimmed.toLowerCase())
        );
        if (allowCreateOption && trimmed.length > 0) {
            const exists = options.some(
                (item) => item.label.toLowerCase() === trimmed.toLowerCase()
            );
            if (!exists) {
                list.unshift({
                    id: trimmed,
                    label: getCreateLabel ? getCreateLabel(trimmed) : `Criar "${trimmed}"`,
                });
            }
        }
        return list;
    }, [options, searchTerm, allowCreateOption, getCreateLabel]);

    useEffect(() => {
        if (!isOpen) {
            setShouldAutoFocus(false);
            setSearchTerm("");
            kbOffset.value = 0;
        } else if (autoFocusSearch) {
            const t = setTimeout(() => setShouldAutoFocus(true), 350);
            return () => clearTimeout(t);
        }
    }, [isOpen]);

    const handleClose = () => {
        Keyboard.dismiss();
        setSearchTerm("");
        setShouldAutoFocus(false);
        onClose();
    };

    const handleSelect = (id: string | number) => {
        onSelect(id);
        handleClose();
    };

    return (
        <Actionsheet isOpen={isOpen} onClose={handleClose}>
            <ActionsheetBackdrop onPress={handleClose} />
            <Animated.View style={kbWrapperStyle} pointerEvents="box-none">
                <ActionsheetContent style={actionSheetContentStyle}>
                    <ActionsheetDragIndicatorWrapper>
                        <ActionsheetDragIndicator />
                    </ActionsheetDragIndicatorWrapper>

                    <Animated.View style={containerStyle}>
                        <MaskedFormInput
                            label=""
                            placeholder={searchPlaceholder}
                            icon={Search}
                            value={searchTerm}
                            onChange={setSearchTerm}
                            onFocus={handleInputFocus}
                            onBlur={() => { }}
                            className="w-full my-2"
                            inputContainerStyle={inputContainerStyle}
                            isRequired={false}
                            autoFocus={shouldAutoFocus}
                        />

                        <Box
                            style={{
                                height: StyleSheet.hairlineWidth,
                                backgroundColor: textSecondary,
                                opacity: 0.4,
                                marginHorizontal: -28,
                                marginBottom: 8,
                            }}
                        />

                        <Box className="flex-1">
                            <FlatList
                                data={filteredOptions}
                                keyExtractor={(item) => String(item.id)}
                                initialNumToRender={15}
                                maxToRenderPerBatch={10}
                                windowSize={5}
                                removeClippedSubviews={true}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={true}
                                renderItem={({ item }) => {
                                    const isSelected = String(item.id) === String(value);
                                    const isCreateOption =
                                        allowCreateOption &&
                                        getCreateLabel &&
                                        item.label === getCreateLabel(searchTerm.trim());
                                    const isCatalogOnly = item.variant === "catalog";
                                    const dimColor = isCatalogOnly ? textSecondary : undefined;
                                    return (
                                        <ActionsheetItem onPress={() => handleSelect(item.id)}>
                                            <HStack className="flex-row items-center justify-between w-full">
                                                <HStack className="items-center gap-2">
                                                    {isSelected ? (
                                                        <CircleCheckBig size={18} color={textPrimary} />
                                                    ) : isCreateOption || isCatalogOnly ? (
                                                        <CirclePlus size={18} color={textSecondary} />
                                                    ) : (
                                                        <Circle size={18} color={textSecondary} />
                                                    )}
                                                    <ActionsheetItemText style={dimColor ? { color: dimColor, opacity: 0.65 } : undefined}>
                                                        {item.label}
                                                    </ActionsheetItemText>
                                                </HStack>
                                                <ChevronRight color={dimColor ?? textPrimary} />
                                            </HStack>
                                        </ActionsheetItem>
                                    );
                                }}
                                ListEmptyComponent={
                                    <Box className="p-4 items-center">
                                        <Text style={{ color: textSecondary }}>
                                            Nenhum resultado encontrado
                                        </Text>
                                    </Box>
                                }
                            />
                        </Box>
                    </Animated.View>
                </ActionsheetContent>
            </Animated.View>
        </Actionsheet>
    );
}

// ─── SearchableSelect (trigger button + sheet) ────────────────────────────────

interface SearchableSelectProps {
    label: string;
    options: Option[];
    value: string | number | null;
    onChange: (value: string | number) => void;
    error?: { message?: string };
    placeholder?: string;
    searchPlaceholder?: string;
    Icon?: LucideIcon;
    isRequired?: boolean;
    inputContainerStyle?: object;
    actionSheetContentStyle?: object;
    themeColors?: { textPrimary?: string; textSecondary?: string };
    isDarkMode?: boolean;
    autoFocusSearch?: boolean;
    fixedHeight?: boolean;
    allowCreateOption?: boolean;
    getCreateLabel?: (search: string) => string;
}

export function SearchableSelect({
    label,
    value,
    onChange,
    error,
    options = [],
    placeholder = "Selecionar",
    searchPlaceholder = "Pesquisar...",
    Icon,
    isRequired = false,
    inputContainerStyle,
    actionSheetContentStyle,
    themeColors,
    isDarkMode,
    autoFocusSearch = false,
    fixedHeight = true,
    allowCreateOption = false,
    getCreateLabel,
}: SearchableSelectProps) {
    const [showSheet, setShowSheet] = useState(false);
    const { open: overlayOpen, close: overlayClose } = useSelectorOverlay();

    const textPrimary = themeColors?.textPrimary;
    const textSecondary = themeColors?.textSecondary;

    const normalizedOptions = useMemo<NormalizedOption[]>(() => {
        return options.map((item) => {
            if (typeof item === "string") return { id: item, label: item };
            return item;
        });
    }, [options]);

    const selected = useMemo(() => {
        const found = normalizedOptions.find((o) => String(o.id) === String(value));
        if (found) return found;
        if (value) return { id: value, label: String(value), rawLabel: String(value) };
        return undefined;
    }, [normalizedOptions, value]);

    const handleOpen = () => {
        Keyboard.dismiss();
        overlayOpen();
        setShowSheet(true);
    };

    const handleClose = () => {
        overlayClose();
        setShowSheet(false);
    };

    return (
        <FormControl size="md" isRequired={isRequired} isInvalid={!!error} className="my-1">
            <FormControlLabel>
                <FormControlLabelText>{label}</FormControlLabelText>
            </FormControlLabel>

            <Pressable onPress={handleOpen}>
                <Box
                    className="w-full h-10 rounded border px-3 flex-row items-center justify-between"
                    style={inputContainerStyle}
                >
                    <HStack space="sm" className="items-center">
                        {Icon && <Icon size={16} color={textPrimary} />}
                        <Text style={{ color: value ? textPrimary : textSecondary }}>
                            {selected?.rawLabel || selected?.label || placeholder}
                        </Text>
                    </HStack>
                    <ChevronDown size={16} color={textPrimary} />
                </Box>
            </Pressable>

            {error?.message && (
                <FormControlError>
                    <FormControlErrorText>{error.message}</FormControlErrorText>
                </FormControlError>
            )}

            <SearchableSelectSheet
                isOpen={showSheet}
                onClose={handleClose}
                onSelect={(id) => onChange(id)}
                options={normalizedOptions}
                value={value}
                searchPlaceholder={searchPlaceholder}
                themeColors={themeColors}
                autoFocusSearch={autoFocusSearch}
                fixedHeight={fixedHeight}
                actionSheetContentStyle={actionSheetContentStyle}
                inputContainerStyle={inputContainerStyle}
                allowCreateOption={allowCreateOption}
                getCreateLabel={getCreateLabel}
            />
        </FormControl>
    );
}
