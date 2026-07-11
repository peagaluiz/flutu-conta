import { CreditCard, Landmark } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";

export function OfxImportSummaryCard({
	bank,
	isCredit,
	selectedCount,
	totalCount,
	colors,
	onSelectAll,
	onSelectNone,
}) {
	return (
		<HStack
			className="items-center gap-3 rounded-xl border p-3"
			style={{ backgroundColor: colors.surface, borderColor: colors.border }}
		>
			<Box
				className="rounded-full items-center justify-center"
				style={{ width: 34, height: 34, backgroundColor: bank?.cor_hex || "#6B7280" }}
			>
				{isCredit ? <CreditCard size={17} color="#FFF" /> : <Landmark size={17} color="#FFF" />}
			</Box>
			<VStack className="flex-1">
				<Text className="font-semibold" style={{ color: colors.textPrimary }}>
					{bank?.nome}
				</Text>
				<Text className="text-xs" style={{ color: colors.textSecondary }}>
					{isCredit ? "Fatura de cartão" : "Extrato de conta"} • {selectedCount}/{totalCount} selecionados
				</Text>
			</VStack>
			<HStack className="gap-3">
				<Pressable onPress={onSelectAll}>
					<Text className="text-xs font-semibold" style={{ color: colors.textPrimary }}>
						Todos
					</Text>
				</Pressable>
				<Pressable onPress={onSelectNone}>
					<Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
						Nenhum
					</Text>
				</Pressable>
			</HStack>
		</HStack>
	);
}
