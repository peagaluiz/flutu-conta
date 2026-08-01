import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Platform } from "react-native";
import { supabase } from "@/services/supabase/client";
import { apiFetch, resetApiFetchRedirectGuard } from "@/services/http/apiFetch";
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

function mapAuthUser(authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined): User | null {
    if (!authUser) return null;

    return {
        id: authUser.id,
        email: authUser.email ?? null,
        nome:
            (authUser.user_metadata?.display_name as string | undefined) ??
            (authUser.user_metadata?.nome as string | undefined) ??
            null,
        avatarUrl:
            (authUser.user_metadata?.avatar_url as string | undefined) ??
            (authUser.user_metadata?.picture as string | undefined) ??
            (authUser.user_metadata?.photo_url as string | undefined) ??
            null,
    };
}

function mapSessionToUser(session: Session | null): User | null {
    return mapAuthUser(session?.user ?? null);
}

function base64ToBytes(base64Data: string): Uint8Array {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// Web: /auth/me revalida no servidor (getUser(), nunca getSession()) -
// suppressAuthRedirect pq um 401 aqui e o caso normal de "nao logado", nao
// uma sessao expirando no meio do uso.
async function fetchWebUser(): Promise<User | null> {
    const res = await apiFetch("/api/auth/me", { suppressAuthRedirect: true });
    if (!res.ok) return null;
    const body = await res.json();
    return mapAuthUser(body.user);
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
        if (Platform.OS === "web") {
            // suppressAuthRedirect: um 401 aqui e "senha errada", nao sessao
            // expirando - nao queremos o redirect automatico do apiFetch.
            const res = await apiFetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: data.email, senha: data.senha }),
                suppressAuthRedirect: true,
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.error || "Falha ao autenticar");
            }

            resetApiFetchRedirectGuard();
            setUser(await fetchWebUser());
            setIsLoggedIn(true);
            setIsReady(true);

            router.replace("/");
            return true;
        }

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
        if (Platform.OS === "web") {
            await apiFetch("/api/auth/logout", {
                method: "POST",
                suppressAuthRedirect: true,
            }).catch(() => {});
        } else {
            await supabase.auth.signOut();
        }

        resetApiFetchRedirectGuard();
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

        if (Platform.OS === "web") {
            const res = await apiFetch("/api/auth/update-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: { display_name: nome } }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.error || "Falha ao atualizar perfil");
            }
            setUser((prev) => (prev ? { ...prev, nome } : null));
            return;
        }

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

        if (Platform.OS === "web") {
            // Storage NAO passa pelo proxy /db (limite de 4.5MB de payload da
            // Vercel) - upload direto do browser via signed upload URL.
            const signRes = await apiFetch("/api/avatar/sign-upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ext }),
            });
            if (!signRes.ok) {
                const body = await signRes.json().catch(() => ({}));
                throw new Error(body?.error || "Falha ao preparar upload");
            }
            const { signedUrl, publicUrl } = await signRes.json();

            const uploadRes = await fetch(signedUrl, {
                method: "PUT",
                headers: {
                    "x-upsert": "true",
                    "cache-control": "max-age=3600",
                    "content-type": mimeType,
                },
                body: base64ToBytes(base64Data) as BodyInit,
            });
            if (!uploadRes.ok) throw new Error("Falha ao enviar imagem");

            const avatarUrl = `${publicUrl}?t=${Date.now()}`;

            const res = await apiFetch("/api/auth/update-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: { avatar_url: avatarUrl } }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.error || "Falha ao salvar avatar");
            }

            setUser((prev) => (prev ? { ...prev, avatarUrl } : null));
            return;
        }

        const fileName = `${user.id}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(fileName, base64ToBytes(base64Data), { upsert: true, contentType: mimeType });

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

        if (Platform.OS === "web") {
            await apiFetch("/api/avatar/remove", { method: "POST" }).catch(() => {});

            const res = await apiFetch("/api/auth/update-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: { avatar_url: null } }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.error || "Falha ao remover avatar");
            }

            setUser((prev) => (prev ? { ...prev, avatarUrl: null } : null));
            return;
        }

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
        // Web: sem onAuthStateChange (persistSession:false -> nao ha sessao
        // local pra observar; a fonte da verdade e /auth/me + os cookies).
        // Registrar o listener aqui causaria um SIGNED_OUT espurio.
        if (Platform.OS === "web") {
            (async () => {
                try {
                    const me = await fetchWebUser();
                    if (me) {
                        setUser(me);
                        setIsLoggedIn(true);
                    } else {
                        setIsLoggedIn(false);
                        setFamilyReady(true);
                    }
                } catch {
                    setIsLoggedIn(false);
                    setFamilyReady(true);
                } finally {
                    setIsReady(true);
                }
            })();
            return;
        }

        async function init() {
            const { data, error } = await supabase.auth.getSession();
            if (error) {
                setIsLoggedIn(false);
                setFamilyReady(true);
                setIsReady(true);
                return;
            }

            const localUser = mapSessionToUser(data.session);
            if (!localUser) {
                setFamilyReady(true);
                setIsReady(true);
                return;
            }

            // getSession() so le o storage local - revalida no servidor antes
            // de marcar como logado (senao um token expirado/revogado ainda
            // renderiza a tela autenticada por uma fracao de segundo).
            const { data: userData, error: userError } = await supabase.auth.getUser();

            if (userError && userError.name !== "AuthRetryableFetchError") {
                // Erro de verdade do servidor (token invalido/revogado) - so
                // aqui desloga. AuthRetryableFetchError e falha de rede: o
                // app e offline-first, entao cai no fallback do usuario local
                // em vez de expulsar quem simplesmente esta sem internet.
                await supabase.auth.signOut().catch(() => {});
                setUser(null);
                setIsLoggedIn(false);
                setFamilyReady(true);
                setIsReady(true);
                return;
            }

            setUser(userData?.user ? mapAuthUser(userData.user) : localUser);
            setIsLoggedIn(true);
            setIsReady(true);
        }

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            // INITIAL_SESSION e tratado por init() (com revalidacao via
            // getUser()) - aqui so reage a mudancas reais depois que o app ja
            // esta rodando, senao a sessao local (nao revalidada) vence a
            // corrida contra o init() e pisca tela autenticada indevidamente.
            if (event === "INITIAL_SESSION") return;

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
        setCurrentUserCache(user);
    }, [user]);

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
