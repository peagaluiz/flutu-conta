import React, { useState, useMemo, useEffect } from "react";
import { FlatList, Keyboard, Dimensions, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
    useSharedValue,
    withTiming,
    Easing,
    useAnimatedStyle,
} from "react-native-reanimated";

import { ChevronRight, Circle, CircleCheckBig, CirclePlus, Search } from "lucide-react-native";

// Timing sem overshoot: acompanha o teclado e para exatamente onde ele parar
const TIMING = { duration: 250, easing: Easing.out(Easing.cubic) };
// Cache da última altura do teclado. Persiste entre renders pra animar
// imediatamente no onFocus, sem esperar keyboardDidShow.
let cachedKeyboardHeight = 0;
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
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

export type NormalizedOption = {
    id: string | number;
    label: string;
    rawLabel?: string;
    variant?: "catalog";
};

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
        // Na web não há teclado: não deslocar o sheet, senão ele "flutua" acima
        // da borda (keyboardDidHide nunca dispara pra zerar o offset).
        if (Platform.OS === "web") return;
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
                    {Platform.OS === "web" ? (
                        // Na web o wrapper de arraste deixaria o sheet ser movido com o mouse;
                        // usamos um wrapper sem PanResponder pra manter fixo na base.
                        <Box className="w-full py-1 items-center">
                            <ActionsheetDragIndicator />
                        </Box>
                    ) : (
                        <ActionsheetDragIndicatorWrapper>
                            <ActionsheetDragIndicator />
                        </ActionsheetDragIndicatorWrapper>
                    )}

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
