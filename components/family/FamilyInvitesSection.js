import React from "react";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Input, InputField } from "@/components/ui/input";
import { Button, ButtonText } from "@/components/ui/button";

export function FamilyInvitesSection({
	colors,
	inviteEmail,
	onChangeEmail,
	onInvite,
	savingInvite,
	invites,
	onCancelInvite,
}) {
	return (
		<Box
			className="rounded-2xl border p-4"
			style={{ backgroundColor: colors.surface, borderColor: colors.border }}
		>
			<Text
				className="mb-3 text-base font-semibold"
				style={{ color: colors.textPrimary }}
			>
				Convites por e-mail
			</Text>

			<HStack className="items-center gap-2">
				<Input className="flex-1">
					<InputField
						value={inviteEmail}
						onChangeText={onChangeEmail}
						placeholder="email@exemplo.com"
						keyboardType="email-address"
						autoCapitalize="none"
					/>
				</Input>
				<Button onPress={onInvite} isDisabled={savingInvite}>
					<ButtonText>{savingInvite ? "Enviando..." : "Convidar"}</ButtonText>
				</Button>
			</HStack>

			<Text
				className="mt-4 mb-2 text-sm font-semibold"
				style={{ color: colors.textPrimary }}
			>
				Convites pendentes
			</Text>
			<VStack className="gap-2">
				{invites.length === 0 ? (
					<Text style={{ color: colors.textSecondary }}>Nenhum convite pendente.</Text>
				) : (
					invites.map((invite) => (
						<HStack
							key={String(invite.id)}
							className="items-center justify-between rounded-xl border px-3 py-2"
							style={{ borderColor: colors.border }}
						>
							<Text style={{ color: colors.textPrimary }}>{invite.email}</Text>
							<Button
								size="sm"
								variant="outline"
								action="negative"
								onPress={() => onCancelInvite(invite.id)}
							>
								<ButtonText>Cancelar</ButtonText>
							</Button>
						</HStack>
					))
				)}
			</VStack>
		</Box>
	);
}
