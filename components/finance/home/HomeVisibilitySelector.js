import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";

const OPTIONS = [
	{ value: "all", label: "Todos" },
	{ value: "mine", label: "Meus" },
	{ value: "family", label: "Família" },
];

export function HomeVisibilitySelector({ value, onChange }) {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);

	return (
		<Box
			className="rounded-xl border p-3"
			style={{ backgroundColor: colors.surface, borderColor: colors.border }}
		>
			<HStack className="items-center justify-between">
				<Text
					className="text-sm font-semibold"
					style={{ color: colors.textPrimary }}
				>
					Família
				</Text>
				<HStack className="gap-2">
					{OPTIONS.map((option) => {
						const active = option.value === value;
						return (
							<Pressable
								key={option.value}
								onPress={() => onChange(option.value)}
							>
								<Box
									className="rounded-full border px-3 py-1"
									style={{
										borderColor: active
											? colors.textPrimary
											: colors.border,
										backgroundColor: active
											? colors.textPrimary
											: colors.surface,
									}}
								>
									<Text
										className="text-xs font-medium"
										style={{
											color: active
												? colors.surface
												: colors.textSecondary,
										}}
									>
										{option.label}
									</Text>
								</Box>
							</Pressable>
						);
					})}
				</HStack>
			</HStack>
		</Box>
	);
}
