import { useCallback } from "react";
import { useRouter } from "expo-router";
import { useIsDesktopWeb } from "@/hooks/useIsDesktopWeb";
import { useInsertModal } from "@/state/InsertModalContext";

const INSERT_PATH = "/(auth)/(stack)/insert";

// Ponto único pra abrir inserir/editar transação: no desktop web abre o modal;
// em qualquer outro lugar (nativo, celular web) navega pro (stack)/insert.
export function useOpenInsert() {
	const router = useRouter();
	const isDesktopWeb = useIsDesktopWeb();
	const modal = useInsertModal();

	return useCallback(
		(params = {}, { replace = false } = {}) => {
			if (isDesktopWeb && modal) {
				modal.openInsertModal(params);
				return;
			}
			const target = { pathname: INSERT_PATH, params };
			if (replace) router.replace(target);
			else router.push(target);
		},
		[isDesktopWeb, modal, router]
	);
}
