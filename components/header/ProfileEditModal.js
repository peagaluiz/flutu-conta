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
import {
	FormControl,
	FormControlError,
	FormControlErrorText,
	FormControlLabel,
	FormControlLabelText,
} from "@/components/ui/form-control";

export function ProfileEditModal({
	isOpen,
	value,
	onChange,
	onClose,
	onSave,
	isSaving,
	errorMessage,
}) {
	return (
		<Modal isOpen={isOpen} onClose={onClose} size="sm">
			<ModalBackdrop />
			<ModalContent>
				<ModalHeader>
					<Text size="lg" bold>
						Editar Perfil
					</Text>
				</ModalHeader>

				<ModalBody>
					<VStack space="sm">
						<FormControl isInvalid={!!errorMessage}>
							<FormControlLabel>
								<FormControlLabelText>
									Nome de Exibicao
								</FormControlLabelText>
							</FormControlLabel>

							<Input>
								<InputField
									value={value}
									onChangeText={onChange}
									placeholder="Digite seu nome"
									editable={!isSaving}
								/>
							</Input>

							{errorMessage ? (
								<FormControlError>
									<FormControlErrorText>
										{errorMessage}
									</FormControlErrorText>
								</FormControlError>
							) : null}
						</FormControl>
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
								{isSaving ? "Salvando..." : "Salvar"}
							</ButtonText>
						</Button>
					</HStack>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
