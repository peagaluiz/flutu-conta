import { apiFetch, resetApiFetchRedirectGuard } from "@/services/http/apiFetch";
import {
	base64ToBytes,
	mapAuthUser,
	type AuthUser,
	type LoginPayload,
	type RestoredSession,
} from "./authUser";

// Auth da versão web: nada de sessão local do Supabase. A fonte da verdade são
// os cookies + o proxy /api, que revalida no servidor a cada request.

// suppressAuthRedirect: um 401 aqui é o caso normal de "não logado", não uma
// sessão expirando no meio do uso.
async function fetchWebUser(): Promise<AuthUser | null> {
	const res = await apiFetch("/api/auth/me", { suppressAuthRedirect: true });
	if (!res.ok) return null;
	const body = await res.json();
	return mapAuthUser(body.user);
}

async function updateUserMetadata(data: Record<string, unknown>, errorMessage: string) {
	const res = await apiFetch("/api/auth/update-user", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ data }),
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body?.error || errorMessage);
	}
}

export async function authenticate(data: LoginPayload): Promise<AuthUser | null> {
	// suppressAuthRedirect: um 401 aqui é "senha errada", não sessão expirando.
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
	return fetchWebUser();
}

export async function signOut() {
	await apiFetch("/api/auth/logout", {
		method: "POST",
		suppressAuthRedirect: true,
	}).catch(() => {});
}

export async function restoreSession(): Promise<RestoredSession> {
	try {
		const me = await fetchWebUser();
		if (me) return { status: "authenticated", user: me };
		return { status: "anonymous", user: null };
	} catch {
		return { status: "anonymous", user: null };
	}
}

export async function updateProfileName(nome: string) {
	await updateUserMetadata({ display_name: nome }, "Falha ao atualizar perfil");
}

export async function uploadAvatar(
	_userId: string,
	base64Data: string,
	mimeType: string,
	ext: string
): Promise<string> {
	// Storage não passa pelo proxy /db (limite de 4.5MB de payload da Vercel) —
	// upload direto do browser via signed upload URL.
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
	await updateUserMetadata({ avatar_url: avatarUrl }, "Falha ao salvar avatar");
	return avatarUrl;
}

export async function removeAvatar(_userId: string) {
	await apiFetch("/api/avatar/remove", { method: "POST" }).catch(() => {});
	await updateUserMetadata({ avatar_url: null }, "Falha ao remover avatar");
}

export function subscribeToAuthChanges() {
	// Web não observa sessão local (persistSession: false) — registrar o listener
	// aqui geraria um SIGNED_OUT espúrio.
	return () => {};
}
