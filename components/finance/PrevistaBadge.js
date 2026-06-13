import { CalendarClock } from "lucide-react-native";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";

export function PrevistaBadge({ colors, style }) {
	return (
		<HStack
			className="items-center gap-1 rounded-full px-2 py-0.5"
			style={[
				{
					backgroundColor: colors.surfaceMuted,
					borderWidth: 1,
					borderColor: colors.border,
				},
				style,
			]}
		>
			<CalendarClock size={10} color={colors.textSecondary} />
			<Text className="text-xs font-medium" style={{ color: colors.textSecondary }}>
				Prevista
			</Text>
		</HStack>
	);
}
