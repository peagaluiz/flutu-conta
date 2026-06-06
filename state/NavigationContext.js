import { createContext, useContext } from "react";

const NavigationContext = createContext(() => {});
export const NavReadyStateContext = createContext(false);

export function useNavReady() {
	return useContext(NavigationContext);
}

export function useIsNavReady() {
	return useContext(NavReadyStateContext);
}

export default NavigationContext;
