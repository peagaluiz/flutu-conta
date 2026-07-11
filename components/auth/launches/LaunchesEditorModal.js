import React from "react";
import {
	Modal,
	ModalBackdrop,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
} from "@/components/ui/modal";
import { Button, ButtonText } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import LaunchesEditorFields from "./LaunchesEditorFields";

export default function LaunchesEditorModal({
	isOpen,
	onClose,
	editorMode,
	section,
	editingItem,
	editorValue,
	setEditorValue,
	editorCor,
	setEditorCor,
	editorIsCorrente,
	setEditorIsCorrente,
	editorIsCartao,
	setEditorIsCartao,
	editorDiaFechamento,
	setEditorDiaFechamento,
	editorDiaVencimento,
	setEditorDiaVencimento,
	selectedPessoaId,
	pessoaOptions,
	onSelectPessoa,
	shareWithFamily,
	setShareWithFamily,
	savingEditor,
	onSave,
	family,
	colors,
}) {
	const isBanco = section === "bancos";
	const sectionLabel = isBanco ? "banco" : section === "pessoas" ? "pessoa" : "imobilizado";

	return (
		<Modal isOpen={isOpen} onClose={onClose} size="md">
			<ModalBackdrop />
			<ModalContent>
				<ModalHeader>
					<Text
						className="text-lg font-semibold"
						style={{ color: colors.textPrimary }}
					>
						{editorMode === "edit" ? "Editar" : "Novo"} {sectionLabel}
					</Text>
				</ModalHeader>

				<ModalBody>
					<LaunchesEditorFields
						editorMode={editorMode}
						section={section}
						editingItem={editingItem}
						editorValue={editorValue}
						setEditorValue={setEditorValue}
						editorCor={editorCor}
						setEditorCor={setEditorCor}
						editorIsCorrente={editorIsCorrente}
						setEditorIsCorrente={setEditorIsCorrente}
						editorIsCartao={editorIsCartao}
						setEditorIsCartao={setEditorIsCartao}
						editorDiaFechamento={editorDiaFechamento}
						setEditorDiaFechamento={setEditorDiaFechamento}
						editorDiaVencimento={editorDiaVencimento}
						setEditorDiaVencimento={setEditorDiaVencimento}
						selectedPessoaId={selectedPessoaId}
						pessoaOptions={pessoaOptions}
						onSelectPessoa={onSelectPessoa}
						shareWithFamily={shareWithFamily}
						setShareWithFamily={setShareWithFamily}
						family={family}
						colors={colors}
					/>
				</ModalBody>

				<ModalFooter>
					<Button
						action="secondary"
						variant="outline"
						onPress={onClose}
						isDisabled={savingEditor}
					>
						<ButtonText>Cancelar</ButtonText>
					</Button>
					<Button onPress={onSave} isDisabled={savingEditor}>
						<ButtonText>
							{savingEditor ? "Salvando..." : "Salvar"}
						</ButtonText>
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
