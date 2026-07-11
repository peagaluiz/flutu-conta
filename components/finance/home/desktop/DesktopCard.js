import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";

export function DesktopCard({ title, actionLabel, onPressAction, children, className = "", contentClassName = "gap-3", style }) {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);

	return (
		<Box
			className={`rounded-xl border p-4 ${className}`}
			style={{
				backgroundColor: colors.surface,
				borderColor: colors.border,
				...style,
			}}
		>
			{(title || actionLabel) && (
				<Box className="flex-row items-center justify-between mb-3">
					{title ? (
						<Text className="font-semibold" style={{ color: colors.textPrimary }}>
							{title}
						</Text>
					) : (
						<Box />
					)}
					{actionLabel ? (
						<Pressable onPress={onPressAction}>
							<Text className="text-sm font-medium" style={{ color: colors.brand }}>
								{actionLabel}
							</Text>
						</Pressable>
					) : null}
				</Box>
			)}
			<Box className={contentClassName}>{children}</Box>
		</Box>
	);
}
