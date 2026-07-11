import { useIsDesktopWeb } from "@/hooks/useIsDesktopWeb";
import HomeFinanceList from "@/components/finance/home/HomeFinanceList";
import HomeDesktop from "@/components/finance/home/desktop/HomeDesktop";

export default function Home() {
	const isDesktopWeb = useIsDesktopWeb();
	return isDesktopWeb ? <HomeDesktop /> : <HomeFinanceList />;
}
