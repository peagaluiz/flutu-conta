import { useCallback } from "react";
import { View } from "react-native";
import { AppModal, AppModalHeader } from "@/components/ui/app-modal";
import { HStack } from "@/components/ui/hstack";
import { Button, ButtonText } from "@/components/ui/button";
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
			<HStack className="w-full justify-end px-4 pb-4">
				<Button action="secondary" size="lg" variant="outline" onPress={onClose}>
					<ButtonText>Fechar</ButtonText>
				</Button>
			</HStack>
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
