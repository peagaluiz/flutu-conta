import React, { useEffect, useState } from "react";
import { Image, Keyboard } from "react-native";
import { Building2, ArrowLeftRight, X } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import BancoSelectSheet from "@/components/finance/insert/BancoSelectSheet";

function BankLogo({ catalogBanco, size = 44 }) {
    const local = catalogBanco?.logo_local_path || null;
    const remote = catalogBanco?.logo_url || null;
    const [localFailed, setLocalFailed] = useState(false);
    const [remoteFailed, setRemoteFailed] = useState(false);

    // Reseta o estado de erro sempre que a logo alvo muda (troca de banco).
    useEffect(() => {
        setLocalFailed(false);
        setRemoteFailed(false);
    }, [local, remote]);

    // Tenta o arquivo local; se falhar, cai para a URL remota; só então o ícone.
    const src = !localFailed && local ? local : !remoteFailed && remote ? remote : null;

    if (src) {
        return (
            <Image
                source={{ uri: src }}
                style={{ width: size, height: size, borderRadius: size / 2 }}
                onError={() => (src === local ? setLocalFailed(true) : setRemoteFailed(true))}
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
    userId = null,
    familyId = null,
}) {
    const [showSheet, setShowSheet] = useState(false);

    const hasSelection = selectedCatalogBanco !== null && selectedCatalogBanco !== undefined;
    const isCartao = selectedCatalogBanco?.side === "cartao";

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
                            borderColor: isCartao ? "#F59E0B" : (themeColors?.border ?? "#E2E8F0"),
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

            <BancoSelectSheet
                isOpen={showSheet}
                onClose={() => setShowSheet(false)}
                onSelect={(item) => {
                    setShowSheet(false);
                    onSelect(item);
                }}
                colors={themeColors}
                actionSheetContentStyle={actionSheetContentStyle}
                userId={userId}
                familyId={familyId}
            />
        </>
    );
}
