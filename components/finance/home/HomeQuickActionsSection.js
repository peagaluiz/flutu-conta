import { ExternalLink } from "lucide-react-native";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";

export function HomeQuickActionsSection({ actions }) {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);

	return (
		<Box
			className="rounded-2xl border p-4 gap-3"
			style={{
				backgroundColor: colors.surface,
				borderColor: colors.border,
			}}
		>
			<Box className="flex-row items-center justify-between">
				<HStack space="sm" className="items-center">
					<ExternalLink size={20} color={colors.textPrimary} />
					<Text
						className="font-semibold"
						style={{ color: colors.textPrimary }}
					>
						Atalhos rápidos
					</Text>
				</HStack>
			</Box>

			<HStack className="gap-2" style={{ width: "100%" }}>
				{actions.map((action, index) => {
					const ActionIcon = action.icon;
					const flexWeight = index === 1 ? 34 : 33;
					const bgColor =
						index === 1
							? "#192230"
							: index === 2
							? "#0c665e"
							: "#2d3849";

					return (
						<Pressable
							key={action.key}
							onPress={action.onPress}
							style={{ flex: flexWeight }}
						>
							<Box
								className={`h-[122px] rounded-2xl border p-3 ${action.className}`}
								style={{
									backgroundColor: bgColor,
									borderColor: colors.border,
								}}
							>
								<HStack className="items-start justify-between">
									<Box className="rounded-lg bg-white/10 p-2">
										<ActionIcon size={16} color="#FFFFFF" />
									</Box>
								</HStack>
								<Box className="mt-4">
									<Text className="text-sm font-semibold text-white">
										{action.title}
									</Text>
									<Text
										numberOfLines={2}
										className="mt-1 text-[11px] text-white/75"
									>
										{action.subtitle}
									</Text>
								</Box>
							</Box>
						</Pressable>
					);
				})}
			</HStack>
		</Box>
	);
}
