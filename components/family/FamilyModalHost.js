import { useCallback } from "react";
import { View } from "react-native";
import { AppModal, AppModalHeader, AppModalFooter } from "@/components/ui/app-modal";
import { useFamilyModal } from "@/state/FamilyModalContext";
import { useFamilyManagement } from "@/hooks/useFamilyManagement";
import { FamilyManagementView, getFamilyTitle } from "@/components/family/FamilyManagementView";

// O corpo só chama useFamilyManagement quando montado (modal aberto) e é
// remontado a cada abertura (key=openId no host), pra recarregar os dados.
function FamilyModalBody({ colors, onClose }) {
	const fm = useFamilyManagement();
	return (
		<View style={{ width: "100%" }}>
			<AppModalHeader title={getFamilyTitle(fm)} onClose={onClose} colors={colors} />
			<FamilyManagementView fm={fm} colors={colors} />
			<AppModalFooter onClose={onClose} />
		</View>
	);
}

// Host do modal de gerenciar família (desktop web). Fica montado no (auth)/_layout.
export function FamilyModalHost() {
	const modal = useFamilyModal();
	const onClose = useCallback(() => modal?.closeFamilyModal(), [modal]);

	if (!modal) return null;

	return (
		<AppModal isOpen={modal.visible} onClose={onClose}>
			{({ colors }) =>
				modal.visible ? (
					<FamilyModalBody key={modal.openId} colors={colors} onClose={onClose} />
				) : null
			}
		</AppModal>
	);
}
