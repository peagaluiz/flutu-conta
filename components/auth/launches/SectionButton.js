import React, { memo } from "react";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";

function SectionButton({ active, label, icon: Icon, colors, onPress, width }) {
    return (
        <Pressable onPress={onPress} style={width != null ? { width } : { flex: 1 }}>
            <Box
                className="h-23 rounded-2xl border p-3"
                style={{
                    backgroundColor: active
                        ? colors.textPrimary
                        : colors.surface,
                    borderColor: active ? colors.textPrimary : colors.border,
                }}
            >
                <VStack className="items-center gap-2">
                    <Box
                        className="rounded-full p-2"
                        style={{
                            backgroundColor: active
                                ? "rgba(255,255,255,0.12)"
                                : colors.screen,
                        }}
                    >
                        <Icon
                            size={18}
                            color={active ? colors.surface : colors.textPrimary}
                        />
                    </Box>
                    <Text
                        className={"text-xs" + (active ? " font-semibold" : "")}
                        style={{ color: active ? colors.surface : colors.textPrimary }} numberOfLines={1}>
                        {label}
                    </Text>
                </VStack>
            </Box>
        </Pressable>
    );
}

export default memo(SectionButton);
