import React, { memo } from "react";
import { Box } from "@/components/ui/box";

function CardBase({ children, colors, danger = false, selected = false }) {
	return (
		<Box
			className="rounded-2xl border p-4"
			style={{
				backgroundColor: selected
					? colors.brandSoft
					: danger
					? colors.dangerBg
					: colors.surface,
				borderColor: selected
					? colors.brand
					: danger
					? colors.dangerText
					: colors.border,
			}}
		>
			{children}
		</Box>
	);
}

export default memo(CardBase);
