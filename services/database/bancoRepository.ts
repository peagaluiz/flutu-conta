import { Platform } from "react-native";
import { supabase } from "@/services/supabase/client";
import { db, nowISO } from "@/services/database/db";

type VisibilityScope = "mine" | "family" | "all";

type VisibilityParams = {
	visibilityScope?: VisibilityScope;
	userId?: string | null;
	familyId?: number | null;
};

export type BancoRow = {
	id_banco: number;
	nome: string;
	cor_hex: string;
	remote_id?: number | null;
	user_id?: string | null;
	family_id?: number | null;
	is_family_shared?: number;
};

async function resolveVisibilityContext(params?: VisibilityParams) {
	if (params?.userId) {
		return {
			scope: params.visibilityScope ?? "all",
			userId: params.userId,
			familyId: params.familyId ?? null,
		};
	}

	const { data } = await supabase.auth.getUser();
	const user = data?.user;
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

function buildSqlVisibilityClause(
	prefix: string,
	visibility: { scope: VisibilityScope; userId: string | null; familyId: number | null }
) {
	if (!visibility.userId) {
		return { where: "1=1", args: [] as Array<string | number> };
	}
	if (visibility.scope === "mine" || !visibility.familyId) {
		return { where: `${prefix}.user_id = ?`, args: [visibility.userId] };
	}
	return {
		where: `(${prefix}.user_id = ? OR ${prefix}.family_id = ?)`,
		args: [visibility.userId, visibility.familyId],
	};
}

function applyWebVisibility(
	query: any,
	visibility: { scope: VisibilityScope; userId: string | null; familyId: number | null }
) {
	if (!visibility.userId) return query;
	if (visibility.scope === "mine" || !visibility.familyId) {
		return query.eq("user_id", visibility.userId);
	}
	return query.or(`user_id.eq.${visibility.userId},family_id.eq.${visibility.familyId}`);
}

export function createBancoRepository() {
	return {
		listBancos: async (params?: VisibilityParams): Promise<BancoRow[]> => {
			const visibility = await resolveVisibilityContext(params);

			if (Platform.OS === "web") {
				let query = supabase
					.from("banco")
					.select("id_banco,nome,cor_hex,user_id,family_id,is_family_shared")
					.eq("deleted", 0)
					.order("nome", { ascending: true });

				query = applyWebVisibility(query, visibility);

				const { data, error } = await query;
				if (error) throw error.message;
				return (data ?? []) as BancoRow[];
			}

			if (!db) return [];

			const sqlVis = buildSqlVisibilityClause("b", visibility);
			const rows = await db.getAllAsync<BancoRow>(
				`
				SELECT id_banco, nome, cor_hex, user_id, family_id, is_family_shared
				FROM banco b
				WHERE b.deleted = 0
				  AND ${sqlVis.where}
				ORDER BY nome ASC
				`,
				...sqlVis.args
			);

			return rows ?? [];
		},

		createBanco: async (
			nome: string,
			cor_hex: string,
			options?: { userId?: string | null; familyId?: number | null; isFamilyShared?: boolean }
		) => {
			const cleanNome = nome.trim();
			if (!cleanNome) throw new Error("Informe um nome para o banco");

			const visibility = await resolveVisibilityContext({
				userId: options?.userId ?? undefined,
				familyId: options?.familyId ?? undefined,
			});
			const resolvedUserId = options?.userId ?? visibility.userId ?? null;
			const resolvedFamilyId = options?.familyId ?? visibility.familyId ?? null;
			const isFamilyShared = Boolean(options?.isFamilyShared && resolvedFamilyId);

			if (Platform.OS === "web") {
				const { data, error } = await supabase
					.from("banco")
					.insert({
						nome: cleanNome,
						cor_hex,
						user_id: resolvedUserId,
						family_id: isFamilyShared ? resolvedFamilyId : null,
						is_family_shared: isFamilyShared ? 1 : 0,
					})
					.select("id_banco")
					.single();

				if (error) throw error.message;
				return { id_banco: data.id_banco };
			}

			if (!db) throw new Error("Banco local indisponivel");

			const result = await db.runAsync(
				`
				INSERT INTO banco (
					nome, cor_hex, user_id, family_id, is_family_shared,
					data_sync, sync_status, synced, deleted
				) VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, 0)
				`,
				cleanNome,
				cor_hex,
				resolvedUserId,
				isFamilyShared ? resolvedFamilyId : null,
				isFamilyShared ? 1 : 0,
				nowISO()
			);

			return { id_banco: Number(result.lastInsertRowId) };
		},

		updateBanco: async (id_banco: number, nome: string, cor_hex: string) => {
			const cleanNome = nome.trim();
			if (!cleanNome) throw new Error("Informe um nome para o banco");

			if (Platform.OS === "web") {
				const { error } = await supabase
					.from("banco")
					.update({ nome: cleanNome, cor_hex })
					.eq("id_banco", id_banco);

				if (error) throw error.message;
				return;
			}

			if (!db) throw new Error("Banco local indisponivel");

			await db.runAsync(
				`
				UPDATE banco
				SET nome = ?, cor_hex = ?, updated_at = ?, data_sync = ?, sync_status = 'pending', synced = 0
				WHERE id_banco = ?
				`,
				cleanNome,
				cor_hex,
				nowISO(),
				nowISO(),
				id_banco
			);
		},

		deleteBanco: async (id_banco: number) => {
			const localNow = nowISO();

			if (Platform.OS === "web") {
				const { error: unlinkError } = await supabase
					.from("transacoes")
					.update({ id_banco: null, updated_at: localNow })
					.eq("id_banco", id_banco);

				if (unlinkError) throw unlinkError.message;

				const { error } = await supabase
					.from("banco")
					.update({ deleted: 1, updated_at: localNow })
					.eq("id_banco", id_banco);

				if (error) throw error.message;
				return;
			}

			if (!db) throw new Error("Banco local indisponivel");

			await db.runAsync(
				`
				UPDATE transacoes
				SET id_banco = NULL, updated_at = ?, sync_status = 'pending', synced = 0
				WHERE id_banco = ? AND deleted = 0
				`,
				localNow,
				id_banco
			);

			await db.runAsync(
				`
				UPDATE banco
				SET deleted = 1, updated_at = ?, data_sync = ?, sync_status = 'pending', synced = 0
				WHERE id_banco = ?
				`,
				localNow,
				localNow,
				id_banco
			);
		},
	};
}
