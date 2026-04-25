import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { supabase } from "@/services/supabase/client";
import {
    establishRecoverySessionFromUrl as establishRecoverySessionFromUrlService,
    requestPasswordReset as requestPasswordResetService,
    updatePassword as updatePasswordService,
} from "@/services/auth/passwordRecovery";
import {
    authenticateWithDeviceSecurity,
    clearDeviceLoginCredentials,
    getDeviceLoginCredentials,
    saveDeviceLoginCredentials,
} from "@/services/auth/deviceCredentials";
import { Session } from "@supabase/supabase-js";

type User = {
    id: string;
    email: string | null;
    nome?: string | null;
    avatarUrl?: string | null;
};

type LoginPayload = {
    email: string;
    senha: string;
};

type LoginOptions = {
    saveLogin?: boolean;
};

type AuthState = {
    isLoggedIn: boolean;
    isReady: boolean;
    logIn: (data: LoginPayload, options?: LoginOptions) => Promise<boolean>;
    logInWithSavedCredentials: () => Promise<boolean>;
    logOut: () => Promise<void>;
    userData: User | null;
    updateUserProfile: (nome: string) => Promise<void>;
    requestPasswordReset: (email: string) => Promise<void>;
    establishRecoverySessionFromUrl: (url: string) => Promise<void>;
    updatePassword: (newPassword: string) => Promise<void>;
};

export const AuthContext = createContext<AuthState>({} as AuthState);

function mapSessionToUser(session: Session | null): User | null {
    if (!session?.user) return null;

    return {
        id: session.user.id,
        email: session.user.email ?? null,
        nome:
            (session.user.user_metadata?.display_name as string | undefined) ??
            (session.user.user_metadata?.nome as string | undefined) ??
            null,
        avatarUrl:
            (session.user.user_metadata?.avatar_url as string | undefined) ??
            (session.user.user_metadata?.picture as string | undefined) ??
            (session.user.user_metadata?.photo_url as string | undefined) ??
            null,
    };
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    async function authenticateAndSetSession(data: LoginPayload) {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.senha,
        });

        if (error) {
            throw error.message || "Falha ao autenticar";
        }

        setUser(mapSessionToUser(authData.session));
        setIsLoggedIn(true);
        setIsReady(true);

        router.replace("/");
        return true;
    }

    async function logIn(data: LoginPayload, options?: LoginOptions) {
        const loggedIn = await authenticateAndSetSession(data);

        if (options?.saveLogin === true) {
            await saveDeviceLoginCredentials(data);
        }

        if (options?.saveLogin === false) {
            await clearDeviceLoginCredentials();
        }

        return loggedIn;
    }

    async function logInWithSavedCredentials() {
        const saved = await getDeviceLoginCredentials();
        if (!saved) {
            throw new Error("Nenhum login salvo neste dispositivo");
        }

        await authenticateWithDeviceSecurity();
        return authenticateAndSetSession(saved);
    }

    async function logOut() {
        await supabase.auth.signOut();
        setUser(null);
        setIsLoggedIn(false);
        router.replace("/login");
    }

    async function updateUserProfile(nome: string) {
        if (!user) throw new Error("Usuário não autenticado");

        const { error } = await supabase.auth.updateUser({
            data: { display_name: nome },
        });

        if (error) {
            throw error.message || "Falha ao atualizar perfil";
        }

        setUser((prev) => (prev ? { ...prev, nome } : null));
    }

    async function requestPasswordReset(email: string) {
        await requestPasswordResetService(email);
    }

    async function establishRecoverySessionFromUrl(url: string) {
        await establishRecoverySessionFromUrlService(url);
    }

    async function updatePassword(newPassword: string) {
        await updatePasswordService(newPassword);
    }

    useEffect(() => {
        async function init() {
            const { data, error } = await supabase.auth.getSession();
            if (error) {
                setIsReady(true);
                return;
            }

            const currentUser = mapSessionToUser(data.session);
            if (currentUser) {
                setUser(currentUser);
                setIsLoggedIn(true);
            }

            setIsReady(true);
        }

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            const nextUser = mapSessionToUser(session);
            setUser(nextUser);
            setIsLoggedIn(Boolean(nextUser));
            setIsReady(true);
        });

        init();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider
            value={{
                isLoggedIn,
                isReady,
                logIn,
                logInWithSavedCredentials,
                logOut,
                userData: user,
                updateUserProfile,
                requestPasswordReset,
                establishRecoverySessionFromUrl,
                updatePassword,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
