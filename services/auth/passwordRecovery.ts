import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { supabase } from "@/services/supabase/client";
import { apiFetch } from "@/services/http/apiFetch";

export const PASSWORD_RESET_SUCCESS_MESSAGE =
    "Se o e-mail estiver cadastrado, voce recebera um link para redefinir a senha.";

export function isLikelyNetworkError(error: unknown): boolean {
    const rawMessage =
        typeof error === "string"
            ? error
            : error && typeof error === "object" && "message" in error
              ? String((error as { message?: unknown }).message ?? "")
              : "";

    const message = rawMessage.toLowerCase();
    return (
        message.includes("network") ||
        message.includes("fetch") ||
        message.includes("timeout") ||
        message.includes("internet") ||
        message.includes("offline")
    );
}

function getTokenValueFromUrl(url: string, key: string): string | null {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`[?#&]${escapedKey}=([^&#]+)`);
    const match = url.match(regex);
    return match ? decodeURIComponent(match[1]) : null;
}

function buildPasswordResetRedirectUrl(): string {
    const envRedirect = process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL?.trim();

    let redirectTo = envRedirect;
    if (!redirectTo) {
        if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.origin) {
            redirectTo = `${window.location.origin}/nova-senha`;
        } else {
            redirectTo = Linking.createURL("/nova-senha");
        }
    }

    if (redirectTo.includes("localghost")) {
        redirectTo = redirectTo.replace("localghost", "localhost");
    }

    return redirectTo;
}

export async function requestPasswordReset(email: string): Promise<void> {
    if (Platform.OS === "web") {
        const res = await apiFetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim() }),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.error || "Falha ao enviar e-mail de recuperacao");
        }
        return;
    }

    const redirectTo = buildPasswordResetRedirectUrl();

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
    });

    if (error) {
        throw new Error(error.message || "Falha ao enviar e-mail de recuperacao");
    }
}

// Web: PKCE ja trocou o code e setou o cookie httpOnly no /api/auth/callback
// ANTES do usuario cair em /nova-senha - so resta confirmar que a sessao
// existe (nao ha token nenhum pra parsear da URL, diferente do nativo).
export async function hasActiveWebSession(): Promise<boolean> {
    const res = await apiFetch("/api/auth/me", { suppressAuthRedirect: true });
    return res.ok;
}

export async function establishRecoverySessionFromUrl(url: string): Promise<void> {
    const accessToken = getTokenValueFromUrl(url, "access_token");
    const refreshToken = getTokenValueFromUrl(url, "refresh_token");
    const type = getTokenValueFromUrl(url, "type");
    const providerError = getTokenValueFromUrl(url, "error_description");

    if (providerError) {
        throw new Error(providerError);
    }

    if (!accessToken || !refreshToken) {
        throw new Error("Link de recuperacao invalido ou expirado");
    }

    if (type && type !== "recovery") {
        throw new Error("Tipo de token invalido para recuperacao de senha");
    }

    const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
    });

    if (error) {
        throw new Error(error.message || "Falha ao validar link de recuperacao");
    }
}

export async function updatePassword(newPassword: string): Promise<void> {
    if (Platform.OS === "web") {
        const res = await apiFetch("/api/auth/update-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: newPassword }),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.error || "Falha ao atualizar senha");
        }
        return;
    }

    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    });

    if (error) {
        throw new Error(error.message || "Falha ao atualizar senha");
    }
}
