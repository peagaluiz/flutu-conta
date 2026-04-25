import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

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
	return (
		<Box className="rounded-2xl px-6 py-8" style={{ backgroundColor: colors.surface }}>
			<VStack className="items-center gap-4">
				<Box
					className="h-20 w-20 items-center justify-center rounded-full"
					style={{ backgroundColor: colors.surfaceMuted }}
				>
					<Text className="text-3xl font-bold" style={{ color: colors.textPrimary }}>
						{avatarInitial}
					</Text>
				</Box>

				<VStack className="items-center gap-1">
					<Heading size="lg" style={{ color: colors.textPrimary }}>
						{savedDisplayName}
					</Heading>
					<Text style={{ color: colors.textSecondary }}>{email}</Text>
					<Text className="text-xs" style={{ color: colors.textSecondary }}>
						Conta salva neste dispositivo
					</Text>
				</VStack>

				{smartStatus === "authenticating" ? (
					<Box className="w-full rounded-xl px-4 py-3" style={{ backgroundColor: colors.surfaceMuted }}>
						<Text className="text-center font-medium" style={{ color: colors.textPrimary }}>
							Validando biometria automaticamente...
						</Text>
					</Box>
				) : (
					<VStack className="w-full gap-3">
						<Box className="rounded-xl px-4 py-3" style={{ backgroundColor: colors.dangerBg }}>
							<Text className="text-center" style={{ color: colors.dangerText }}>
								{smartError || "Falha na autenticação biométrica."}
							</Text>
						</Box>

						<Button size="lg" onPress={onUsePassword} style={{ backgroundColor: colors.brand }}>
							<ButtonText style={{ color: "#F8FAFC" }}>Entrar com senha</ButtonText>
						</Button>

						<Button
							action="secondary"
							variant="outline"
							size="lg"
							onPress={onUseOtherAccount}
							style={{ borderColor: colors.border }}
						>
							<ButtonText style={{ color: colors.textPrimary }}>Entrar com outra conta</ButtonText>
						</Button>
					</VStack>
				)}
			</VStack>
		</Box>
	);
}
