import React, { createContext, useCallback, useContext, useState } from "react";

const SelectorOverlayCtx = createContext({ active: false, open: () => {}, close: () => {} });

export function SelectorOverlayProvider({ children }) {
    const [count, setCount] = useState(0);
    const open = useCallback(() => setCount((c) => c + 1), []);
    const close = useCallback(() => setCount((c) => Math.max(0, c - 1)), []);
    return (
        <SelectorOverlayCtx.Provider value={{ active: count > 0, open, close }}>
            {children}
        </SelectorOverlayCtx.Provider>
    );
}

export function useSelectorOverlay() {
    return useContext(SelectorOverlayCtx);
}
