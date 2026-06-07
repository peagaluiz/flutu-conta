import React from "react";
import { Trash2, Users } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";

export function FamilyActionsSection({ colors, isOwner, onDelete, onLeave }) {
	return (
		<Box
			className="rounded-2xl border p-4"
			style={{ backgroundColor: colors.surface, borderColor: colors.border }}
		>
			<Text
				className="mb-3 text-base font-semibold"
				style={{ color: colors.textPrimary }}
			>
				Ações
			</Text>
			{isOwner ? (
				<Button action="negative" onPress={onDelete}>
					<ButtonIcon as={Trash2} />
					<ButtonText>Excluir família</ButtonText>
				</Button>
			) : (
				<Button action="secondary" variant="outline" onPress={onLeave}>
					<ButtonIcon as={Users} />
					<ButtonText>Sair da família</ButtonText>
				</Button>
			)}
		</Box>
	);
}
