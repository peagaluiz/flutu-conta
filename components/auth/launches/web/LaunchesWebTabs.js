import { useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import {
    ChevronDown,
    FileUp,
    Landmark,
    Package,
    Plus,
    RotateCw,
    Search,
    SlidersHorizontal,
    Users,
    Wallet,
} from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";

const TABS = [
    { key: "transacoes", label: "Transações", icon: Wallet },
    { key: "pessoas", label: "Pessoas", icon: Users },
    { key: "bancos", label: "Bancos", icon: Landmark },
    { key: "imobilizados", label: "Imobilizados", icon: Package },
];

const CREATE_LABELS = {
    transacoes: "Novo lançamento",
    pessoas: "Nova pessoa",
    bancos: "Novo banco",
    imobilizados: "Novo ativo",
};

// Dropdown de seção no mesmo estilo do seletor de categoria do inserir/editar web.
function SectionDropdown({ section, onSectionChange, colors }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    const current = TABS.find((t) => t.key === section) ?? TABS[0];
    const CurrentIcon = current.icon;

    useEffect(() => {
        if (!open) return;
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

    return (
        <View
            ref={containerRef}
            style={{ position: "relative", zIndex: open ? 1000 : undefined }}
        >
            <Pressable
                onPress={() => setOpen((o) => !o)}
                style={({ hovered }) => ({
                    height: 38,
                    minWidth: 180,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: hovered ? colors.surfaceMuted : colors.surface,
                })}
            >
                <CurrentIcon size={16} color={colors.textSecondary} />
                <Text
                    className="text-sm font-medium"
                    style={{ color: colors.textPrimary, flex: 1 }}
                >
                    {current.label}
                </Text>
                <ChevronDown size={16} color={colors.textSecondary} />
            </Pressable>

            {open ? (
                <View
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: 4,
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 10,
                        overflow: "hidden",
                        zIndex: 1000,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                    }}
                >
                    {TABS.map((tab) => {
                        const TabIcon = tab.icon;
                        const active = tab.key === section;
                        return (
                            <Pressable
                                key={tab.key}
                                onPress={() => {
                                    onSectionChange(tab.key);
                                    setOpen(false);
                                }}
                                style={({ hovered }) => ({
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 8,
                                    paddingHorizontal: 12,
                                    paddingVertical: 10,
                                    backgroundColor:
                                        active || hovered ? colors.surfaceMuted : "transparent",
                                })}
                            >
                                <TabIcon
                                    size={16}
                                    color={active ? colors.textPrimary : colors.textSecondary}
                                />
                                <Text
                                    className="text-sm"
                                    style={{
                                        color: active ? colors.textPrimary : colors.textSecondary,
                                        fontWeight: active ? "600" : "400",
                                    }}
                                >
                                    {tab.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            ) : null}
        </View>
    );
}

function ToolButton({ icon: Icon, onPress, colors, active = false }) {
    return (
        <Pressable
            onPress={onPress}
            style={({ hovered }) => ({
                width: 38,
                height: 38,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: hovered ? colors.surfaceMuted : colors.surface,
                alignItems: "center",
                justifyContent: "center",
            })}
        >
            <Icon size={16} color={active ? colors.brand : colors.textSecondary} />
            {active ? (
                <View
                    style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: colors.brand,
                    }}
                />
            ) : null}
        </Pressable>
    );
}

export default function LaunchesWebTabs({
    section,
    onSectionChange,
    colors,
    searchText,
    onSearchChange,
    onFilter,
    filterActive,
    onImportOfx,
    onRefresh,
    onCreate,
}) {
    const showTools = section === "transacoes";

    return (
        <Box
            className="flex-row items-center justify-between gap-4 flex-wrap"
            style={{ position: "relative", zIndex: 10 }}
        >
            <Box className="flex-row items-center gap-3">
                <Box className="gap-1">
                    <Text className="text-2xl font-extrabold" style={{ color: colors.textPrimary }}>
                        Lançamentos
                    </Text>
                    <Text className="text-sm" style={{ color: colors.textSecondary }}>
                        Gerencie transações, pessoas, bancos e imobilizados.
                    </Text>
                </Box>
            </Box>

            <Box
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                }}
            >
                {showTools ? (
                    <>
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 8,
                                height: 38,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: colors.surface,
                                paddingHorizontal: 12,
                                width: 280,
                            }}
                        >
                            <Search size={15} color={colors.textSecondary} />
                            <TextInput
                                value={searchText}
                                onChangeText={onSearchChange}
                                placeholder="Buscar por descrição ou categoria"
                                placeholderTextColor={colors.textSecondary}
                                style={{
                                    flex: 1,
                                    fontSize: 13,
                                    color: colors.textPrimary,
                                    outlineStyle: "none",
                                }}
                            />
                        </View>
                        <ToolButton
                            icon={SlidersHorizontal}
                            onPress={onFilter}
                            colors={colors}
                            active={filterActive}
                        />
                        <ToolButton icon={FileUp} onPress={onImportOfx} colors={colors} />
                        <ToolButton icon={RotateCw} onPress={onRefresh} colors={colors} />
                    </>
                ) : null}

                <SectionDropdown
                    section={section}
                    onSectionChange={onSectionChange}
                    colors={colors}
                />

                <Button action="positive" onPress={onCreate}>
                    <Plus size={16} color="#FFFFFF" />
                    <ButtonText style={{ color: "#FFFFFF" }}>
                        {CREATE_LABELS[section] ?? "Novo lançamento"}
                    </ButtonText>
                </Button>
            </Box>
        </Box>
    );
}
