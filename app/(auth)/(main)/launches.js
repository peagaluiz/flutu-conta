import { useIsDesktopWeb } from "@/hooks/useIsDesktopWeb";
import LaunchesMobileScreen from "@/components/auth/launches/LaunchesMobileScreen";
import LaunchesWebScreen from "@/components/auth/launches/web/LaunchesWebScreen";

export default function Launches() {
	const isDesktopWeb = useIsDesktopWeb();
	return isDesktopWeb ? <LaunchesWebScreen /> : <LaunchesMobileScreen />;
}
