import { Modal, ModalBackdrop, ModalContent, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { VStack } from "@/components/ui/vstack";
import { Upload, Plus } from "lucide-react-native";
import { useInsertIntercept } from "@/state/InsertInterceptContext";

export function InsertInterceptModal() {
	const { isOpen, closeIntercept, handleNova, handleImportar } = useInsertIntercept();

	return (
		<Modal isOpen={isOpen} onClose={closeIntercept} size="md">
			<ModalBackdrop />
			<ModalContent>
				<ModalBody className="mt-2 mb-0">
					<VStack space="md" className="py-1">
						<Button size="xl" action="positive" onPress={handleNova}>
							<ButtonIcon as={Plus} />
							<ButtonText>Nova transação</ButtonText>
						</Button>
						<Button size="xl" action="negative" onPress={handleImportar}>
							<ButtonIcon as={Upload} />
							<ButtonText>Importar OFX</ButtonText>
						</Button>
					</VStack>
				</ModalBody>
				<ModalFooter className="mt-4">
					<Button size="lg" className="w-full" action="secondary" variant="outline" onPress={closeIntercept}>
						<ButtonText>Fechar</ButtonText>
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
