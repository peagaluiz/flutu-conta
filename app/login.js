import { useAuth } from "@/state/AuthContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useErrorToast } from "@/components/ui/toast/useErrorToast";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { LoginAnimatedShell } from "@/components/auth/login/LoginAnimatedShell";
import { LoginLoadingCard } from "@/components/auth/login/LoginLoadingCard";
import { LoginSmartCard } from "@/components/auth/login/LoginSmartCard";
import { LoginFormCard } from "@/components/auth/login/LoginFormCard";
import {
	getDeviceLoginCredentials,
	hasDeviceLoginCredentials,
	isDeviceSecurityAvailable,
} from "@/services/auth/deviceCredentials";

import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "expo-router";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from "react-native-reanimated";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export default function Login() {
	const { showNewToast } = useErrorToast();
	const router = useRouter();
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const isDarkMode = theme === "dark";
	const { logIn, logInWithSavedCredentials } = useAuth();
	const insets = useSafeAreaInsets();

	const [rememberLogin, setRememberLogin] = useState(false);
	const [hasSavedLogin, setHasSavedLogin] = useState(false);
	const [hasDeviceSecurity, setHasDeviceSecurity] = useState(false);
	const [savedCredentials, setSavedCredentials] = useState(null);
	const [mode, setMode] = useState("loading");
	const [smartStatus, setSmartStatus] = useState("authenticating");
	const [smartError, setSmartError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const hasStartedAutoAuth = useRef(false);

	const sheetTranslateY = useSharedValue(260);
	const sheetOpacity = useSharedValue(0);

	const schema = yup.object().shape({
		email: yup.string().required("O campo Email e obrigatorio"),
		senha: yup.string().required("O campo Senha e obrigatorio"),
	});

	const {
		control,
		handleSubmit,
		setValue,
		formState: { errors },
	} = useForm({
		resolver: yupResolver(schema),
		defaultValues: { email: "", senha: "" },
	});

	const savedDisplayName = useMemo(() => {
		const email = savedCredentials?.email || "";
		if (!email) return "Conta salva";
		const raw = email.split("@")[0] || "conta";
		return raw.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
	}, [savedCredentials]);

	const avatarInitial = useMemo(() => {
		const source = savedDisplayName?.trim() || "C";
		return source.charAt(0).toUpperCase();
	}, [savedDisplayName]);

	useEffect(() => {
		const loadSavedLogin = async () => {
			try {
				const exists = await hasDeviceLoginCredentials();
				const canUseDeviceSecurity = await isDeviceSecurityAvailable();
				const saved = await getDeviceLoginCredentials();

				setHasSavedLogin(exists);
				setHasDeviceSecurity(Boolean(canUseDeviceSecurity));
				setSavedCredentials(saved);

				if (exists) setRememberLogin(true);

				if (exists && saved) {
					setMode("smart");
					if (canUseDeviceSecurity) {
						setSmartStatus("authenticating");
					} else {
						setSmartStatus("failed");
						setSmartError("Biometria indisponivel neste dispositivo.");
					}
				} else {
					setMode("form");
				}
			} catch {
				setMode("form");
				setHasSavedLogin(false);
				setHasDeviceSecurity(false);
				setSavedCredentials(null);
			}
		};

		loadSavedLogin();
	}, []);

	useEffect(() => {
		const autoAuthenticate = async () => {
			if (mode !== "smart") return;
			if (smartStatus !== "authenticating") return;
			if (!hasSavedLogin || !hasDeviceSecurity) return;
			if (hasStartedAutoAuth.current) return;

			hasStartedAutoAuth.current = true;

			try {
				await logInWithSavedCredentials();
				showNewToast("success", "Login automatico concluido.");
			} catch (error) {
				setSmartStatus("failed");
				setSmartError(error?.message || "Falha na autenticacao biometrica.");
			}
		};

		autoAuthenticate();
	}, [hasDeviceSecurity, hasSavedLogin, logInWithSavedCredentials, mode, showNewToast, smartStatus]);

	useEffect(() => {
		sheetTranslateY.value = withTiming(0, {
			duration: 560,
			easing: Easing.out(Easing.cubic),
		});
		sheetOpacity.value = withTiming(1, {
			duration: 380,
			easing: Easing.out(Easing.quad),
		});
	}, [sheetOpacity, sheetTranslateY]);

	const sheetAnimatedStyle = useAnimatedStyle(() => ({
		opacity: sheetOpacity.value,
		transform: [{ translateY: sheetTranslateY.value }],
	}));

	const handleSave = async (data) => {
		try {
			setIsSubmitting(true);
			await logIn(data, { saveLogin: rememberLogin });
			setHasSavedLogin(rememberLogin);
			showNewToast("success", "Login efetuado!");
		} catch (error) {
			showNewToast("error", error?.message || String(error));
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleUseOtherAccount = () => {
		setMode("form");
		setValue("email", "");
		setValue("senha", "");
		setRememberLogin(false);
	};

	const handleUsePassword = () => {
		setMode("form");
		if (savedCredentials?.email) {
			setValue("email", savedCredentials.email);
		}
		setValue("senha", "");
		setRememberLogin(true);
	};

	return (
		<KeyboardAwareScrollView
			className="w-full"
			style={{ backgroundColor: colors.screen }}
			contentContainerStyle={{ flexGrow: 1 }}
			extraScrollHeight={10}
			keyboardShouldPersistTaps="handled"
			enableOnAndroid
		>
			<LoginAnimatedShell
				colors={colors}
				insets={insets}
				isDarkMode={isDarkMode}
				sheetAnimatedStyle={sheetAnimatedStyle}
			>
				{mode === "loading" ? <LoginLoadingCard colors={colors} /> : null}

				{mode === "smart" ? (
					<LoginSmartCard
						colors={colors}
						avatarInitial={avatarInitial}
						savedDisplayName={savedDisplayName}
						email={savedCredentials?.email}
						smartStatus={smartStatus}
						smartError={smartError}
						onUsePassword={handleUsePassword}
						onUseOtherAccount={handleUseOtherAccount}
					/>
				) : null}

				{mode === "form" ? (
					<LoginFormCard
						colors={colors}
						control={control}
						errors={errors}
						rememberLogin={rememberLogin}
						onRememberLoginChange={setRememberLogin}
						isSubmitting={isSubmitting}
						onSubmit={handleSubmit(handleSave)}
						onForgotPassword={() => router.push("/recuperar-senha")}
					/>
				) : null}
			</LoginAnimatedShell>
		</KeyboardAwareScrollView>
	);
}
