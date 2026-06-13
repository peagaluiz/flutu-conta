import { Text } from "@/components/ui/text";
import { ActionListModal } from "@/components/ui/ActionListModal";

const SCOPES = [
	{ key: "only_this", label: "Somente este lançamento" },
	{ key: "this_and_future", label: "Este e os futuros" },
	{ key: "all", label: "Todos os lançamentos" },
];

export function RecurringEditScopeModal({ isOpen, onClose, onConfirm }) {
	return (
		<ActionListModal
			isOpen={isOpen}
			onClose={onClose}
			title="Editar lançamento recorrente"
			items={[
				{
					render: (colors) => (
						<Text className="text-sm mb-1" style={{ color: colors.textSecondary }}>
							Quais lançamentos deseja alterar?
						</Text>
					),
				},
				...SCOPES.map((scope) => ({
					label: scope.label,
					onPress: () => onConfirm(scope.key),
				})),
			]}
		/>
	);
}
