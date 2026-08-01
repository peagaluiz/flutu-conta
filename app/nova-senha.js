import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Platform } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import * as Linking from "expo-linking";

import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { MaskedFormInput } from "@/components/ui/input/MaskedFormInput";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useErrorToast } from "@/components/ui/toast/useErrorToast";
import { useAuth } from "@/state/AuthContext";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { hasActiveWebSession, isLikelyNetworkError } from "@/services/auth/passwordRecovery";
import { isAbortError, withAbort } from "@/utils/abortable";
import { supabase } from "@/services/supabase/client";

const schema = yup.object({
	senha: yup
		.string()
		.required("O campo Nova senha e obrigatorio")
		.min(8, "A senha deve ter no minimo 8 caracteres"),
	confirmarSenha: yup
		.string()
		.required("Confirme a nova senha")
		.oneOf([yup.ref("senha")], "As senhas nao conferem"),
});

export default function NovaSenhaScreen() {
	const router = useRouter();
	const { showNewToast } = useErrorToast();
	const { establishRecoverySessionFromUrl, updatePassword, logOut } = useAuth();
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const isDarkMode = theme === "dark";

	const [isPreparing, setIsPreparing] = useState(true);
	const [isLinkValid, setIsLinkValid] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const mountedRef = useRef(true);
	const prepareAbortRef = useRef(null);
	const saveAbortRef = useRef(null);

	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm({
		resolver: yupResolver(schema),
		defaultValues: { senha: "", confirmarSenha: "" },
	});

	const activateRecoverySession = useCallback(
		async (url, signal) => {
			try {
				await withAbort(establishRecoverySessionFromUrl(url), signal);
				if (!mountedRef.current) return;
				setIsLinkValid(true);
			} catch (error) {
				if (!mountedRef.current || isAbortError(error)) return;
				setIsLinkValid(false);
				showNewToast(
					"error",
					"Link de recuperacao invalido ou expirado."
				);
			}
		},
		[establishRecoverySessionFromUrl, showNewToast]
	);

	useEffect(() => {
		mountedRef.current = true;

		let subscription;

		async function prepareRecovery() {
			prepareAbortRef.current?.abort?.();
			prepareAbortRef.current = new AbortController();

			try {
				if (Platform.OS === "web") {
					// PKCE: /api/auth/callback ja trocou o code e setou o
					// cookie httpOnly ANTES do usuario cair aqui - nao ha
					// token nenhum pra parsear da URL, so confirmar a sessao.
					const hasSession = await withAbort(
						hasActiveWebSession(),
						prepareAbortRef.current.signal
					);
					setIsLinkValid(hasSession);
				} else {
					const initialUrl = await withAbort(
						Linking.getInitialURL(),
						prepareAbortRef.current.signal
					);

					if (initialUrl) {
						await activateRecoverySession(
							initialUrl,
							prepareAbortRef.current.signal
						);
					} else {
						const { data } = await withAbort(
							supabase.auth.getSession(),
							prepareAbortRef.current.signal
						);
						setIsLinkValid(Boolean(data.session));
					}
				}
			} catch (error) {
				if (!isAbortError(error) && mountedRef.current) {
					setIsLinkValid(false);
				}
			} finally {
				prepareAbortRef.current = null;
				if (mountedRef.current) {
					setIsPreparing(false);
				}
			}
		}

		prepareRecovery();

		if (Platform.OS !== "web") {
			subscription = Linking.addEventListener("url", async ({ url }) => {
				if (!url) return;
				prepareAbortRef.current?.abort?.();
				prepareAbortRef.current = new AbortController();
				await activateRecoverySession(url, prepareAbortRef.current.signal);
				prepareAbortRef.current = null;
				if (mountedRef.current) {
					setIsPreparing(false);
				}
			});
		}

		return () => {
			mountedRef.current = false;
			prepareAbortRef.current?.abort?.();
			saveAbortRef.current?.abort?.();
			subscription?.remove?.();
		};
	}, [activateRecoverySession]);

	const saveLabel = useMemo(
		() => (isSaving ? "Salvando..." : "Salvar nova senha"),
		[isSaving]
	);

	const onSubmit = async ({ senha }) => {
		if (!isLinkValid || isSaving) return;

		setIsSaving(true);
		saveAbortRef.current?.abort?.();
		saveAbortRef.current = new AbortController();

		try {
			await withAbort(updatePassword(senha), saveAbortRef.current.signal);
			await withAbort(logOut(), saveAbortRef.current.signal);

			if (!mountedRef.current) return;

			showNewToast(
				"success",
				"Senha atualizada com sucesso. Faca login novamente.",
				"Sucesso"
			);
		} catch (error) {
			if (!mountedRef.current || isAbortError(error)) return;

			const networkError =
				"Sem conexao com a internet. Verifique sua rede e tente novamente.";
			const genericError =
				"Nao foi possivel atualizar a senha agora. Tente novamente.";
			showNewToast(
				"error",
				isLikelyNetworkError(error) ? networkError : genericError
			);
		} finally {
			saveAbortRef.current = null;
			if (mountedRef.current) {
				setIsSaving(false);
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
					className="px-6 pt-8 pb-8"
					style={{
						borderTopLeftRadius: 28,
						borderTopRightRadius: 28,
						minHeight: "56%",
						backgroundColor: colors.surface,
					}}
				>
					<VStack space={5} className="mx-2">
						<VStack space={2}>
							<Heading
								size="lg"
								fontWeight="600"
								style={{ color: colors.textPrimary }}
							>
								Definir nova senha
							</Heading>
							<Text
								size="sm"
								style={{ color: colors.textSecondary }}
							>
								{isPreparing
									? "Validando link de recuperacao..."
									: "Escolha uma nova senha para concluir o acesso."}
							</Text>
						</VStack>

						{isPreparing ? null : !isLinkValid ? (
							<VStack space={4}>
								<Text
									size="sm"
									style={{ color: colors.dangerText }}
								>
									O link nao esta mais valido. Solicite um
									novo e-mail de recuperacao.
								</Text>
								<Button
									action="primary"
									size="lg"
									className="rounded-xl"
									style={{ backgroundColor: colors.brand }}
									onPress={() =>
										router.replace("/recuperar-senha")
									}
								>
									<ButtonText style={{ color: "#F8FAFC" }}>
										Solicitar novo link
									</ButtonText>
								</Button>
							</VStack>
						) : (
							<>
								<Controller
									control={control}
									name="senha"
									render={({
										field: { onChange, onBlur, value },
									}) => (
										<MaskedFormInput
											label="Nova senha"
											value={value}
											onChange={onChange}
											onBlur={onBlur}
											error={errors.senha}
											placeholder="Digite sua nova senha"
											className="w-full"
											classNameInputTag="px-3 rounded-xl"
											isPassword
											isRequired
										/>
									)}
								/>

								<Controller
									control={control}
									name="confirmarSenha"
									render={({
										field: { onChange, onBlur, value },
									}) => (
										<MaskedFormInput
											label="Confirmar nova senha"
											value={value}
											onChange={onChange}
											onBlur={onBlur}
											error={errors.confirmarSenha}
											placeholder="Repita a nova senha"
											className="w-full"
											classNameInputTag="px-3 rounded-xl"
											isPassword
											isRequired
										/>
									)}
								/>

								<Button
									action="primary"
									size="lg"
									className="rounded-xl"
									style={{ backgroundColor: colors.brand }}
									onPress={handleSubmit(onSubmit)}
									isDisabled={isSaving}
								>
									<ButtonText style={{ color: "#F8FAFC" }}>
										{saveLabel}
									</ButtonText>
								</Button>
							</>
						)}

						<Button
							variant="outline"
							action="secondary"
							size="lg"
							className="rounded-xl"
							style={{ borderColor: colors.border }}
							onPress={() => router.replace("/login")}
							isDisabled={isSaving}
						>
							<ButtonText style={{ color: colors.textPrimary }}>
								Voltar para login
							</ButtonText>
						</Button>
					</VStack>
				</Box>
			</Box>
		</KeyboardAwareScrollView>
	);
}
