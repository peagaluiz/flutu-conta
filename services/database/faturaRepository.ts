import { Platform } from "react-native";
import { supabase } from "@/services/supabase/client";
import { db, nowISO } from "@/services/database/db";
import { getCurrentUserCache } from "@/services/auth/currentUserCache";

type VisibilityScope = "mine" | "family" | "all";

type VisibilityParams = {
	visibilityScope?: VisibilityScope;
	userId?: string | null;
	familyId?: number | null;
};

export type FaturaRow = {
	id_fatura: number;
	id_banco: number;
	mes_referencia: string;
	data_fechamento?: string | null;
	data_vencimento?: string | null;
	valor_total: number;
	status: string;
	id_transacao_pagamento?: number | null;
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

export function createFaturaRepository() {
	return {
		listFaturas: async (params?: VisibilityParams): Promise<FaturaRow[]> => {
			const visibility = await resolveVisibilityContext(params);

			if (Platform.OS === "web") {
				let query = supabase
					.from("cartao_faturas")
					.select("*")
					.eq("deleted", 0)
					.order("mes_referencia", { ascending: false });
				query = applyWebVisibility(query, visibility);
				const { data, error } = await query;
				if (error) throw error.message;
				return (data ?? []) as FaturaRow[];
			}

			if (!db) return [];
			const sqlVis = buildSqlVisibilityClause("f", visibility);
			const rows = await db.getAllAsync<FaturaRow>(
				`
				SELECT f.*
				FROM cartao_faturas f
				WHERE f.deleted = 0
				  AND ${sqlVis.where}
				ORDER BY f.mes_referencia DESC
				`,
				...sqlVis.args
			);
			return rows ?? [];
		},

		getFaturaById: async (idFatura: number): Promise<FaturaRow | null> => {
			if (Platform.OS === "web") {
				const { data, error } = await supabase
					.from("cartao_faturas")
					.select("*")
					.eq("id_fatura", idFatura)
					.maybeSingle();
				if (error) throw error.message;
				return (data as FaturaRow) ?? null;
			}
			if (!db) return null;
			const row = await db.getFirstAsync<FaturaRow>(
				`SELECT * FROM cartao_faturas WHERE id_fatura = ? AND deleted = 0 LIMIT 1`,
				idFatura
			);
			return row ?? null;
		},

		// Busca (sem criar) a fatura de um cartão num mês de referência.
		findFaturaByMes: async (idBanco: number, mesReferencia: string): Promise<FaturaRow | null> => {
			if (Platform.OS === "web") {
				// limit(1) em vez de maybeSingle: tolera faturas duplicadas (mesmo
				// banco+mês) sem estourar erro de "múltiplas linhas".
				const { data, error } = await supabase
					.from("cartao_faturas")
					.select("*")
					.eq("id_banco", idBanco)
					.eq("mes_referencia", mesReferencia)
					.eq("deleted", 0)
					.order("id_fatura", { ascending: true })
					.limit(1);
				if (error) throw error.message;
				return ((data?.[0] as FaturaRow) ?? null);
			}
			if (!db) return null;
			const row = await db.getFirstAsync<FaturaRow>(
				`SELECT * FROM cartao_faturas WHERE id_banco = ? AND mes_referencia = ? AND deleted = 0 LIMIT 1`,
				idBanco,
				mesReferencia
			);
			return row ?? null;
		},

		// Acha a fatura (id_banco, mes_referencia) ou cria uma nova.
		findOrCreateFatura: async (opts: {
			idBanco: number;
			mesReferencia: string;
			dataFechamento?: string | null;
			dataVencimento?: string | null;
			userId?: string | null;
			familyId?: number | null;
			isFamilyShared?: boolean;
		}): Promise<number> => {
			const {
				idBanco,
				mesReferencia,
				dataFechamento = null,
				dataVencimento = null,
				userId = null,
				familyId = null,
				isFamilyShared = false,
			} = opts;
			const sharedFamilyId = isFamilyShared && familyId ? familyId : null;

			if (Platform.OS === "web") {
				// limit(1) em vez de maybeSingle: se já houver fatura(s) para o mês,
				// reaproveita a mais antiga; maybeSingle estouraria com duplicatas.
				const { data: existingRows, error: findError } = await supabase
					.from("cartao_faturas")
					.select("id_fatura")
					.eq("id_banco", idBanco)
					.eq("mes_referencia", mesReferencia)
					.eq("deleted", 0)
					.order("id_fatura", { ascending: true })
					.limit(1);
				if (findError) throw findError.message;
				const existing = existingRows?.[0];
				if (existing?.id_fatura) return existing.id_fatura;

				const { data: inserted, error } = await supabase
					.from("cartao_faturas")
					.insert({
						id_banco: idBanco,
						mes_referencia: mesReferencia,
						data_fechamento: dataFechamento,
						data_vencimento: dataVencimento,
						status: "aberta",
						user_id: userId,
						family_id: sharedFamilyId,
						is_family_shared: isFamilyShared ? 1 : 0,
					})
					.select("id_fatura")
					.single();
				if (error) throw error.message;
				return inserted.id_fatura;
			}

			if (!db) throw new Error("Banco local indisponivel");
			const existing = await db.getFirstAsync<{ id_fatura: number }>(
				`SELECT id_fatura FROM cartao_faturas WHERE id_banco = ? AND mes_referencia = ? AND deleted = 0 LIMIT 1`,
				idBanco,
				mesReferencia
			);
			if (existing?.id_fatura) return existing.id_fatura;

			const result = await db.runAsync(
				`
				INSERT INTO cartao_faturas (
					id_banco, mes_referencia, data_fechamento, data_vencimento, valor_total,
					status, user_id, family_id, is_family_shared,
					data_sync, sync_status, synced, deleted
				) VALUES (?, ?, ?, ?, 0, 'aberta', ?, ?, ?, ?, 'pending', 0, 0)
				`,
				idBanco,
				mesReferencia,
				dataFechamento,
				dataVencimento,
				userId,
				sharedFamilyId,
				isFamilyShared ? 1 : 0,
				nowISO()
			);
			return Number(result.lastInsertRowId);
		},

		// Recalcula o total da fatura a partir das transações vinculadas (pagar soma, receber abate).
		recalcFaturaTotal: async (idFatura: number) => {
			if (Platform.OS === "web") {
				const { data, error } = await supabase
					.from("transacoes")
					.select("tipo, valor")
					.eq("id_fatura", idFatura)
					.eq("deleted", 0);
				if (error) throw error.message;
				const total = (data ?? []).reduce(
					(sum: number, t: any) =>
						sum + (t.tipo === "receber" ? -Number(t.valor || 0) : Number(t.valor || 0)),
					0
				);
				const { error: updError } = await supabase
					.from("cartao_faturas")
					.update({ valor_total: total })
					.eq("id_fatura", idFatura);
				if (updError) throw updError.message;
				return total;
			}

			if (!db) throw new Error("Banco local indisponivel");
			const row = await db.getFirstAsync<{ total: number }>(
				`
				SELECT COALESCE(SUM(CASE WHEN tipo = 'receber' THEN -valor ELSE valor END), 0) AS total
				FROM transacoes
				WHERE id_fatura = ? AND deleted = 0
				`,
				idFatura
			);
			const total = Number(row?.total ?? 0);
			await db.runAsync(
				`UPDATE cartao_faturas
				 SET valor_total = ?, updated_at = ?, sync_status = 'pending', synced = 0
				 WHERE id_fatura = ?`,
				total,
				nowISO(),
				idFatura
			);
			return total;
		},

		marcarFaturaPaga: async (idFatura: number, idTransacaoPagamento?: number | null) => {
			if (Platform.OS === "web") {
				const { error } = await supabase
					.from("cartao_faturas")
					.update({ status: "paga", id_transacao_pagamento: idTransacaoPagamento ?? null })
					.eq("id_fatura", idFatura);
				if (error) throw error.message;
				return;
			}
			if (!db) throw new Error("Banco local indisponivel");
			await db.runAsync(
				`UPDATE cartao_faturas
				 SET status = 'paga', id_transacao_pagamento = ?, updated_at = ?, sync_status = 'pending', synced = 0
				 WHERE id_fatura = ?`,
				idTransacaoPagamento ?? null,
				nowISO(),
				idFatura
			);
		},
	};
}
