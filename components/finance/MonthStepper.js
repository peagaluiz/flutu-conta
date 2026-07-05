import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";

const MONTH_LABELS = [
	"Jan",
	"Fev",
	"Mar",
	"Abr",
	"Mai",
	"Jun",
	"Jul",
	"Ago",
	"Set",
	"Out",
	"Nov",
	"Dez",
];

export function MonthStepper({ year, monthIndex, onChange, colors }) {
	const step = (delta) => {
		const next = new Date(year, monthIndex + delta, 1);
		onChange(next.getFullYear(), next.getMonth());
	};

	const arrowStyle = {
		backgroundColor: colors.surfaceMuted,
		borderColor: colors.border,
	};

	return (
		<HStack className="items-center gap-2">
			<Pressable onPress={() => step(-1)}>
				<Box className="rounded-xl border px-3 py-3" style={arrowStyle}>
					<ChevronLeft size={16} color={colors.textPrimary} />
				</Box>
			</Pressable>
			<Box
				className="flex-1 items-center rounded-xl border px-3 py-3"
				style={arrowStyle}
			>
				<Text className="font-semibold" style={{ color: colors.textPrimary }}>
					{MONTH_LABELS[monthIndex]} / {year}
				</Text>
			</Box>
			<Pressable onPress={() => step(1)}>
				<Box className="rounded-xl border px-3 py-3" style={arrowStyle}>
					<ChevronRight size={16} color={colors.textPrimary} />
				</Box>
			</Pressable>
		</HStack>
	);
}
