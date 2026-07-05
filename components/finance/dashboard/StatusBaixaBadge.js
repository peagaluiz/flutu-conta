import { CheckCircle2, Clock3 } from "lucide-react-native";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";

export function StatusBaixaBadge({ status, colors, style }) {
	const pago = status === "pago";
	const Icon = pago ? CheckCircle2 : Clock3;
	const color = pago ? colors.success : colors.textSecondary;
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
			<Icon size={10} color={color} />
			<Text className="text-xs font-medium" style={{ color }}>
				{pago ? "Baixada" : "Pendente"}
			</Text>
		</HStack>
	);
}
