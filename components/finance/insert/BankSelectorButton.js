import React, { useState } from "react";
import { Image, Keyboard } from "react-native";
import { Building2, ArrowLeftRight, X } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import BancoCatalogoSheet from "@/components/auth/launches/BancoCatalogoSheet";

function BankLogo({ catalogBanco, size = 44 }) {
    const [imgError, setImgError] = useState(false);
    const src = !imgError && (catalogBanco?.logo_local_path || catalogBanco?.logo_url);

    if (src) {
        return (
            <Image
                source={{ uri: src }}
                style={{ width: size, height: size, borderRadius: size / 2 }}
                onError={() => setImgError(true)}
            />
        );
    }

    const bg = catalogBanco?.cor_hex ?? null;
    return (
        <Box
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: bg ?? "transparent",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <Building2 size={20} color="#FFFFFF" />
        </Box>
    );
}

export function BankSelectorButton({
    selectedCatalogBanco,
    onSelect,
    themeColors,
    actionSheetContentStyle,
    disabled = false,
}) {
    const [showSheet, setShowSheet] = useState(false);

    const hasSelection = selectedCatalogBanco !== null && selectedCatalogBanco !== undefined;

    const handlePress = () => {
        if (disabled) return;
        if (hasSelection) {
            onSelect(null);
        } else {
            Keyboard.dismiss();
            setShowSheet(true);
        }
    };

    const badgeBg = hasSelection ? "#EF4444" : (themeColors?.surface ?? "#FFFFFF");
    const badgeBorder = hasSelection ? "#EF4444" : (themeColors?.border ?? "#E2E8F0");
    const containerBg = hasSelection
        ? (selectedCatalogBanco?.cor_hex ?? themeColors?.surfaceMuted ?? "#F1F5F9")
        : (themeColors?.surfaceMuted ?? "#F1F5F9");

    return (
        <>
            <Pressable onPress={handlePress} hitSlop={10} disabled={disabled}>
                <Box style={{ position: "relative", width: 38, height: 38, opacity: disabled ? 0.4 : 1 }}>
                    <Box
                        style={{
                            width: 35,
                            height: 35,
                            borderRadius: 22,
                            backgroundColor: hasSelection ? "transparent" : containerBg,
                            borderWidth: 2,
                            borderColor: themeColors?.border ?? "#E2E8F0",
                            overflow: "hidden",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        {hasSelection ? (
                            <BankLogo catalogBanco={selectedCatalogBanco} size={26} />
                        ) : (
                            <Building2 size={20} color={themeColors?.textSecondary ?? "#94A3B8"} />
                        )}
                    </Box>

                    <Box
                        style={{
                            position: "absolute",
                            bottom: 0,
                            right: 0,
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            backgroundColor: badgeBg,
                            borderWidth: 1,
                            borderColor: badgeBorder,
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        {hasSelection ? (
                            <X size={10} color="#FFFFFF" />
                        ) : (
                            <ArrowLeftRight size={9} color={themeColors?.textSecondary ?? "#94A3B8"} />
                        )}
                    </Box>
                </Box>
            </Pressable>

            <BancoCatalogoSheet
                isOpen={showSheet}
                onClose={() => setShowSheet(false)}
                onSelect={(item) => {
                    setShowSheet(false);
                    onSelect(item);
                }}
                colors={themeColors}
                actionSheetContentStyle={actionSheetContentStyle}
            />
        </>
    );
}
