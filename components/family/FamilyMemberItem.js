import React from "react";
import { Crown, UserMinus } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";

export function FamilyMemberItem({
	colors,
	name,
	email,
	isMe,
	memberIsOwner,
	isOwner,
	onRemove,
	onTransferOwnership,
}) {
	return (
		<Box className="rounded-xl border px-3 py-2" style={{ borderColor: colors.border }}>
			<HStack className="items-center justify-between gap-2">
				<VStack className="flex-1">
					<Text className="font-semibold" style={{ color: colors.textPrimary }}>
						{name}
					</Text>
					<Text size="sm" style={{ color: colors.textSecondary }}>
						{email}
						{isMe ? " • Você" : ""}
					</Text>
				</VStack>

				<HStack className="items-center gap-2">
					{memberIsOwner ? <Crown size={16} color={colors.textPrimary} /> : null}
					{isOwner && !memberIsOwner ? (
						<Pressable onPress={onRemove}>
							<UserMinus size={16} color={colors.dangerText} />
						</Pressable>
					) : null}
				</HStack>
			</HStack>

			{isOwner && !memberIsOwner ? (
				<Button
					className="mt-2 self-start"
					size="sm"
					variant="outline"
					onPress={onTransferOwnership}
				>
					<ButtonText>Transferir ownership</ButtonText>
				</Button>
			) : null}
		</Box>
	);
}
