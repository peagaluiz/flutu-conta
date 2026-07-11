import { useCallback, useMemo } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppModal, AppModalHeader } from "@/components/ui/app-modal";
import { useSelectorOverlay } from "@/state/SelectorOverlayContext";
import { useInsertModal } from "@/state/InsertModalContext";
import { BankSelectField } from "@/components/finance/insert/BankSelectField";
import { InsertFormView } from "@/components/finance/insert/InsertFormView";
import { useInsertForm } from "@/components/finance/insert/useInsertForm";

function InsertModalContent({ params, onDone, onCancel, colors, isDarkMode, insets, isSelectorOpen }) {
	const state = useInsertForm({ params, onDone, onCancel });
	const { isEditMode, isSaving, selectedCatalogBanco, handleBancoSelect, family } = state;

	const actionSheetContentStyle = useMemo(() => ({ paddingBottom: 12 }), []);

	const bankField = (
		<BankSelectField
			selectedCatalogBanco={selectedCatalogBanco ?? null}
			onSelect={handleBancoSelect}
			themeColors={colors}
			isDarkMode={isDarkMode}
			actionSheetContentStyle={actionSheetContentStyle}
			disabled={isSaving}
			familyId={family?.id ? Number(family.id) : null}
		/>
	);

	return (
		<View style={{ width: "100%" }}>
			<AppModalHeader
				title={isEditMode ? "Editar Transação" : "Nova Transação"}
				onClose={onCancel}
				disabled={isSaving}
				colors={colors}
			/>

			<InsertFormView
				state={state}
				themeColors={colors}
				isDarkMode={isDarkMode}
				insets={insets}
				isSelectorOpen={isSelectorOpen}
				topSlot={bankField}
				hideTitle
				externalScroll
			/>
		</View>
	);
}

// Host do modal de inserir/editar (desktop web). Fica montado no (auth)/_layout;
// o conteúdo só monta quando aberto e é remontado a cada abertura (key=openId),
// pra nunca herdar estado de uma edição anterior.
export function InsertModalHost() {
	const modal = useInsertModal();
	const insets = useSafeAreaInsets();
	const { active: isSelectorOpen } = useSelectorOverlay();

	const onDone = useCallback(() => modal?.markSaved(), [modal]);
	const onCancel = useCallback(() => modal?.closeInsertModal(), [modal]);

	if (!modal) return null;

	return (
		<AppModal isOpen={modal.visible} onClose={onCancel}>
			{({ colors, isDarkMode }) =>
				modal.visible ? (
					<InsertModalContent
						key={modal.openId}
						params={modal.params}
						onDone={onDone}
						onCancel={onCancel}
						colors={colors}
						isDarkMode={isDarkMode}
						insets={insets}
						isSelectorOpen={isSelectorOpen}
					/>
				) : null
			}
		</AppModal>
	);
}
