import React from "react";
import { Mail, Users } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";

export function PendingInviteView({
	colors,
	pendingInvite,
	acceptingInvite,
	decliningInvite,
	onAccept,
	onDecline,
}) {
	const busy = acceptingInvite || decliningInvite;

	return (
		<VStack className="gap-4">
			<Box className="items-center py-6">
				<Mail size={56} color={colors.brand} />
				<Text
					className="mt-4 text-2xl font-bold text-center"
					style={{ color: colors.textPrimary }}
				>
					Você foi convidado!
				</Text>
				<Text
					className="mt-2 text-sm text-center"
					style={{ color: colors.textSecondary }}
				>
					{pendingInvite.invited_by_nome
						? `${pendingInvite.invited_by_nome} te convidou para entrar na família`
						: "Você recebeu um convite para entrar na família"}
				</Text>
			</Box>

			<Box
				className="rounded-2xl border p-5 items-center gap-2"
				style={{ backgroundColor: colors.surface, borderColor: colors.border }}
			>
				<Users size={28} color={colors.brand} />
				<Text
					className="text-xl font-bold text-center"
					style={{ color: colors.textPrimary }}
				>
					{pendingInvite.family_nome}
				</Text>
				<Text className="text-sm text-center" style={{ color: colors.textSecondary }}>
					Ao aceitar, seus lançamentos marcados como compartilhados serão visíveis
					para os membros da família.
				</Text>
			</Box>

			<Button size="lg" action="primary" isDisabled={busy} onPress={onAccept}>
				<ButtonText>{acceptingInvite ? "Entrando..." : "Aceitar convite"}</ButtonText>
			</Button>

			<Button
				size="lg"
				variant="outline"
				action="secondary"
				isDisabled={busy}
				onPress={onDecline}
			>
				<ButtonText>{decliningInvite ? "Recusando..." : "Recusar"}</ButtonText>
			</Button>
		</VStack>
	);
}
