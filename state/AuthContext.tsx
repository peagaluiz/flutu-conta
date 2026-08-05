import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { resetApiFetchRedirectGuard } from "@/services/http/apiFetch";
import { setCurrentUserCache } from "@/services/auth/currentUserCache";
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
import { authSession, type AuthUser, type LoginPayload } from "@/services/auth/session";
import { FamilyInvite, FamilyMember, PendingInvite } from "@/services/supabase/familyRepository";
import { clearReadCache } from "@/services/database/readCache";
import { useFamilyState, type FamilyInfo, type FamilyUserPatch } from "@/state/useFamilyState";

type User = AuthUser;

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
    updateUserAvatar: (base64Data: string, mimeType?: string) => Promise<void>;
    removeUserAvatar: () => Promise<void>;
    requestPasswordReset: (email: string) => Promise<void>;
    establishRecoverySessionFromUrl: (url: string) => Promise<void>;
    updatePassword: (newPassword: string) => Promise<void>;
    family: FamilyInfo | null;
    familyMembers: FamilyMember[];
    familyInvites: FamilyInvite[];
    pendingInvite: PendingInvite | null;
    familyReady: boolean;
    reloadFamily: () => Promise<void>;
    createNewFamily: (nome: string) => Promise<void>;
    sendFamilyInvite: (email: string) => Promise<void>;
    cancelFamilyInvite: (inviteId: number) => Promise<void>;
    removeMemberFromFamily: (memberId: number) => Promise<void>;
    transferFamilyOwnership: (targetUserId: string) => Promise<void>;
    leaveCurrentFamily: () => Promise<void>;
    deleteCurrentFamily: () => Promise<void>;
    acceptPendingInvite: () => Promise<void>;
    declinePendingInvite: () => Promise<void>;
};

export const AuthContext = createContext<AuthState>({} as AuthState);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    const applyFamilyPatch = useCallback((patch: FamilyUserPatch) => {
        setUser((prev) => (prev ? { ...prev, ...patch } : prev));
    }, []);

    const familyState = useFamilyState({
        isLoggedIn,
        userId: user?.id,
        onUserPatch: applyFamilyPatch,
    });
    const { setFamilyReady, resetFamilyState } = familyState;

    async function authenticateAndSetSession(data: LoginPayload) {
        setUser(await authSession.authenticate(data));
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
        await authSession.signOut();

        resetApiFetchRedirectGuard();
        clearReadCache();
        setUser(null);
        resetFamilyState();
        setIsLoggedIn(false);
        router.replace("/login");
    }

    async function updateUserProfile(nome: string) {
        if (!user) throw new Error("Usuário não autenticado");

        await authSession.updateProfileName(nome);
        setUser((prev) => (prev ? { ...prev, nome } : null));
    }

    async function updateUserAvatar(base64Data: string, mimeType: string = "image/jpeg") {
        if (!user) throw new Error("Usuário não autenticado");

        const ext = mimeType === "image/png" ? "png" : "jpg";
        const avatarUrl = await authSession.uploadAvatar(user.id, base64Data, mimeType, ext);

        setUser((prev) => (prev ? { ...prev, avatarUrl } : null));
    }

    async function removeUserAvatar() {
        if (!user) throw new Error("Usuário não autenticado");

        await authSession.removeAvatar(user.id);
        setUser((prev) => (prev ? { ...prev, avatarUrl: null } : null));
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
        const unsubscribe = authSession.subscribeToAuthChanges((nextUser) => {
            setUser((prev) => {
                if (!nextUser) return null;
                // Preserva avatarUrl já salvo caso a sessão ainda não reflita o upload
                return {
                    ...nextUser,
                    avatarUrl: nextUser.avatarUrl ?? prev?.avatarUrl ?? null,
                };
            });
            setIsLoggedIn(Boolean(nextUser));
            if (!nextUser) setFamilyReady(true);
            setIsReady(true);
        });

        (async () => {
            const restored = await authSession.restoreSession();

            if (restored.status === "authenticated") {
                setUser(restored.user);
                setIsLoggedIn(true);
            } else {
                setIsLoggedIn(false);
                setFamilyReady(true);
            }

            setIsReady(true);
        })();

        return unsubscribe;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setCurrentUserCache(user);
    }, [user]);

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
                updateUserAvatar,
                removeUserAvatar,
                requestPasswordReset,
                establishRecoverySessionFromUrl,
                updatePassword,
                family: familyState.family,
                familyMembers: familyState.familyMembers,
                familyInvites: familyState.familyInvites,
                pendingInvite: familyState.pendingInvite,
                familyReady: familyState.familyReady,
                reloadFamily: familyState.reloadFamily,
                createNewFamily: familyState.createNewFamily,
                sendFamilyInvite: familyState.sendFamilyInvite,
                cancelFamilyInvite: familyState.cancelFamilyInvite,
                removeMemberFromFamily: familyState.removeMemberFromFamily,
                transferFamilyOwnership: familyState.transferFamilyOwnership,
                leaveCurrentFamily: familyState.leaveCurrentFamily,
                deleteCurrentFamily: familyState.deleteCurrentFamily,
                acceptPendingInvite: familyState.acceptPendingInvite,
                declinePendingInvite: familyState.declinePendingInvite,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
