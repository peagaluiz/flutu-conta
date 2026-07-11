import { createContext, useCallback, useContext, useState } from "react";

// Modal de gerenciar família usado só no desktop web: em vez de navegar pro
// (stack)/family em tela cheia, abre num modal sobre a tela atual. `openId`
// incrementa a cada abertura → o conteúdo é remontado (key) e recarrega os
// dados da família do zero.
const FamilyModalContext = createContext(null);

export function FamilyModalProvider({ children }) {
	const [visible, setVisible] = useState(false);
	const [openId, setOpenId] = useState(0);

	const openFamilyModal = useCallback(() => {
		setOpenId((id) => id + 1);
		setVisible(true);
	}, []);

	const closeFamilyModal = useCallback(() => setVisible(false), []);

	return (
		<FamilyModalContext.Provider
			value={{ visible, openId, openFamilyModal, closeFamilyModal }}
		>
			{children}
		</FamilyModalContext.Provider>
	);
}

export function useFamilyModal() {
	return useContext(FamilyModalContext);
}
