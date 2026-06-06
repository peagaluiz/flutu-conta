import { Controller } from "react-hook-form";
import { Switch, View, TouchableOpacity, Text as RNText } from "react-native";
import { MaskedFormInput } from "@/components/ui/input/MaskedFormInput";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Mail, Lock, ShieldCheck, ArrowRight } from "lucide-react-native";

function item(i) {
	return FadeInDown.delay(420 + i * 70)
		.duration(450)
		.springify()
		.damping(18);
}

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
	const inputStyle = {
		height: 56,
		borderRadius: 16,
		backgroundColor: colors.surfaceAlt,
		borderWidth: 1.5,
		borderColor: colors.border,
	};

	return (
		<VStack style={{ gap: 16 }}>
			<Animated.View entering={item(0)}>
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
			</Animated.View>

			<VStack style={{ gap: 2 }}>
				<Animated.View entering={item(1)}>
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
				</Animated.View>

				<Animated.View entering={item(2)}>
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
				</Animated.View>
			</VStack>

			{/* Card salvar login */}
			<Animated.View entering={item(3)}>
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
			</Animated.View>

			{/* Botão Entrar */}
			<Animated.View entering={item(4)}>
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
						// iOS
						shadowColor: colors.brand,
						shadowOpacity: 0.35,
						shadowRadius: 12,
						shadowOffset: { width: 0, height: 8 },
						// Android
						elevation: 6,
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
			</Animated.View>

			{/* Esqueci minha senha */}
			<Animated.View entering={item(5)} style={{ alignItems: "center" }}>
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
			</Animated.View>
		</VStack>
	);
}
