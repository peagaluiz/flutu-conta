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
    acceptFamilyInviteById,
    cancelInvite,
    createFamily,
    declineFamilyInviteById,
    deleteFamily,
    FamilyInvite,
    FamilyMember,
    FamilySnapshot,
    getFamilySnapshot,
    inviteFamilyMember,
    leaveFamily,
    PendingInvite,
    removeFamilyMember,
    transferOwnership,
} from "@/services/supabase/familyRepository";
import { clearReadCache } from "@/services/database/readCache";

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
    const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
    const [familyReady, setFamilyReady] = useState(false);
    const router = useRouter();

    async function reloadFamily() {
        setFamilyReady(false);
        try {
            if (!isLoggedIn) {
                setFamily(null);
                setFamilyMembers([]);
                setFamilyInvites([]);
                setFamilySnapshot(null);
                setPendingInvite(null);
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

            const snapshot = await getFamilySnapshot(user?.id);
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
                setPendingInvite(snapshot.pendingInvite);
                return;
            }

            setPendingInvite(null);

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
        } finally {
            setFamilyReady(true);
        }
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
        clearReadCache();
        setUser(null);
        setFamily(null);
        setFamilyMembers([]);
        setFamilyInvites([]);
        setFamilySnapshot(null);
        setPendingInvite(null);
        setFamilyReady(false);
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

    async function updateUserAvatar(base64Data: string, mimeType: string = "image/jpeg") {
        if (!user) throw new Error("Usuário não autenticado");

        const ext = mimeType === "image/png" ? "png" : "jpg";
        const fileName = `${user.id}.${ext}`;

        // base64 → Uint8Array (sem fetch de URI local, que falha no React Native)
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(fileName, bytes, { upsert: true, contentType: mimeType });

        if (uploadError) throw new Error(uploadError.message);

        const { data: { publicUrl } } = supabase.storage
            .from("avatars")
            .getPublicUrl(fileName);

        // Salva com cache-bust nos metadados para que o reload do app
        // carregue a URL nova (evita o React Native servir imagem antiga do cache)
        const avatarUrl = `${publicUrl}?t=${Date.now()}`;

        const { error } = await supabase.auth.updateUser({
            data: { avatar_url: avatarUrl },
        });

        if (error) throw new Error(error.message);

        setUser((prev) => (prev ? { ...prev, avatarUrl } : null));
    }

    async function removeUserAvatar() {
        if (!user) throw new Error("Usuário não autenticado");

        const extensions = ["jpg", "jpeg", "png", "webp"];
        await Promise.allSettled(
            extensions.map((ext) =>
                supabase.storage.from("avatars").remove([`${user.id}.${ext}`])
            )
        );

        const { error } = await supabase.auth.updateUser({
            data: { avatar_url: null },
        });

        if (error) throw new Error(error.message);

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

    async function acceptPendingInvite() {
        if (!pendingInvite) throw new Error("Nenhum convite pendente");
        await acceptFamilyInviteById(pendingInvite.id, pendingInvite.family_id);
        await reloadFamily();
    }

    async function declinePendingInvite() {
        if (!pendingInvite) throw new Error("Nenhum convite pendente");
        await declineFamilyInviteById(pendingInvite.id);
        setPendingInvite(null);
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
            } else {
                setFamilyReady(true);
            }

            setIsReady(true);
        }

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            const nextUser = mapSessionToUser(session);
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
                updateUserAvatar,
                removeUserAvatar,
                requestPasswordReset,
                establishRecoverySessionFromUrl,
                updatePassword,
                family,
                familyMembers,
                familyInvites,
                pendingInvite,
                familyReady,
                reloadFamily,
                createNewFamily,
                sendFamilyInvite,
                cancelFamilyInvite,
                removeMemberFromFamily,
                transferFamilyOwnership,
                leaveCurrentFamily,
                deleteCurrentFamily,
                acceptPendingInvite,
                declinePendingInvite,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
