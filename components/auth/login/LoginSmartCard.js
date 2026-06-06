import { useEffect } from "react";
import { View, Text as RNText, TouchableOpacity } from "react-native";
import Animated, {
    FadeInDown,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    withDelay,
    Easing,
} from "react-native-reanimated";
import { Fingerprint } from "lucide-react-native";

function item(i) {
    return FadeInDown.delay(420 + i * 80)
        .duration(450)
        .springify()
        .damping(18);
}

function BiometricRing({ colors }) {
    const s = useSharedValue(0);

    useEffect(() => {
        s.value = withRepeat(
            withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
            -1,
            false
        );
    }, []);

    const ringStyle = useAnimatedStyle(() => ({
        transform: [{ scale: 0.85 + s.value * 0.5 }],
        opacity: 0.55 * (1 - s.value),
    }));

    return (
        <View style={{ width: 76, height: 76, alignItems: "center", justifyContent: "center" }}>
            <Animated.View
                style={[
                    {
                        position: "absolute",
                        width: 76,
                        height: 76,
                        borderRadius: 999,
                        borderWidth: 2,
                        borderColor: colors.brand,
                    },
                    ringStyle,
                ]}
            />

            <View
                style={{
                    width: 76,
                    height: 76,
                    borderRadius: 999,
                    backgroundColor: colors.brandSoft,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Fingerprint size={38} color={colors.brand} strokeWidth={1.7} />
            </View>
        </View>
    );
}

function TypingDots({ colors }) {
    const d0 = useSharedValue(0);
    const d1 = useSharedValue(0);
    const d2 = useSharedValue(0);

    useEffect(() => {
        const anim = (sv, delay) => {
            sv.value = withDelay(
                delay,
                withRepeat(
                    withSequence(
                        withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) }),
                        withTiming(0, { duration: 350, easing: Easing.in(Easing.ease) }),
                        withTiming(0, { duration: 240 })
                    ),
                    -1
                )
            );
        };
        anim(d0, 0);
        anim(d1, 180);
        anim(d2, 360);
    }, []);

    const dot0Style = useAnimatedStyle(() => ({
        opacity: 0.3 + d0.value * 0.7,
        transform: [{ translateY: -d0.value * 3 }],
    }));
    const dot1Style = useAnimatedStyle(() => ({
        opacity: 0.3 + d1.value * 0.7,
        transform: [{ translateY: -d1.value * 3 }],
    }));
    const dot2Style = useAnimatedStyle(() => ({
        opacity: 0.3 + d2.value * 0.7,
        transform: [{ translateY: -d2.value * 3 }],
    }));

    const dotBase = {
        width: 6,
        height: 6,
        borderRadius: 999,
        backgroundColor: colors.textSecondary,
    };

    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 16,
                backgroundColor: colors.surfaceMuted,
                width: "100%",
            }}
        >
            <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
                <Animated.View style={[dotBase, dot0Style]} />
                <Animated.View style={[dotBase, dot1Style]} />
                <Animated.View style={[dotBase, dot2Style]} />
            </View>
            <RNText style={{ fontSize: 14.5, fontWeight: "600", color: colors.textPrimary }}>
                Validando biometria…
            </RNText>
        </View>
    );
}

