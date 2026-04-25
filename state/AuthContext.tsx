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
import {
    cancelInvite,
    createFamily,
    deleteFamily,
    FamilyInvite,
    FamilyMember,
    FamilySnapshot,
    getFamilySnapshot,
    inviteFamilyMember,
    leaveFamily,
    removeFamilyMember,
    transferOwnership,
} from "@/services/family/familyRepository";

type FamilyInfo = {
    id: number;
    nome: string;
    ownerUserId: string;
    memberCount: number;
    role: "owner" | "member" | null;
};

type User = {
    id: string;
    email: string | null;
    nome?: string | null;
    avatarUrl?: string | null;
    familyId?: number | null;
    familyRole?: "owner" | "member" | null;
    familyName?: string | null;
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
    family: FamilyInfo | null;
    familyMembers: FamilyMember[];
    familyInvites: FamilyInvite[];
    reloadFamily: () => Promise<void>;
    createNewFamily: (nome: string) => Promise<void>;
    sendFamilyInvite: (email: string) => Promise<void>;
    cancelFamilyInvite: (inviteId: number) => Promise<void>;
    removeMemberFromFamily: (memberId: number) => Promise<void>;
    transferFamilyOwnership: (targetUserId: string) => Promise<void>;
    leaveCurrentFamily: () => Promise<void>;
    deleteCurrentFamily: () => Promise<void>;
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
    const [family, setFamily] = useState<FamilyInfo | null>(null);
    const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
    const [familyInvites, setFamilyInvites] = useState<FamilyInvite[]>([]);
    const [familySnapshot, setFamilySnapshot] = useState<FamilySnapshot | null>(null);
    const router = useRouter();

    async function reloadFamily() {
        if (!isLoggedIn) {
            setFamily(null);
            setFamilyMembers([]);
            setFamilyInvites([]);
            setFamilySnapshot(null);
            setUser((prev) =>
                prev
                    ? {
                        ...prev,
                        familyId: null,
                        familyRole: null,
                        familyName: null,
                    }
                    : prev
            );
            return;
        }

        const snapshot = await getFamilySnapshot();
        setFamilySnapshot(snapshot);
        setFamilyMembers(snapshot.members);
        setFamilyInvites(snapshot.invites);

        if (!snapshot.family || !snapshot.membership) {
            setFamily(null);
            setUser((prev) =>
                prev
                    ? {
                        ...prev,
                        familyId: null,
                        familyRole: null,
                        familyName: null,
                    }
                    : prev
            );
            return;
        }

        const nextFamily: FamilyInfo = {
            id: snapshot.family.id,
            nome: snapshot.family.nome,
            ownerUserId: snapshot.family.owner_user_id,
            memberCount: snapshot.members.length,
            role: snapshot.membership.role as "owner" | "member",
        };

        setFamily(nextFamily);
        setUser((prev) =>
            prev
                ? {
                    ...prev,
                    familyId: nextFamily.id,
                    familyRole: nextFamily.role,
                    familyName: nextFamily.nome,
                }
                : prev
        );
    }

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
        setFamily(null);
        setFamilyMembers([]);
        setFamilyInvites([]);
        setFamilySnapshot(null);
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

    async function createNewFamily(nome: string) {
        await createFamily(nome);
        await reloadFamily();
    }

    async function sendFamilyInvite(email: string) {
        if (!family?.id) throw new Error("Família não encontrada");
        await inviteFamilyMember(family.id, email);
        await reloadFamily();
    }

    async function cancelFamilyInvite(inviteId: number) {
        await cancelInvite(inviteId);
        await reloadFamily();
    }

    async function removeMemberFromFamily(memberId: number) {
        await removeFamilyMember(memberId);
        await reloadFamily();
    }

    async function transferFamilyOwnership(targetUserId: string) {
        if (!family?.id) throw new Error("Família não encontrada");
        await transferOwnership(family.id, targetUserId);
        await reloadFamily();
    }

    async function leaveCurrentFamily() {
        if (!familySnapshot) throw new Error("Família não encontrada");
        await leaveFamily(familySnapshot);
        await reloadFamily();
    }

    async function deleteCurrentFamily() {
        if (!family?.id) throw new Error("Família não encontrada");
        await deleteFamily(family.id);
        await reloadFamily();
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

    useEffect(() => {
        if (!isLoggedIn) return;
        reloadFamily().catch(() => {
            setFamily(null);
            setFamilyMembers([]);
            setFamilyInvites([]);
            setFamilySnapshot(null);
        });
    }, [isLoggedIn]);

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
                family,
                familyMembers,
                familyInvites,
                reloadFamily,
                createNewFamily,
                sendFamilyInvite,
                cancelFamilyInvite,
                removeMemberFromFamily,
                transferFamilyOwnership,
                leaveCurrentFamily,
                deleteCurrentFamily,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
