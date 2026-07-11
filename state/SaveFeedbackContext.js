import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { ActivityIndicator, View } from "react-native";
import { Text } from "@/components/ui/text";
import { shadow } from "@/utils/shadow";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { CheckCircle2, XCircle } from "lucide-react-native";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";

const SaveFeedbackContext = createContext({
    startSaving: () => { },
    showSuccess: async () => { },
    showError: () => { },
    hide: () => { },
});

const IDLE = { status: "idle", message: "" };

export function SaveFeedbackProvider({ children }) {
    const [state, setState] = useState(IDLE);
    const timerRef = useRef(null);

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const startSaving = useCallback(
        (message = "Salvando...") => {
            clearTimer();
            setState({ status: "saving", message });
        },
        [clearTimer]
    );

    const showSuccess = useCallback(
        (message = "Salvo!", { hold = 850 } = {}) => {
            clearTimer();
            setState({ status: "success", message });
            return new Promise((resolve) => {
                timerRef.current = setTimeout(() => {
                    resolve();
                    timerRef.current = setTimeout(() => setState(IDLE), 250);
                }, hold);
            });
        },
        [clearTimer]
    );

    const showError = useCallback(
        (message = "Não foi possível salvar.", { duration = 2800 } = {}) => {
            clearTimer();
            setState({ status: "error", message });
            timerRef.current = setTimeout(() => setState(IDLE), duration);
        },
        [clearTimer]
    );

    const hide = useCallback(() => {
        clearTimer();
        setState(IDLE);
    }, [clearTimer]);

    useEffect(() => clearTimer, [clearTimer]);

    return (
        <SaveFeedbackContext.Provider value={{ startSaving, showSuccess, showError, hide }}>
            {children}
            <SaveFeedbackOverlay state={state} />
        </SaveFeedbackContext.Provider>
    );
}

function SaveFeedbackOverlay({ state }) {
    const { theme } = useTheme();
    const colors = getThemeColors(theme);
    const isDark = theme === "dark";
    const visible = state.status !== "idle";

    const backdrop = useSharedValue(0);
    const cardScale = useSharedValue(0.85);
    const iconScale = useSharedValue(0);

    useEffect(() => {
        backdrop.value = withTiming(visible ? 1 : 0, { duration: 200 });
        cardScale.value = visible
            ? withSpring(1, { damping: 15, stiffness: 180, mass: 0.7 })
            : withTiming(0.85, { duration: 160 });
    }, [visible, backdrop, cardScale]);

    useEffect(() => {
        if (state.status === "success" || state.status === "error") {
            iconScale.value = 0;
            iconScale.value = withSpring(1, { damping: 9, stiffness: 220, mass: 0.6 });
        }
    }, [state.status, iconScale]);

    const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
    const cardStyle = useAnimatedStyle(() => ({
        opacity: backdrop.value,
        transform: [{ scale: cardScale.value }],
    }));
    const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));

    return (
        <Animated.View
            pointerEvents={visible ? "auto" : "none"}
            className="absolute inset-0 items-center justify-center"
            style={[
                backdropStyle,
                {
                    backgroundColor: isDark ? "rgba(0,0,0,0.55)" : "rgba(15,23,42,0.35)",
                    // Acima do overlay dos modais do gluestack (zIndex 9999 no web),
                    // via style inline pra não depender do NativeWind gerar a classe.
                    zIndex: 10000,
                    elevation: 10000,
                },
            ]}
        >
            <Animated.View
                className="rounded-xl min-w-[180px] max-w-[300px] px-7 py-6 items-center justify-center gap-3.5"
                style={[
                    cardStyle,
                    {
                        backgroundColor: colors.surface,
                        ...shadow({ color: "#000", offsetY: 8, opacity: 0.25, radius: 16, elevation: 8 }),
                    },
                ]}
            >
                <View className="h-14 items-center justify-center mb-1">
                    {state.status === "saving" ? (
                        <ActivityIndicator size="large" color={colors.brand} />
                    ) : state.status === "success" ? (
                        <Animated.View style={iconStyle}>
                            <CheckCircle2 size={56} color={colors.success} strokeWidth={2.2} />
                        </Animated.View>
                    ) : state.status === "error" ? (
                        <Animated.View style={iconStyle}>
                            <XCircle size={56} color={colors.dangerText} strokeWidth={2.2} />
                        </Animated.View>
                    ) : null}
                </View>
                {!!state.message && (
                    <Text className="text-base font-semibold text-center mt-2" style={{ color: colors.textPrimary }}>
                        {state.message}
                    </Text>
                )}
            </Animated.View>
        </Animated.View>
    );
}


export function useSaveFeedback() {
    return useContext(SaveFeedbackContext);
}
