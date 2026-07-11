import { createContext, useCallback, useContext, useState } from "react";

// Modal de inserir/editar transação usado só no desktop web: em vez de navegar
// pro (stack)/insert em tela cheia, o formulário abre num modal sobre a tela atual.
// `openId` incrementa a cada abertura → o conteúdo é remontado (key) e o form
// nunca herda estado de uma edição anterior. `savedTick` avisa as telas de baixo
// (Home, Lançamentos) pra recarregarem os dados depois de um salvamento.
const InsertModalContext = createContext(null);

export function InsertModalProvider({ children }) {
	const [visible, setVisible] = useState(false);
	const [params, setParams] = useState({});
	const [openId, setOpenId] = useState(0);
	const [savedTick, setSavedTick] = useState(0);

	const openInsertModal = useCallback((nextParams = {}) => {
		setParams(nextParams ?? {});
		setOpenId((id) => id + 1);
		setVisible(true);
	}, []);

	const closeInsertModal = useCallback(() => setVisible(false), []);

	// Sinaliza "os dados mudaram" pras telas de baixo recarregarem, sem mexer na
	// visibilidade do modal — usado pelas operações de Lançamentos (excluir,
	// baixa, editar pessoa/imobilizado) e pelo salvar na rota de tela cheia.
	const notifyDataChanged = useCallback(() => setSavedTick((tick) => tick + 1), []);

	const markSaved = useCallback(() => {
		notifyDataChanged();
		setVisible(false);
	}, [notifyDataChanged]);

	return (
		<InsertModalContext.Provider
			value={{ visible, params, openId, savedTick, openInsertModal, closeInsertModal, markSaved, notifyDataChanged }}
		>
			{children}
		</InsertModalContext.Provider>
	);
}

export function useInsertModal() {
	return useContext(InsertModalContext);
}

// As telas que listam transações assinam isso pra recarregar após um salvamento
// no modal (cobre inclusive o "+" do drawer, que não sabe qual tela está embaixo).
export function useInsertSavedTick() {
	const ctx = useContext(InsertModalContext);
	return ctx?.savedTick ?? 0;
}
