import { useIsDesktopWeb } from "@/hooks/useIsDesktopWeb";
import MainTabsNavigator from "@/components/navigation/MainTabsNavigator";
import MainDrawerNavigator from "@/components/navigation/MainDrawerNavigator";

// Navegação principal responsiva: drawer no desktop web, tabs em todo o resto
// (app nativo e navegador de celular). Reage a resize da janela.
export default function MainLayout() {
	const isDesktopWeb = useIsDesktopWeb();
	return isDesktopWeb ? <MainDrawerNavigator /> : <MainTabsNavigator />;
}
