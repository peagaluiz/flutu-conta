import { ChevronDown, ChevronUp } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { LancamentoListItem } from "@/components/finance/home/LancamentoListItem";
import {
	FATURA_ICON_COLOR,
	FaturaGroupListItem,
} from "@/components/finance/home/FaturaGroupListItem";

// Linha de fatura agrupada na lista mobile: cabeçalho clicável + itens da fatura.
export function FaturaGroupRow({ group, colors, expanded, onToggle, onPressItem }) {
	return (
		<Box className="mb-1">
			<FaturaGroupListItem
				group={group}
				onPress={onToggle}
				trailing={
					expanded ? (
						<ChevronUp size={16} color={colors.textSecondary} />
					) : (
						<ChevronDown size={16} color={colors.textSecondary} />
					)
				}
			/>

			{expanded ? (
				<Box className="mt-1 gap-1">
					{group.items.map((child) => (
						<LancamentoListItem
							key={String(child.id_transacao)}
							item={child}
							iconColor={FATURA_ICON_COLOR}
							onPress={() => onPressItem(child)}
							onLongPress={undefined}
						/>
					))}
				</Box>
			) : null}
		</Box>
	);
}
