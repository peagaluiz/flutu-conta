import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";

export function LoginLoadingCard({ colors }) {
	return (
		<Box className="rounded-2xl px-6 py-8" style={{ backgroundColor: colors.surface }}>
			<Text style={{ color: colors.textSecondary }}>Carregando login inteligente...</Text>
		</Box>
	);
}
