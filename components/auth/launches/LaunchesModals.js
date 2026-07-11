import LaunchesEditorModal from "./LaunchesEditorModal";
import BancoCatalogoSheet from "./BancoCatalogoSheet";
import { BaixaDateModal } from "./BaixaDateModal";
import { DateFilterModal } from "@/components/finance/DateFilterModal";
import { OfxImportModal } from "@/components/finance/insert/OfxImportModal";

export default function LaunchesModals({
	editor,
	section,
	family,
	userData,
	colors,
	searchText,
	onApplySearch,
	showFilterSearch = true,
	filterOpen,
	onCloseFilter,
	baixaDateModalOpen,
	onCloseBaixaDate,
	onApplyBaixaDate,
	ofxModalOpen,
	onCloseOfx,
}) {
	return (
		<>
			<LaunchesEditorModal
				isOpen={editor.editorOpen}
				onClose={editor.closeEditor}
				editorMode={editor.editorMode}
				section={section}
				editingItem={editor.editingItem}
				editorValue={editor.editorValue}
				setEditorValue={editor.setEditorValue}
				editorCor={editor.editorCor}
				setEditorCor={editor.setEditorCor}
				editorIsCorrente={editor.editorIsCorrente}
				setEditorIsCorrente={editor.setEditorIsCorrente}
				editorIsCartao={editor.editorIsCartao}
				setEditorIsCartao={editor.setEditorIsCartao}
				editorDiaFechamento={editor.editorDiaFechamento}
				setEditorDiaFechamento={editor.setEditorDiaFechamento}
				editorDiaVencimento={editor.editorDiaVencimento}
				setEditorDiaVencimento={editor.setEditorDiaVencimento}
				selectedPessoaId={editor.selectedPessoaId}
				pessoaOptions={editor.pessoaOptions}
				onSelectPessoa={editor.selectPessoaOption}
				shareWithFamily={editor.shareWithFamily}
				setShareWithFamily={editor.setShareWithFamily}
				savingEditor={editor.savingEditor}
				onSave={editor.saveEditor}
				family={family}
				colors={colors}
			/>

			<BancoCatalogoSheet
				isOpen={editor.catalogSheetOpen}
				onClose={editor.closeCatalogSheet}
				onSelect={async (item) => {
					editor.closeCatalogSheet();
					await editor.createBancoFromCatalog(item);
				}}
				colors={colors}
			/>

			<BaixaDateModal
				isOpen={baixaDateModalOpen}
				onClose={onCloseBaixaDate}
				onApply={onApplyBaixaDate}
			/>

			<DateFilterModal
				isOpen={filterOpen}
				onClose={onCloseFilter}
				showSearch={showFilterSearch}
				searchText={searchText}
				onApplySearch={onApplySearch}
			/>

			<OfxImportModal
				isOpen={ofxModalOpen}
				onClose={onCloseOfx}
				userId={userData?.id ?? null}
			/>
		</>
	);
}