export function LoginSmartCard({
    colors,
    avatarInitial,
    savedDisplayName,
    email,
    smartStatus,
    smartError,
    onUsePassword,
    onUseOtherAccount,
}) {
    const isAuthenticating = smartStatus === "authenticating";

    return (
        <View style={{ alignItems: "center", gap: 18, paddingBottom: 6 }}>
            <Animated.View
                entering={item(0)}
                style={{ alignItems: "center", gap: 16, width: "100%" }}
            >
                <View
                    style={{
                        width: 84,
                        height: 84,
                        borderRadius: 999,
                        backgroundColor: colors.brand,
                        alignItems: "center",
                        justifyContent: "center",
                        shadowColor: colors.brand,
                        shadowOpacity: 0.4,
                        shadowRadius: 14,
                        shadowOffset: { width: 0, height: 12 },
                        elevation: 8,
                    }}
                >
                    <RNText
                        style={{
                            fontSize: 36,
                            fontWeight: "800",
                            color: "#F8FAFC",
                        }}
                    >
                        {avatarInitial}
                    </RNText>
                </View>

                <View style={{ alignItems: "center" }}>
                    <RNText
                        style={{
                            fontSize: 22,
                            fontWeight: "800",
                            letterSpacing: -0.44,
                            color: colors.textPrimary,
                        }}
                    >
                        {savedDisplayName}
                    </RNText>
                    <RNText
                        style={{
                            fontSize: 14.5,
                            fontWeight: "500",
                            color: colors.textSecondary,
                            marginTop: 2,
                        }}
                    >
                        {email}
                    </RNText>
                    <RNText
                        style={{
                            fontSize: 12.5,
                            fontWeight: "600",
                            color: colors.textSecondary,
                            opacity: 0.8,
                            marginTop: 6,
                        }}
                    >
                        Conta salva neste dispositivo
                    </RNText>
                </View>
            </Animated.View>

            {isAuthenticating ? (
                <>
                    <Animated.View entering={item(1)}>
                        <BiometricRing colors={colors} />
                    </Animated.View>

                    <Animated.View entering={item(2)} style={{ width: "100%" }}>
                        <TypingDots colors={colors} />
                    </Animated.View>

                    <Animated.View
                        entering={item(3)}
                        style={{ width: "100%", alignItems: "center", gap: 14 }}
                    >
                        <TouchableOpacity
                            activeOpacity={0.985}
                            onPress={onUsePassword}
                            style={{
                                width: "100%",
                                height: 54,
                                borderRadius: 16,
                                backgroundColor: "transparent",
                                borderWidth: 1.5,
                                borderColor: colors.border,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <RNText
                                style={{
                                    fontSize: 15.5,
                                    fontWeight: "700",
                                    color: colors.textPrimary,
                                }}
                            >
                                Entrar com senha
                            </RNText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={onUseOtherAccount}
                            style={{ paddingVertical: 2, paddingHorizontal: 6 }}
                        >
                            <RNText
                                style={{
                                    fontSize: 14.5,
                                    fontWeight: "700",
                                    color: colors.brand,
                                }}
                            >
                                Entrar com outra conta
                            </RNText>
                        </TouchableOpacity>
                    </Animated.View>
                </>
            ) : (
                <View style={{ width: "100%", gap: 12 }}>
                    <View
                        style={{
                            borderRadius: 16,
                            paddingVertical: 14,
                            paddingHorizontal: 16,
                            backgroundColor: colors.dangerBg,
                        }}
                    >
                        <RNText
                            style={{
                                textAlign: "center",
                                color: colors.dangerText,
                                fontSize: 14,
                                fontWeight: "500",
                            }}
                        >
                            {smartError || "Falha na autenticação biométrica."}
                        </RNText>
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.985}
                        onPress={onUsePassword}
                        style={{
                            width: "100%",
                            height: 54,
                            borderRadius: 16,
                            backgroundColor: "transparent",
                            borderWidth: 1.5,
                            borderColor: colors.border,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <RNText
                            style={{
                                fontSize: 15.5,
                                fontWeight: "700",
                                color: colors.textPrimary,
                            }}
                        >
                            Entrar com senha
                        </RNText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={onUseOtherAccount}
                        style={{
                            alignSelf: "center",
                            paddingVertical: 2,
                            paddingHorizontal: 6,
                        }}
                    >
                        <RNText
                            style={{
                                fontSize: 14.5,
                                fontWeight: "700",
                                color: colors.brand,
                            }}
                        >
                            Entrar com outra conta
                        </RNText>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}
