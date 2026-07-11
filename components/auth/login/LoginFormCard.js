import { Controller } from "react-hook-form";
import { Switch, View, TouchableOpacity, Text as RNText } from "react-native";
import { MaskedFormInput } from "@/components/ui/input/MaskedFormInput";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Mail, Lock, ShieldCheck, ArrowRight } from "lucide-react-native";
import { useIsDesktopWeb } from "@/hooks/useIsDesktopWeb";
import { LoginEnterItem } from "@/components/auth/login/loginEntering";
import { shadow } from "@/utils/shadow";

export function LoginFormCard({
	colors,
	control,
	errors,
	rememberLogin,
	onRememberLoginChange,
	isSubmitting,
	onSubmit,
	onForgotPassword,
}) {
	const isDesktopWeb = useIsDesktopWeb();
	const saveLoginVisible = !isDesktopWeb;
	const inputStyle = {
		height: 56,
		borderRadius: 16,
		backgroundColor: colors.surfaceAlt,
		borderWidth: 1.5,
		borderColor: colors.border,
	};

	return (
		<VStack style={{ gap: 16 }}>
			<LoginEnterItem index={0}>
				<VStack style={{ gap: 4 }}>
					<RNText
						style={{
							fontSize: 20,
							fontWeight: "800",
							letterSpacing: -0.52,
							color: colors.textPrimary,
						}}
					>
						Bem-vindo de volta
					</RNText>
					<RNText
						style={{
							fontSize: 13,
							fontWeight: "500",
							color: colors.textSecondary,
						}}
					>
						Faça login para continuar
					</RNText>
				</VStack>
			</LoginEnterItem>

			<VStack style={{ gap: 2 }}>
				<LoginEnterItem index={1}>
					<Controller
						control={control}
						name="email"
						render={({ field: { onChange, onBlur, value } }) => (
							<MaskedFormInput
								value={value}
								onChange={onChange}
								onBlur={onBlur}
								error={errors.email}
								placeholder="Email"
								icon={Mail}
								iconColor={colors.textSecondary}
								focusIconColor={colors.brand}
								focusBorderColor={colors.brand}
								inputContainerStyle={inputStyle}
								isRequired
							/>
						)}
					/>
				</LoginEnterItem>

				<LoginEnterItem index={2}>
					<Controller
						control={control}
						name="senha"
						render={({ field: { onChange, onBlur, value } }) => (
							<MaskedFormInput
								value={value}
								onChange={onChange}
								onBlur={onBlur}
								error={errors.senha}
								placeholder="Senha"
								icon={Lock}
								iconColor={colors.textSecondary}
								focusIconColor={colors.brand}
								focusBorderColor={colors.brand}
								inputContainerStyle={inputStyle}
								isPassword
								isRequired
							/>
						)}
					/>
				</LoginEnterItem>
			</VStack>

			{/* Card salvar login — oculto no PC (biometria/SecureStore só no celular) */}
			{saveLoginVisible && (
				<LoginEnterItem index={3}>
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							gap: 14,
							padding: 14,
							paddingHorizontal: 16,
							borderRadius: 16,
							backgroundColor: colors.surfaceMuted,
						}}
					>
						{/* Chip ícone */}
						<View
							style={{
								width: 38,
								height: 38,
								borderRadius: 11,
								backgroundColor: colors.brandSoft,
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
							}}
						>
							<ShieldCheck size={20} color={colors.brand} strokeWidth={1.9} />
						</View>

						<View style={{ flex: 1 }}>
							<RNText
								style={{
									fontSize: 14,
									fontWeight: "700",
									color: colors.textPrimary,
								}}
							>
								Salvar informações de login
							</RNText>
							<RNText
								style={{
									fontSize: 12.5,
									fontWeight: "500",
									color: colors.textSecondary,
									lineHeight: 17,
									marginTop: 2,
								}}
							>
								Entre com biometria ou senha do celular.
							</RNText>
						</View>

						<Switch
							value={rememberLogin}
							onValueChange={onRememberLoginChange}
							trackColor={{
								false: colors.borderStrong,
								true: colors.success,
							}}
							thumbColor="#FFFFFF"
						/>
					</View>
				</LoginEnterItem>
			)}

			{/* Botão Entrar */}
			<LoginEnterItem index={saveLoginVisible ? 4 : 3}>
				<TouchableOpacity
					activeOpacity={0.985}
					onPress={onSubmit}
					disabled={isSubmitting}
					style={{
						height: 56,
						borderRadius: 16,
						backgroundColor: isSubmitting
							? colors.brand + "99"
							: colors.brand,
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "center",
						gap: 10,
						...shadow({ color: colors.brand, offsetY: 8, opacity: 0.35, radius: 12, elevation: 6 }),
					}}
				>
					<RNText
						style={{
							fontSize: 16.5,
							fontWeight: "700",
							letterSpacing: 0.16,
							color: "#F8FAFC",
						}}
					>
						{isSubmitting ? "Entrando…" : "Entrar"}
					</RNText>
					{!isSubmitting && (
						<ArrowRight size={19} color="#F8FAFC" strokeWidth={2.2} />
					)}
				</TouchableOpacity>
			</LoginEnterItem>

			{/* Esqueci minha senha */}
			<LoginEnterItem index={saveLoginVisible ? 5 : 4} style={{ alignItems: "center" }}>
				<TouchableOpacity
					activeOpacity={0.7}
					onPress={onForgotPassword}
					style={{ paddingVertical: 2, paddingHorizontal: 6 }}
				>
					<RNText
						style={{
							fontSize: 14.5,
							fontWeight: "700",
							color: colors.brand,
						}}
					>
						Esqueci minha senha
					</RNText>
				</TouchableOpacity>
			</LoginEnterItem>
		</VStack>
	);
}
