import { Session } from "@supabase/supabase-js";

export type AuthUser = {
	id: string;
	email: string | null;
	nome?: string | null;
	avatarUrl?: string | null;
	familyId?: number | null;
	familyRole?: "owner" | "member" | null;
	familyName?: string | null;
};

export type LoginPayload = {
	email: string;
	senha: string;
};

// Resultado da restauração de sessão na abertura do app.
export type RestoredSession = {
	status: "authenticated" | "anonymous";
	user: AuthUser | null;
};

export function mapAuthUser(
	authUser:
		| { id: string; email?: string | null; user_metadata?: Record<string, unknown> }
		| null
		| undefined
): AuthUser | null {
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

export function mapSessionToUser(session: Session | null): AuthUser | null {
	return mapAuthUser(session?.user ?? null);
}

export function base64ToBytes(base64Data: string): Uint8Array {
	const binaryString = atob(base64Data);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes;
}
