import React, { useState, useMemo } from "react";
import { Keyboard, Platform } from "react-native";

import { ChevronDown, LucideIcon } from "lucide-react-native";

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
import { useSelectorOverlay } from "@/state/SelectorOverlayContext";
import { SearchableSelectSheet, NormalizedOption } from "./SearchableSelectSheet";
import { SearchableSelectDropdown } from "./SearchableSelectDropdown";

export { SearchableSelectSheet } from "./SearchableSelectSheet";
export type { NormalizedOption } from "./SearchableSelectSheet";

type Option = string | NormalizedOption;

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

export function SearchableSelect(props: SearchableSelectProps) {
    // Na web trocamos o action sheet por um dropdown ancorado ao input.
    if (Platform.OS === "web") {
        return <SearchableSelectDropdown {...props} />;
    }
    return <SearchableSelectNative {...props} />;
}

function SearchableSelectNative({
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
