import React from "react";
import {
	Modal,
	ModalBackdrop,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
} from "@/components/ui/modal";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";

export function FamilyCreateModal({
	isOpen,
	value,
	onChange,
	onClose,
	onSave,
	isSaving,
}) {
	return (
		<Modal isOpen={isOpen} onClose={onClose} size="sm">
			<ModalBackdrop />
			<ModalContent>
				<ModalHeader>
					<Text size="lg" bold>
						Criar família
					</Text>
				</ModalHeader>

				<ModalBody>
					<VStack space="sm">
						<Text size="sm">Digite o nome da sua família</Text>
						<Input>
							<InputField
								value={value}
								onChangeText={onChange}
								placeholder="Ex: Família Silva"
								editable={!isSaving}
							/>
						</Input>
					</VStack>
				</ModalBody>

				<ModalFooter>
					<HStack space="sm">
						<Button
							variant="outline"
							action="secondary"
							onPress={onClose}
							isDisabled={isSaving}
						>
							<ButtonText>Cancelar</ButtonText>
						</Button>
						<Button
							action="primary"
							onPress={onSave}
							isDisabled={isSaving}
						>
							<ButtonText>
								{isSaving ? "Criando..." : "Criar"}
							</ButtonText>
						</Button>
					</HStack>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
