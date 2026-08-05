import { CheckCircle, Trash2, X, XCircle } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { ActionListModal } from "@/components/ui/ActionListModal";
import { LancamentoSummary } from "@/components/finance/home/LancamentoSummary";

// Modais próprios da tela web: ações em massa (aberto pelo botão do header da
// tabela) e detalhes de um lançamento (botão "visualizar" da linha).
export function LaunchesWebActionModals({
	colors,
	bulkOpen,
	onCloseBulk,
	selectedCount,
	allHaveBaixa,
	onBaixa,
	onDelete,
	onClearSelection,
	viewItem,
	onCloseView,
}) {
	return (
		<>
			<ActionListModal
				isOpen={bulkOpen}
				onClose={onCloseBulk}
				title="Ações em massa"
				cancelLabel="Cancelar"
				items={[
					{
						render: () => (
							<Text className="text-sm" style={{ color: colors.textSecondary }}>
								{selectedCount} selecionado{selectedCount === 1 ? "" : "s"}
							</Text>
						),
					},
					{
						label: allHaveBaixa ? "Remover baixa" : "Dar baixa",
						icon: allHaveBaixa ? XCircle : CheckCircle,
						onPress: onBaixa,
					},
					{
						label: "Excluir",
						icon: Trash2,
						color: colors.dangerText,
						onPress: onDelete,
					},
					{
						label: "Limpar seleção",
						icon: X,
						onPress: onClearSelection,
					},
				]}
			/>

			<ActionListModal
				isOpen={!!viewItem}
				onClose={onCloseView}
				title="Detalhes do lançamento"
				items={[{ render: () => <LancamentoSummary item={viewItem} /> }]}
			/>
		</>
	);
}
