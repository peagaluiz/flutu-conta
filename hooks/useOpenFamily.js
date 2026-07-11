import { useCallback } from "react";
import { useRouter } from "expo-router";
import { useIsDesktopWeb } from "@/hooks/useIsDesktopWeb";
import { useFamilyModal } from "@/state/FamilyModalContext";

const FAMILY_PATH = "/(auth)/(stack)/family";

// Ponto único pra abrir gerenciar família: no desktop web abre o modal;
// em qualquer outro lugar (nativo, celular web) navega pro (stack)/family.
export function useOpenFamily() {
	const router = useRouter();
	const isDesktopWeb = useIsDesktopWeb();
	const modal = useFamilyModal();

	return useCallback(() => {
		if (isDesktopWeb && modal) {
			modal.openFamilyModal();
			return;
		}
		router.push(FAMILY_PATH);
	}, [isDesktopWeb, modal, router]);
}
