import React from "react";

import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import LaunchesSkeleton from "@/components/auth/launches/LaunchesSkeleton";

export default function LaunchesListEmpty({ loading, colors }) {
	if (loading) {
		return (
			<Box className="gap-4">
				<LaunchesSkeleton />
			</Box>
		);
	}

	return (
		<Box className="gap-4">
			<Box
				className="rounded-2xl border p-5"
				style={{
					backgroundColor: colors.surface,
					borderColor: colors.border,
				}}
			>
				<Text style={{ color: colors.textSecondary }}>
					Nenhum registro encontrado.
				</Text>
			</Box>
		</Box>
	);
}
