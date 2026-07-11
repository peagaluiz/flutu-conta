import React from "react";
import { View } from "react-native";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { cellStyle, getActionsWidth } from "@/utils/auth/launches/tableColumns";

export default function LaunchesTableHeader({ columns, section, colors, showActions = true }) {
	return (
		<HStack
			className="items-center"
			style={{
				width: "100%",
				maxWidth: 1100,
				alignSelf: "center",
				paddingVertical: 8,
				paddingHorizontal: 4,
				borderBottomWidth: 1,
				borderBottomColor: colors.border,
				backgroundColor: colors.screen,
			}}
		>
			{columns.map((col) => (
				<View key={col.key} style={cellStyle(col)}>
					<Text
						className="text-[11px] font-semibold uppercase"
						numberOfLines={1}
						style={{
							color: colors.textSecondary,
							letterSpacing: 0.4,
							textAlign: col.align === "right" ? "right" : "left",
						}}
					>
						{col.label}
					</Text>
				</View>
			))}
			{showActions ? (
				<View style={{ width: getActionsWidth(section), paddingHorizontal: 6 }}>
					<Text
						className="text-[11px] font-semibold uppercase"
						style={{ color: colors.textSecondary, letterSpacing: 0.4, textAlign: "right" }}
					>
						Ações
					</Text>
				</View>
			) : null}
		</HStack>
	);
}
