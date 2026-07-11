// components/ui/ThemeProvider/ThemeProvider.tsx
"use client";

import React, { createContext, useState, useEffect, useContext } from "react";
import { Appearance, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Theme = "light" | "dark";

// Na web o AsyncStorage grava direto no localStorage, então dá para ler a
// preferência de forma síncrona e nascer já com o tema certo (sem flash).
const getInitialTheme = (): Theme => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
        try {
            const saved = window.localStorage.getItem("theme");
            if (saved === "light" || saved === "dark") return saved;
        } catch {}
    }
    return Appearance.getColorScheme() === "dark" ? "dark" : "light";
};

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
    undefined
);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    useEffect(() => {
        if (Platform.OS === "web") return;
        (async () => {
            const savedTheme = (await AsyncStorage.getItem("theme")) as
                | Theme
                | null;
            if (savedTheme) {
                setTheme(savedTheme);
            }
        })();
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        AsyncStorage.setItem("theme", newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};