import { Controller } from "react-hook-form";
import { Switch } from "react-native";
import { MaskedFormInput } from "@/components/ui/input/MaskedFormInput";
import { VStack } from "@/components/ui/vstack";
import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Button, ButtonText } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

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
	return (
		<Box className="rounded-2xl px-6 pt-3 pb-8" style={{ backgroundColor: colors.surface }}>
			<VStack className="gap-3">
				<VStack>
					<Heading size="lg" fontWeight="600" style={{ color: colors.textPrimary }}>
						Bem-vindo
					</Heading>
					<Heading fontWeight="medium" size="xs" style={{ color: colors.textSecondary }}>
						Faca login para continuar
					</Heading>
				</VStack>

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
							className="w-full"
							classNameInputTag="px-3 rounded-xl"
							isRequired
						/>
					)}
				/>

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
							className="w-full"
							classNameInputTag="px-3 rounded-xl"
							isPassword
							isRequired
						/>
					)}
				/>

				<Box className="mt-1 mb-2 rounded-xl px-3 py-3" style={{ backgroundColor: colors.surfaceMuted }}>
					<Box className="flex-row items-center justify-between">
						<Box className="flex-1 pr-3">
							<Text className="font-semibold" style={{ color: colors.textPrimary }}>
								Salvar informacoes de login
							</Text>
							<Text size="sm" style={{ color: colors.textSecondary }}>
								Ative para entrar usando biometria ou senha do celular.
							</Text>
						</Box>
						<Switch
							value={rememberLogin}
							onValueChange={onRememberLoginChange}
							trackColor={{ false: colors.borderStrong, true: colors.success }}
							thumbColor={colors.surface}
						/>
					</Box>
				</Box>

				<Button
					action="primary"
					size="lg"
					className="rounded-xl"
					style={{ backgroundColor: colors.brand }}
					onPress={onSubmit}
					isDisabled={isSubmitting}
				>
					<ButtonText style={{ color: "#F8FAFC" }}>{isSubmitting ? "Entrando..." : "Entrar"}</ButtonText>
				</Button>

				<Button variant="link" className="self-end" onPress={onForgotPassword}>
					<ButtonText style={{ color: colors.brand }}>Esqueci minha senha</ButtonText>
				</Button>
			</VStack>
		</Box>
	);
}
