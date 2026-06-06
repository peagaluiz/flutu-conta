import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { MaskedFormInput } from "@/components/ui/input/MaskedFormInput";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useErrorToast } from "@/components/ui/toast/useErrorToast";
import { useAuth } from "@/state/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import {
	isLikelyNetworkError,
	PASSWORD_RESET_SUCCESS_MESSAGE,
} from "@/services/auth/passwordRecovery";
import { isAbortError, withAbort } from "@/utils/abortable";

const COOLDOWN_SECONDS = 60;

const schema = yup.object({
	email: yup
		.string()
		.trim()
		.email("Informe um e-mail valido")
		.required("O campo E-mail e obrigatorio"),
});

export default function RecuperarSenhaScreen() {
	const router = useRouter();
	const { showNewToast } = useErrorToast();
	const { requestPasswordReset } = useAuth();
	const insets = useSafeAreaInsets();
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const isDarkMode = theme === "dark";

	const [isSending, setIsSending] = useState(false);
	const [cooldownLeft, setCooldownLeft] = useState(0);
	const mountedRef = useRef(true);
	const requestAbortRef = useRef(null);

	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm({
		resolver: yupResolver(schema),
		defaultValues: { email: "" },
	});

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
			requestAbortRef.current?.abort?.();
		};
	}, []);

	useEffect(() => {
		if (cooldownLeft <= 0) return;

		const intervalId = setInterval(() => {
			setCooldownLeft((prev) => (prev > 0 ? prev - 1 : 0));
		}, 1000);

		return () => clearInterval(intervalId);
	}, [cooldownLeft]);

	const sendButtonLabel = useMemo(() => {
		if (isSending) return "Enviando...";
		if (cooldownLeft > 0) return `Reenviar em ${cooldownLeft}s`;
		return "Enviar link";
	}, [cooldownLeft, isSending]);

	const onSubmit = async ({ email }) => {
		if (isSending || cooldownLeft > 0) return;

		setIsSending(true);
		requestAbortRef.current?.abort?.();
		requestAbortRef.current = new AbortController();

		try {
			await withAbort(
				requestPasswordReset(email),
				requestAbortRef.current.signal
			);

			if (!mountedRef.current) return;

			showNewToast(
				"success",
				PASSWORD_RESET_SUCCESS_MESSAGE,
				"Verifique seu e-mail"
			);
			setCooldownLeft(COOLDOWN_SECONDS);
		} catch (error) {
			if (!mountedRef.current || isAbortError(error)) return;

			const genericError =
				"Nao foi possivel iniciar a recuperacao agora. Tente novamente.";
			const networkError =
				"Sem conexao com a internet. Verifique sua rede e tente novamente.";
			showNewToast(
				"error",
				isLikelyNetworkError(error) ? networkError : genericError
			);
		} finally {
			requestAbortRef.current = null;
			if (mountedRef.current) {
				setIsSending(false);
			}
		}
	};

	return (
		<KeyboardAwareScrollView
			className="flex-1"
			contentContainerStyle={{ flexGrow: 1 }}
			extraScrollHeight={30}
			enableOnAndroid
		>
			<Box
				className="flex-1 justify-end"
				style={{ backgroundColor: colors.screen }}
			>
				<Box
					className="px-8 pt-8"
					style={{
						minHeight: "58%",
						width: "100%",
						borderTopLeftRadius: 28,
						borderTopRightRadius: 28,
						paddingBottom: insets.bottom + 24,
						backgroundColor: colors.surface,
					}}
				>
					<VStack space={4}>
						<VStack className="mx-6 mt-6" space={2}>
							<Heading
								size="lg"
								fontWeight="600"
								style={{ color: colors.textPrimary }}
							>
								Recuperar senha
							</Heading>
							<Text
								size="sm"
								style={{ color: colors.textSecondary }}
							>
								Informe seu e-mail para receber o link de
								redefinicao.
							</Text>
						</VStack>

						<VStack className="mx-6" space={3}>
							<Controller
								control={control}
								name="email"
								render={({
									field: { onChange, onBlur, value },
								}) => (
									<MaskedFormInput
										value={value}
										onChange={onChange}
										onBlur={onBlur}
										error={errors.email}
										placeholder="seu@email.com"
										className="w-full mb-3"
										classNameInputTag="px-3 rounded-xl"
										keyboardType="email-address"
										isRequired
									/>
								)}
							/>

							<Button
								action="primary"
								size="lg"
								className="rounded-xl mb-2 mt-4"
								style={{ backgroundColor: colors.brand }}
								onPress={handleSubmit(onSubmit)}
								isDisabled={isSending || cooldownLeft > 0}
							>
								<ButtonText style={{ color: "#F8FAFC" }}>
									{sendButtonLabel}
								</ButtonText>
							</Button>

							<Button
								variant="outline"
								action="secondary"
								size="lg"
								className="rounded-xl"
								style={{ borderColor: colors.border }}
								onPress={() => router.back()}
								isDisabled={isSending}
							>
								<ButtonText
									style={{ color: colors.textPrimary }}
								>
									Voltar
								</ButtonText>
							</Button>
						</VStack>
					</VStack>
				</Box>
			</Box>
		</KeyboardAwareScrollView>
	);
}
