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
	tipo?: string | null;
	is_corrente?: number;
	is_cartao?: number;
	dia_fechamento?: number | null;
	dia_vencimento?: number | null;
	remote_id?: number | null;
	user_id?: string | null;
	family_id?: number | null;
	is_family_shared?: number;
};

type CartaoConfig = {
	isCorrente?: boolean;
	isCartao?: boolean;
	diaFechamento?: number | null;
	diaVencimento?: number | null;
};

// Deriva os campos físicos a partir da config de marcadores.
function resolveBancoFlags(config?: CartaoConfig) {
	const isCorrente = config?.isCorrente ?? true;
	const isCartao = Boolean(config?.isCartao);
	const diaFechamento = isCartao ? config?.diaFechamento ?? null : null;
	const diaVencimento = isCartao ? config?.diaVencimento ?? null : null;
	// tipo legado, mantido só por compat
	const tipo = isCartao && !isCorrente ? "cartao_credito" : "corrente";
	return { isCorrente: isCorrente ? 1 : 0, isCartao: isCartao ? 1 : 0, diaFechamento, diaVencimento, tipo };
}

async function resolveVisibilityContext(params?: VisibilityParams) {
	if (params?.userId) {
		return {
			scope: params.visibilityScope ?? "all",
			userId: params.userId,
			familyId: params.familyId ?? null,
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

async function bancoExistsByName(
	nome: string,
	userId: string | null,
	visibility: { userId: string | null }
): Promise<boolean> {
	const target = nome.trim().toLowerCase();
	if (!target) return false;

	if (Platform.OS === "web") {
		let query = supabase
			.from("banco")
			.select("id_banco")
			.eq("deleted", 0)
			.ilike("nome", target)
			.limit(1);
		if (userId ?? visibility.userId) query = query.eq("user_id", userId ?? visibility.userId);
		const { data, error } = await query;
		if (error) throw error.message;
		return (data ?? []).length > 0;
	}

	if (!db) return false;
	const owner = userId ?? visibility.userId ?? null;
	const row = await db.getFirstAsync<{ id_banco: number }>(
		`SELECT id_banco FROM banco
		 WHERE deleted = 0 AND LOWER(TRIM(nome)) = ?
		   AND (? IS NULL OR user_id = ?)
		 LIMIT 1`,
		target,
		owner,
		owner
	);
	return !!row;
}

export function createBancoRepository() {
	return {
		listBancos: async (params?: VisibilityParams): Promise<BancoRow[]> => {
			const visibility = await resolveVisibilityContext(params);

			if (Platform.OS === "web") {
				let query = supabase
					.from("banco")
					.select("id_banco,nome,cor_hex,tipo,is_corrente,is_cartao,dia_fechamento,dia_vencimento,user_id,family_id,is_family_shared")
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
				SELECT id_banco, nome, cor_hex, tipo, is_corrente, is_cartao, dia_fechamento, dia_vencimento, user_id, family_id, is_family_shared
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
			options?: { userId?: string | null; familyId?: number | null; isFamilyShared?: boolean } & CartaoConfig
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
			const flags = resolveBancoFlags(options);

			// Bloqueia banco duplicado (mesmo nome, não deletado, do mesmo usuário)
			const exists = await bancoExistsByName(cleanNome, resolvedUserId, visibility);
			if (exists) throw new Error("Já existe um banco com esse nome.");

			if (Platform.OS === "web") {
				const { data, error } = await supabase
					.from("banco")
					.insert({
						nome: cleanNome,
						cor_hex,
						tipo: flags.tipo,
						is_corrente: flags.isCorrente,
						is_cartao: flags.isCartao,
						dia_fechamento: flags.diaFechamento,
						dia_vencimento: flags.diaVencimento,
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
					nome, cor_hex, tipo, is_corrente, is_cartao, dia_fechamento, dia_vencimento, user_id, family_id, is_family_shared,
					data_sync, sync_status, synced, deleted
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, 0)
				`,
				cleanNome,
				cor_hex,
				flags.tipo,
				flags.isCorrente,
				flags.isCartao,
				flags.diaFechamento,
				flags.diaVencimento,
				resolvedUserId,
				isFamilyShared ? resolvedFamilyId : null,
				isFamilyShared ? 1 : 0,
				nowISO()
			);

			return { id_banco: Number(result.lastInsertRowId) };
		},

		updateBanco: async (
			id_banco: number,
			nome: string,
			cor_hex: string,
			config?: CartaoConfig
		) => {
			const cleanNome = nome.trim();
			if (!cleanNome) throw new Error("Informe um nome para o banco");

			const flags = resolveBancoFlags(config);

			if (Platform.OS === "web") {
				const { error } = await supabase
					.from("banco")
					.update({
						nome: cleanNome,
						cor_hex,
						tipo: flags.tipo,
						is_corrente: flags.isCorrente,
						is_cartao: flags.isCartao,
						dia_fechamento: flags.diaFechamento,
						dia_vencimento: flags.diaVencimento,
					})
					.eq("id_banco", id_banco);

				if (error) throw error.message;
				return;
			}

			if (!db) throw new Error("Banco local indisponivel");

			await db.runAsync(
				`
				UPDATE banco
				SET nome = ?, cor_hex = ?, tipo = ?, is_corrente = ?, is_cartao = ?, dia_fechamento = ?, dia_vencimento = ?,
				    updated_at = ?, data_sync = ?, sync_status = 'pending', synced = 0
				WHERE id_banco = ?
				`,
				cleanNome,
				cor_hex,
				flags.tipo,
				flags.isCorrente,
				flags.isCartao,
				flags.diaFechamento,
				flags.diaVencimento,
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
