import React, { useState, useMemo, useRef, useEffect } from "react";
import {
    ChevronDown,
    Search,
    Circle,
    CircleCheckBig,
    CirclePlus,
} from "lucide-react-native";

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
import { MaskedFormInput } from "@/components/ui/input/MaskedFormInput";

// Versão web do seletor: em vez de action sheet, abre um dropdown logo abaixo do
// gatilho com campo de busca embutido. Mesma assinatura de props do nativo.
export function SearchableSelectDropdown(props) {
    const {
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
        themeColors,
        isDarkMode,
        autoFocusSearch = true,
        allowCreateOption = false,
        getCreateLabel,
    } = props;
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef(null);

    const textPrimary = themeColors?.textPrimary;
    const textSecondary = themeColors?.textSecondary;
    const surface = themeColors?.surface ?? (isDarkMode ? "#1C1C1E" : "#FFFFFF");
    const border = themeColors?.border ?? (isDarkMode ? "rgba(255,255,255,0.12)" : "#E2E8F0");

    const normalizedOptions = useMemo(
        () =>
            options.map((item) =>
                typeof item === "string" ? { id: item, label: item } : item
            ),
        [options]
    );

    const selected = useMemo(() => {
        const found = normalizedOptions.find((o) => String(o.id) === String(value));
        if (found) return found;
        if (value) return { id: value, label: String(value), rawLabel: String(value) };
        return undefined;
    }, [normalizedOptions, value]);

    const filteredOptions = useMemo(() => {
        const trimmed = searchTerm.trim();
        let list = normalizedOptions.filter((item) =>
            item.label.toLowerCase().includes(trimmed.toLowerCase())
        );
        if (allowCreateOption && trimmed.length > 0) {
            const exists = normalizedOptions.some(
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
    }, [normalizedOptions, searchTerm, allowCreateOption, getCreateLabel]);

    useEffect(() => {
        if (!open) {
            setSearchTerm("");
            return;
        }
        const onDown = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        const onKey = (e) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const handleSelect = (id) => {
        onChange(id);
        setOpen(false);
        setSearchTerm("");
    };

    return (
        <Box
            ref={containerRef}
            className="my-1"
            style={{ position: "relative", zIndex: open ? 50 : undefined }}
        >
            <FormControl size="md" isRequired={isRequired} isInvalid={!!error}>
                <FormControlLabel>
                    <FormControlLabelText>{label}</FormControlLabelText>
                </FormControlLabel>

                <Pressable onPress={() => setOpen((o) => !o)}>
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
            </FormControl>

            {open && (
                <Box
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: 4,
                        backgroundColor: surface,
                        borderColor: border,
                        borderWidth: 1,
                        borderRadius: 8,
                        zIndex: 50,
                        overflow: "hidden",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                    }}
                >
                    <Box style={{ padding: 8 }}>
                        <MaskedFormInput
                            label=""
                            placeholder={searchPlaceholder}
                            icon={Search}
                            value={searchTerm}
                            onChange={setSearchTerm}
                            onBlur={() => {}}
                            className="w-full"
                            inputContainerStyle={inputContainerStyle}
                            isRequired={false}
                            autoFocus={autoFocusSearch}
                        />
                    </Box>

                    <Box
                        style={{
                            height: 1,
                            backgroundColor: textSecondary,
                            opacity: 0.25,
                        }}
                    />

                    <Box style={{ maxHeight: 260, overflowY: "auto" }}>
                        {filteredOptions.length === 0 ? (
                            <Box style={{ padding: 16, alignItems: "center" }}>
                                <Text style={{ color: textSecondary }}>
                                    Nenhum resultado encontrado
                                </Text>
                            </Box>
                        ) : (
                            filteredOptions.map((item) => {
                                const isSelected = String(item.id) === String(value);
                                const isCreateOption =
                                    allowCreateOption &&
                                    getCreateLabel &&
                                    item.label === getCreateLabel(searchTerm.trim());
                                const isCatalogOnly = item.variant === "catalog";
                                const dimColor = isCatalogOnly ? textSecondary : undefined;
                                return (
                                    <Pressable
                                        key={String(item.id)}
                                        onPress={() => handleSelect(item.id)}
                                    >
                                        <HStack className="items-center gap-2 px-3 py-2">
                                            {isSelected ? (
                                                <CircleCheckBig size={18} color={textPrimary} />
                                            ) : isCreateOption || isCatalogOnly ? (
                                                <CirclePlus size={18} color={textSecondary} />
                                            ) : (
                                                <Circle size={18} color={textSecondary} />
                                            )}
                                            <Text
                                                style={
                                                    dimColor
                                                        ? { color: dimColor, opacity: 0.65 }
                                                        : { color: textPrimary }
                                                }
                                            >
                                                {item.label}
                                            </Text>
                                        </HStack>
                                    </Pressable>
                                );
                            })
                        )}
                    </Box>
                </Box>
            )}
        </Box>
    );
}
