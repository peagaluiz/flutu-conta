import { supabase } from "@/services/supabase/client";
import {
	base64ToBytes,
	mapAuthUser,
	mapSessionToUser,
	type AuthUser,
	type LoginPayload,
	type RestoredSession,
} from "./authUser";

// Auth do app nativo: sessão persistida pelo próprio Supabase, com revalidação
// no servidor antes de considerar o usuário logado.

export async function authenticate(data: LoginPayload): Promise<AuthUser | null> {
	const { data: authData, error } = await supabase.auth.signInWithPassword({
		email: data.email,
		password: data.senha,
	});

	if (error) {
		throw error.message || "Falha ao autenticar";
	}

	return mapSessionToUser(authData.session);
}

export async function signOut() {
	await supabase.auth.signOut();
}

export async function restoreSession(): Promise<RestoredSession> {
	const { data, error } = await supabase.auth.getSession();
	if (error) return { status: "anonymous", user: null };

	const localUser = mapSessionToUser(data.session);
	if (!localUser) return { status: "anonymous", user: null };

	// getSession() só lê o storage local — revalida no servidor antes de marcar
	// como logado (senão um token expirado/revogado ainda renderiza a tela
	// autenticada por uma fração de segundo).
	const { data: userData, error: userError } = await supabase.auth.getUser();

	if (userError && userError.name !== "AuthRetryableFetchError") {
		// Erro de verdade do servidor (token inválido/revogado) — só aqui desloga.
		// AuthRetryableFetchError é falha de rede: o app é offline-first, então
		// cai no fallback do usuário local em vez de expulsar quem está sem internet.
		await supabase.auth.signOut().catch(() => {});
		return { status: "anonymous", user: null };
	}

	return {
		status: "authenticated",
		user: userData?.user ? mapAuthUser(userData.user) : localUser,
	};
}

export async function updateProfileName(nome: string) {
	const { error } = await supabase.auth.updateUser({ data: { display_name: nome } });
	if (error) throw error.message || "Falha ao atualizar perfil";
}

export async function uploadAvatar(
	userId: string,
	base64Data: string,
	mimeType: string,
	ext: string
): Promise<string> {
	const fileName = `${userId}.${ext}`;

	const { error: uploadError } = await supabase.storage
		.from("avatars")
		.upload(fileName, base64ToBytes(base64Data), { upsert: true, contentType: mimeType });

	if (uploadError) throw new Error(uploadError.message);

	const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);

	// Cache-bust nos metadados para que o reload do app carregue a URL nova
	// (evita o React Native servir imagem antiga do cache).
	const avatarUrl = `${publicUrl}?t=${Date.now()}`;

	const { error } = await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
	if (error) throw new Error(error.message);

	return avatarUrl;
}

export async function removeAvatar(userId: string) {
	const extensions = ["jpg", "jpeg", "png", "webp"];
	await Promise.allSettled(
		extensions.map((ext) => supabase.storage.from("avatars").remove([`${userId}.${ext}`]))
	);

	const { error } = await supabase.auth.updateUser({ data: { avatar_url: null } });
	if (error) throw new Error(error.message);
}

// Reage a mudanças reais de sessão depois que o app já está rodando.
// INITIAL_SESSION é ignorado: quem trata a abertura é restoreSession(), com
// revalidação via getUser().
export function subscribeToAuthChanges(onChange: (user: AuthUser | null) => void) {
	const {
		data: { subscription },
	} = supabase.auth.onAuthStateChange((event, session) => {
		if (event === "INITIAL_SESSION") return;
		onChange(mapSessionToUser(session));
	});

	return () => subscription.unsubscribe();
}
