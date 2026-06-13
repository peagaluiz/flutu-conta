import React, { memo, useRef, useCallback, useEffect } from "react";
import { Pressable, View, Animated, Easing } from "react-native";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import ActionButton from "./ActionButton";
import CardBase from "./CardBase";
import { CheckCircle, CheckCircle2, Circle, Pencil, Trash2 } from "lucide-react-native";
import { formatCurrency, formatDate } from "@/utils/finance/helpers";
import { PrevistaBadge } from "@/components/finance/PrevistaBadge";

function getDescricao(item) {
    try {
        const parsed = JSON.parse(item.json || "{}");
        if (parsed?.descricao) return parsed.descricao;
    } catch { }
    return item.observacao || "";
}

function TransacaoCard({
    item,
    colors,
    onEdit,
    onDelete,
    onDarBaixa,
    selected = false,
    selectionMode = false,
    onLongPress,
    onToggleSelect,
    isHighlighted = false,
}) {
    const descricao = getDescricao(item);
    const suppressNextPress = useRef(false);
    const glowAnim = useRef(new Animated.Value(0)).current;
    const animationStartedRef = useRef(false);

    useEffect(() => {
        if (!isHighlighted) {
            animationStartedRef.current = false;
            glowAnim.stopAnimation();
            glowAnim.setValue(0);
            return;
        }
        if (animationStartedRef.current) return;
        animationStartedRef.current = true;

        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 400,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: false,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0,
                    duration: 400,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: false,
                }),
            ]),
            { iterations: 2 }
        );

        animation.start(() => {
            glowAnim.setValue(0);
            animationStartedRef.current = false;
        });

        return () => animation.stop();
    }, [isHighlighted, glowAnim]);

    const handleLongPress = useCallback(() => {
        suppressNextPress.current = true;
        onLongPress?.();
    }, [onLongPress]);

    const handlePress = useCallback(() => {
        if (suppressNextPress.current) {
            suppressNextPress.current = false;
            return;
        }
        if (selectionMode) onToggleSelect?.();
    }, [selectionMode, onToggleSelect]);

    return (
        <Pressable
            onPress={handlePress}
            onLongPress={handleLongPress}
            delayLongPress={350}
        >
            <View style={{ position: "relative" }}>
                <Animated.View
                    pointerEvents="none"
                    style={{
                        position: "absolute",
                        top: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }),
                        left: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }),
                        right: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }),
                        bottom: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }),
                        borderRadius: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 22] }),
                        backgroundColor: colors.brand,
                        opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }),
                    }}
                />
                <CardBase colors={colors} selected={selected}>
                    <VStack className="w-full gap-1">
                        <HStack className="items-start justify-between w-full gap-3">
                            {selectionMode && (
                                <View style={{ marginTop: 2 }}>
                                    {selected ? (
                                        <CheckCircle2 size={18} color={colors.brand} />
                                    ) : (
                                        <Circle size={18} color={colors.textSecondary} />
                                    )}
                                </View>
                            )}
                            <Text
                                className="font-semibold flex-1"
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                style={{ color: colors.textPrimary }}
                            >
                                {item.pessoa || descricao || "Sem pessoa"}
                            </Text>
                            <Text
                                className="font-bold text-right"
                                style={{ color: colors.textPrimary }}
                            >
                                {formatCurrency(item.valor)}
                            </Text>
                        </HStack>
                        <HStack className="items-center justify-between w-full flex-row mt-0.5">
                            <Text
                                className="text-xs flex-1 mr-4"
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                style={{ color: colors.textSecondary }}
                            >
                                {item.categoria || "Sem categoria"}
                            </Text>
                            {item.is_ghost ? (
                                <PrevistaBadge colors={colors} style={{ marginRight: 8 }} />
                            ) : null}
                            <Text
                                className="text-xs text-right"
                                style={{ color: colors.textSecondary }}
                            >
                                {formatDate(item.data_vencimento)}
                            </Text>
                        </HStack>
                        {descricao ? (
                            <Text
                                className="text-xs"
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                style={{ color: colors.textSecondary }}
                            >
                                {descricao}
                            </Text>
                        ) : null}
                    </VStack>

                    {!selectionMode && (
                        <HStack className="mt-3 gap-2 flex-wrap">
                            <ActionButton
                                label={item.status === "pendente" ? "Dar Baixa" : "Remover baixa"}
                                icon={CheckCircle}
                                onPress={onDarBaixa}
                                colors={colors}
                            />
                            <ActionButton
                                icon={Pencil}
                                onPress={onEdit}
                                colors={colors}
                                className="flex-none"
                            />
                            <ActionButton
                                icon={Trash2}
                                onPress={onDelete}
                                colors={colors}
                                className="flex-none"
                            />
                        </HStack>
                    )}
                </CardBase>
            </View>
        </Pressable>
    );
}

export default memo(TransacaoCard);
