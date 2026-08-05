import { Platform } from "react-native";
import { supabase } from "@/services/supabase/client";
import { getCurrentUserCache } from "@/services/auth/currentUserCache";

// Regra única de visibilidade usuário/família, compartilhada pelos repositórios.
// Antes estava copiada em transacoes/manage/recurrence/banco/fatura.

export type VisibilityScope = "mine" | "family" | "all";

export type VisibilityParams = {
	visibilityScope?: VisibilityScope;
	userId?: string | null;
	familyId?: number | null;
};

export type VisibilityContext = {
	scope: VisibilityScope;
	userId: string | null;
	familyId: number | null;
};

// `strictFamily: false` mantém o comportamento herdado de bancos/faturas, onde o
// escopo "família" também traz os registros próprios do usuário.
type VisibilityOptions = { strictFamily?: boolean };

export async function resolveVisibilityContext(
	params?: VisibilityParams
): Promise<VisibilityContext> {
	if (params?.userId) {
		return {
			scope: params.visibilityScope ?? "all",
			userId: params.userId,
			familyId: params.familyId ?? null,
		};
	}

	if (Platform.OS === "web") {
		const cached = getCurrentUserCache();
		return {
			scope: params?.visibilityScope ?? "all",
			userId: cached.id,
			familyId: cached.familyId,
		};
	}

	const { data } = await supabase.auth.getSession();
	const user = data?.session?.user;
	const metadataFamilyId = Number(
		(user?.user_metadata?.family_id as number | string | undefined) ??
		(user?.app_metadata?.family_id as number | string | undefined) ??
		0
	);

	return {
		scope: params?.visibilityScope ?? "all",
		userId: user?.id || null,
		familyId: Number.isFinite(metadataFamilyId) && metadataFamilyId > 0 ? metadataFamilyId : null,
	};
}

export type OwnershipOptions = {
	userId?: string | null;
	familyId?: number | null;
	isFamilyShared?: boolean;
};

// Dono/família de um registro novo: usa o que o chamador informou e completa com a sessão.
export async function resolveOwnership(options?: OwnershipOptions) {
	const visibility = await resolveVisibilityContext({
		userId: options?.userId ?? undefined,
		familyId: options?.familyId ?? undefined,
	});
	const userId = options?.userId ?? visibility.userId ?? null;
	const familyId = options?.familyId ?? visibility.familyId ?? null;
	const isFamilyShared = Boolean(options?.isFamilyShared && familyId);

	return { userId, familyId: isFamilyShared ? familyId : null, isFamilyShared };
}

function onlyFamilyRows(visibility: VisibilityContext, options?: VisibilityOptions) {
	return (
		visibility.scope === "family" &&
		!!visibility.familyId &&
		(options?.strictFamily ?? true)
	);
}

export function buildSqlVisibilityClause(
	prefix: string,
	visibility: VisibilityContext,
	options?: VisibilityOptions
): { where: string; args: Array<string | number> } {
	if (!visibility.userId) {
		return { where: "1=1", args: [] };
	}

	if (visibility.scope === "mine" || !visibility.familyId) {
		return { where: `${prefix}.user_id = ?`, args: [visibility.userId] };
	}

	if (onlyFamilyRows(visibility, options)) {
		return { where: `${prefix}.family_id = ?`, args: [visibility.familyId] };
	}

	return {
		where: `(${prefix}.user_id = ? OR ${prefix}.family_id = ?)`,
		args: [visibility.userId, visibility.familyId],
	};
}

export function applySupabaseVisibility(
	query: any,
	visibility: VisibilityContext,
	options?: VisibilityOptions
) {
	if (!visibility.userId) return query;

	if (visibility.scope === "mine" || !visibility.familyId) {
		return query.eq("user_id", visibility.userId);
	}

	if (onlyFamilyRows(visibility, options)) {
		return query.eq("family_id", visibility.familyId);
	}

	return query.or(`user_id.eq.${visibility.userId},family_id.eq.${visibility.familyId}`);
}
