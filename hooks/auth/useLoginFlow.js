import { useState, useRef, useMemo, useEffect } from "react";
import { useAuth } from "@/state/AuthContext";
import { useErrorToast } from "@/components/ui/toast/useErrorToast";
import {
	getDeviceLoginCredentials,
	hasDeviceLoginCredentials,
	isDeviceSecurityAvailable,
} from "@/services/auth/deviceCredentials";

export function useLoginFlow() {
	const { logIn, logInWithSavedCredentials } = useAuth();
	const { showNewToast } = useErrorToast();

	const [mode, setMode] = useState("loading");
	const [hasSavedLogin, setHasSavedLogin] = useState(false);
	const [hasDeviceSecurity, setHasDeviceSecurity] = useState(false);
	const [savedCredentials, setSavedCredentials] = useState(null);
	const [smartStatus, setSmartStatus] = useState("authenticating");
	const [smartError, setSmartError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [rememberLogin, setRememberLogin] = useState(false);
	const hasStartedAutoAuth = useRef(false);

	const savedDisplayName = useMemo(() => {
		const email = savedCredentials?.email || "";
		if (!email) return "Conta salva";
		const raw = email.split("@")[0] || "conta";
		return raw
			.replace(/[._-]+/g, " ")
			.replace(/\b\w/g, (c) => c.toUpperCase());
	}, [savedCredentials]);

	const avatarInitial = useMemo(
		() => (savedDisplayName?.trim() || "C").charAt(0).toUpperCase(),
		[savedDisplayName]
	);

	useEffect(() => {
		const load = async () => {
			try {
				const exists = await hasDeviceLoginCredentials();
				const canUseDeviceSecurity = await isDeviceSecurityAvailable();
				const saved = await getDeviceLoginCredentials();

				setHasSavedLogin(exists);
				setHasDeviceSecurity(Boolean(canUseDeviceSecurity));
				setSavedCredentials(saved);

				if (exists) {
					setRememberLogin(true);
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
			}
		};

		load();
	}, []);

	useEffect(() => {
		if (mode !== "smart" || smartStatus !== "authenticating") return;
		if (!hasSavedLogin || !hasDeviceSecurity) return;
		if (hasStartedAutoAuth.current) return;

		hasStartedAutoAuth.current = true;

		logInWithSavedCredentials()
			.then(() => showNewToast("success", "Login automatico concluido."))
			.catch((error) => {
				setSmartStatus("failed");
				setSmartError(error?.message || "Falha na autenticacao biometrica.");
			});
	}, [
		hasDeviceSecurity,
		hasSavedLogin,
		logInWithSavedCredentials,
		mode,
		showNewToast,
		smartStatus,
	]);

	const submitLogin = async (data) => {
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

	return {
		mode,
		setMode,
		savedCredentials,
		smartStatus,
		smartError,
		isSubmitting,
		rememberLogin,
		setRememberLogin,
		savedDisplayName,
		avatarInitial,
		submitLogin,
	};
}
