import React from "react";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { FamilyMemberItem } from "./FamilyMemberItem";

export function FamilyMembersList({
	colors,
	members,
	isOwner,
	currentUserId,
	getMemberName,
	getMemberEmail,
	onRemove,
	onTransferOwnership,
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
				Membros
			</Text>
			<VStack className="gap-2">
				{members.map((member) => (
					<FamilyMemberItem
						key={String(member.id)}
						colors={colors}
						name={getMemberName(member)}
						email={getMemberEmail(member)}
						isMe={member.user_id === currentUserId}
						memberIsOwner={member.role === "owner"}
						isOwner={isOwner}
						onRemove={() => onRemove(member)}
						onTransferOwnership={() => onTransferOwnership(member)}
					/>
				))}
			</VStack>
		</Box>
	);
}
