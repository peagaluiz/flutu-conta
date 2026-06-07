import React from "react";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";

export function FamilyInfoCard({ colors, family, ownerName }) {
	return (
		<Box
			className="rounded-2xl border p-4"
			style={{ backgroundColor: colors.surface, borderColor: colors.border }}
		>
			<VStack className="gap-1">
				<Text className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
					{family.nome}
				</Text>
				<Text style={{ color: colors.textSecondary }}>
					{family.memberCount} membro(s)
				</Text>
				<Text style={{ color: colors.textSecondary }}>Owner: {ownerName}</Text>
			</VStack>
		</Box>
	);
}
