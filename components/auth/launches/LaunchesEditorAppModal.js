import { View } from "react-native";
import { AppModal, AppModalHeader, AppModalFooter } from "@/components/ui/app-modal";
import { Box } from "@/components/ui/box";
import LaunchesEditorFields from "./LaunchesEditorFields";

// Editor de banco/pessoa/imobilizado no padrão AppModal (desktop web), com o
// footer padrão Cancelar + Salvar. Mesma casca do inserir/editar transação.
export default function LaunchesEditorAppModal({
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
}) {
	const sectionLabel =
		section === "bancos" ? "banco" : section === "pessoas" ? "pessoa" : "imobilizado";
	const title = `${editorMode === "edit" ? "Editar" : "Novo"} ${sectionLabel}`;

	return (
		<AppModal isOpen={isOpen} onClose={onClose} width="480px">
			{({ colors }) =>
				isOpen ? (
					<View style={{ width: "100%" }}>
						<AppModalHeader
							title={title}
							onClose={onClose}
							disabled={savingEditor}
							colors={colors}
						/>
						<Box className="px-4 py-4">
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
						</Box>
						<AppModalFooter
							onSave={onSave}
							onCancel={onClose}
							saving={savingEditor}
						/>
					</View>
				) : null
			}
		</AppModal>
	);
}
