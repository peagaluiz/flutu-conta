import React, { useState, useMemo, useEffect } from "react";
import { FlatList, Keyboard, Platform, Animated, Dimensions, Easing } from "react-native";
import { ChevronRight, Circle, CircleCheckBig, CirclePlus, LucideIcon } from "lucide-react-native";
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
import { ChevronDown, Search } from "lucide-react-native";
import { useSelectorOverlay } from "@/state/SelectorOverlayContext";

type Option = string | {
    id: string | number;
    label: string;
    rawLabel?: string;
}

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
    themeColors?: {
        textPrimary?: string;
        textSecondary?: string;
    };
    isDarkMode?: boolean;
    autoFocusSearch?: boolean;
    fixedHeight?: boolean;
    allowCreateOption?: boolean;
    getCreateLabel?: (search: string) => string;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAX_HEIGHT = SCREEN_HEIGHT * 0.55;
const LIST_HEIGHT = MAX_HEIGHT - 80;

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
    const [searchTerm, setSearchTerm] = useState("");
    const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
    const animatedMargin = useState(new Animated.Value(0))[0];
    const { open: overlayOpen, close: overlayClose } = useSelectorOverlay();

    const textPrimary = themeColors?.textPrimary;
    const textSecondary = themeColors?.textSecondary;

    const normalizedOptions = useMemo(() => {
        return options.map((item) => {
            if (typeof item === "string") {
                return { id: item, label: item };
            }
            return item;
        });
    }, [options]);

    const filteredOptions = useMemo(() => {
        const trimmed = searchTerm.trim();
        let list = normalizedOptions.filter(item =>
            item.label.toLowerCase().includes(trimmed.toLowerCase())
        );
        if (allowCreateOption && trimmed.length > 0) {
            const exists = normalizedOptions.some(item =>
                item.label.toLowerCase() === trimmed.toLowerCase()
            );
            if (!exists) {
                list.unshift({
                    id: trimmed,
                    label: getCreateLabel ? getCreateLabel(trimmed) : `Criar "${trimmed}"`,
                });
            }
        }
        return list;
    }, [normalizedOptions, searchTerm, allowCreateOption]);

    const selected = useMemo(() => {
        const all = [...normalizedOptions, ...filteredOptions];
        const found = all.find(o => String(o.id) === String(value));
        if (found) return found;
        if (value) return { id: value, label: String(value), rawLabel: String(value) };
        return undefined;
    }, [normalizedOptions, filteredOptions, value]);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const onShow = Keyboard.addListener(showEvent, (e) => {
            const duration = Platform.OS === 'ios' ? (e.duration ?? 250) : 120;
            Animated.timing(animatedMargin, {
                toValue: e.endCoordinates.height / 2,
                duration,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            }).start();
        });

        const onHide = Keyboard.addListener(hideEvent, () => {
            if (Platform.OS === 'ios') {
                Animated.timing(animatedMargin, {
                    toValue: 0,
                    duration: 250,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: false,
                }).start();
            } else {
                animatedMargin.setValue(0);
            }
        });

        return () => {
            onShow.remove();
            onHide.remove();
        };
    }, []);

    useEffect(() => {
        if (!showSheet) {
            setShouldAutoFocus(false);
            animatedMargin.setValue(0);
        }
    }, [showSheet]);

    const handleClose = () => {
        Keyboard.dismiss();
        overlayClose();
        animatedMargin.setValue(0);
        setShowSheet(false);
        setSearchTerm("");
        setShouldAutoFocus(false);
    };

    const handleSelect = (item: string | number) => {
        onChange(item);
        handleClose();
    };

    const handleOpen = () => {
        overlayOpen();
        setShowSheet(true);
        if (autoFocusSearch) setShouldAutoFocus(true);
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

            <Actionsheet isOpen={showSheet} onClose={handleClose}>
                <ActionsheetBackdrop onPress={handleClose} />
                <ActionsheetContent style={actionSheetContentStyle}>
                    <ActionsheetDragIndicatorWrapper>
                        <ActionsheetDragIndicator />
                    </ActionsheetDragIndicatorWrapper>

                    <Animated.View style={{ width: '100%', marginBottom: animatedMargin }}>
                        <Box className="w-full px-2 pb-4" style={{ maxHeight: MAX_HEIGHT }}>
                            <MaskedFormInput
                                label=""
                                placeholder={searchPlaceholder}
                                icon={Search}
                                value={searchTerm}
                                onChange={setSearchTerm}
                                onBlur={() => { }}
                                className="w-full my-2"
                                inputContainerStyle={inputContainerStyle}
                                isRequired={false}
                                autoFocus={shouldAutoFocus}
                            />

                            <Box style={{ height: LIST_HEIGHT }}>
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
                                        const isSelected = item.id === value;
                                        const isCreateOption = allowCreateOption && getCreateLabel && item.label === getCreateLabel(searchTerm.trim());
                                        return (
                                            <ActionsheetItem onPress={() => handleSelect(item.id)}>
                                                <HStack className="flex-row items-center justify-between w-full">
                                                    <HStack className="items-center gap-2">
                                                        {isSelected
                                                            ? <CircleCheckBig size={18} color={textPrimary} />
                                                            : isCreateOption
                                                                ? <CirclePlus size={18} color={textSecondary} />
                                                                : <Circle size={18} color={textSecondary} />
                                                        }
                                                        <ActionsheetItemText>{item.label}</ActionsheetItemText>
                                                    </HStack>
                                                    <ChevronRight color={textPrimary} />
                                                </HStack>
                                            </ActionsheetItem>
                                        );
                                    }}
                                    ListEmptyComponent={
                                        <Box className="p-4 items-center">
                                            <Text style={{ color: textSecondary }}>Nenhum resultado encontrado</Text>
                                        </Box>
                                    }
                                />
                            </Box>
                        </Box>
                    </Animated.View>
                </ActionsheetContent>
            </Actionsheet>
        </FormControl>
    );
}
