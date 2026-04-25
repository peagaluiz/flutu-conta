import { Platform } from "react-native";
import { supabase } from "@/services/supabase/client";
import { db, nowISO } from "@/services/database/db";
import { ImobilizadoRow, TransacaoDatabase } from "@/services/database/types";
import {
	activateRecorrencia,
	createRecurrenceFromNewTransaction,
	deleteRecorrencia,
	listRecorrencias,
	pauseRecorrencia,
	type RecurrenceCreateConfig,
	validateAndGeneratePendingRecurrences,
} from "@/services/database/recurrenceService";
import {
	fetchRemoteTransacaoById,
	syncAllPendingData,
	syncPendingTransacoes,
	upsertRemoteTransacaoLocally,
} from "@/services/database/transacoesSync";

type VisibilityScope = "mine" | "family" | "all";

async function resolveVisibilityContext(params?: {
	visibilityScope?: VisibilityScope;
	userId?: string | null;
	familyId?: number | null;
}) {
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

function applySupabaseVisibility(query: any, visibility: { scope: VisibilityScope; userId: string | null; familyId: number | null }) {
	if (!visibility.userId) return query;

	if (visibility.scope === "mine") {
		return query.eq("user_id", visibility.userId);
	}

	if (visibility.scope === "family") {
		if (!visibility.familyId) {
			return query.eq("user_id", visibility.userId);
		}

		return query.eq("family_id", visibility.familyId);
	}

	if (!visibility.familyId) {
		return query.eq("user_id", visibility.userId);
	}

	return query.or(`user_id.eq.${visibility.userId},family_id.eq.${visibility.familyId}`);
}

function buildSqliteVisibilityClause(visibility: { scope: VisibilityScope; userId: string | null; familyId: number | null }) {
	if (!visibility.userId) {
		return { where: "1=1", args: [] as Array<string | number> };
	}

	if (visibility.scope === "mine") {
		return { where: "t.user_id = ?", args: [visibility.userId] };
	}

	if (visibility.scope === "family") {
		if (!visibility.familyId) {
			return { where: "t.user_id = ?", args: [visibility.userId] };
		}

		return { where: "t.family_id = ?", args: [visibility.familyId] };
	}

	if (!visibility.familyId) {
		return { where: "t.user_id = ?", args: [visibility.userId] };
	}

	return {
		where: "(t.user_id = ? OR t.family_id = ?)",
		args: [visibility.userId, visibility.familyId],
	};
}

function normalizeTransacaoPessoa<
	T extends {
		pessoa?: string | null;
		pessoa_rel?: { nome?: string | null } | null;
		family_id?: number | null;
		is_family_shared?: number | boolean | null;
	}
>(row: T, fallbackFamilyId?: number | null) {
	const { pessoa_rel, ...rest } = row as T & { pessoa_rel?: { nome?: string | null } | null };
	const shouldFallbackFamily =
		(rest.family_id == null || Number(rest.family_id) <= 0) &&
		Number(rest.is_family_shared ?? 0) === 1 &&
		Number(fallbackFamilyId ?? 0) > 0;

	return {
		...rest,
		pessoa: pessoa_rel?.nome ?? rest.pessoa ?? null,
		family_id: shouldFallbackFamily ? Number(fallbackFamilyId) : rest.family_id ?? null,
	};
}

async function insertTransacaoLocal(
	data: Omit<TransacaoDatabase, "id_transacao" | "created_at" | "updated_at">
) {
	if (!db) throw new Error("Banco local indisponivel");

	const insertResult = await db.runAsync(
		`
      INSERT INTO transacoes (
        remote_id,
        tipo,
        valor,
        categoria,
        id_pessoa,
        pessoa,
        id_imobilizado,
		family_id,
		is_family_shared,
		user_id,
        data_transacao,
        data_vencimento,
        status,
        observacao,
        json,
        created_at,
        updated_at,
        data_sync,
        sync_status,
        synced,
        deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
		null,
		data.tipo,
		data.valor,
		data.categoria,
		data.id_pessoa ?? null,
		data.pessoa ?? null,
		data.id_imobilizado ?? null,
		data.family_id ?? null,
		Number(data.is_family_shared ?? 0),
		data.user_id ?? null,
		data.data_transacao ?? nowISO(),
		data.data_vencimento ?? null,
		data.status ?? "pendente",
		data.observacao ?? null,
		data.json ?? null,
		nowISO(),
		null,
		null,
		"pending",
		0,
		0
	);

	return { insertId: String(insertResult.lastInsertRowId), skipped: false };
}

export function createTransacoesRepository() {
	return {
		createTransacao: async (
			data: Omit<TransacaoDatabase, "id_transacao" | "created_at" | "updated_at">
		) => {
			const visibility = await resolveVisibilityContext();
			const payload = {
				...data,
				user_id: data.user_id ?? visibility.userId ?? null,
			};

			if (Platform.OS === "web") {
				const webPayload = {
					...payload,
					updated_at: null,
				};

				const { data: inserted, error } = await supabase
					.from("transacoes")
					.insert(webPayload)
					.select("id_transacao")
					.single();

				if (error) throw error.message;

				return { insertId: String(inserted.id_transacao) };
			}

			if (!db) throw new Error("Banco local indisponivel");

			const insertResult = await insertTransacaoLocal(payload);

			return { insertId: String(insertResult.insertId) };
		},

		createRecurringTransacoes: async (
			data: Omit<TransacaoDatabase, "id_transacao" | "created_at" | "updated_at">,
			recurrence: RecurrenceCreateConfig
		) => {
			if (!db || Platform.OS === "web") {
				throw new Error("Recorrencia disponivel somente no banco local no app movel");
			}

			const visibility = await resolveVisibilityContext();
			const dueDate =
				(data.data_vencimento && /^\d{4}-\d{2}-\d{2}$/.test(String(data.data_vencimento))
					? String(data.data_vencimento)
					: String(nowISO()).slice(0, 10));

			const seedPayload = {
				...data,
				user_id: data.user_id ?? visibility.userId ?? null,
				data_vencimento: dueDate,
				data_transacao: data.data_transacao ?? nowISO(),
			};

			const insertResult = await insertTransacaoLocal(seedPayload);
			const insertedId = Number(insertResult.insertId);

			const recurrenceResult = await createRecurrenceFromNewTransaction({
				seedTransacaoId: insertedId,
				data: seedPayload,
				recurrence,
			});

			return { created: 1, ids: [String(insertedId)], recurrenceUuid: recurrenceResult.uuid };
		},

		updateTransacao: async (
			id_transacao: number,
			data: Partial<Omit<TransacaoDatabase, "id_transacao" | "created_at">>
		) => {
			if (Platform.OS === "web") {
				const payload = {
					...data,
					updated_at: nowISO(),
				};

				const { error } = await supabase
					.from("transacoes")
					.update(payload)
					.eq("id_transacao", id_transacao);

				if (error) throw error.message;
				return { updated: true };
			}

			if (!db) throw new Error("Banco local indisponivel");

			await db.runAsync(
				`
          UPDATE transacoes
          SET tipo = COALESCE(?, tipo),
              valor = COALESCE(?, valor),
              categoria = COALESCE(?, categoria),
              id_pessoa = ?,
              pessoa = ?,
              id_imobilizado = ?,
			  family_id = ?,
			  is_family_shared = ?,
			  user_id = COALESCE(?, user_id),
              data_transacao = COALESCE(?, data_transacao),
              data_vencimento = ?,
              status = COALESCE(?, status),
              observacao = ?,
              updated_at = ?,
              sync_status = 'pending',
              synced = 0
          WHERE id_transacao = ?
        `,
				data.tipo ?? null,
				data.valor ?? null,
				data.categoria ?? null,
				data.id_pessoa ?? null,
				data.pessoa ?? null,
				data.id_imobilizado ?? null,
				data.family_id ?? null,
				Number(data.is_family_shared ?? 0),
				data.user_id ?? null,
				data.data_transacao ?? null,
				data.data_vencimento ?? null,
				data.status ?? null,
				data.observacao ?? null,
				nowISO(),
				id_transacao
			);

			return { updated: true };
		},

		deleteTransacao: async (id_transacao: number) => {
			if (Platform.OS === "web") {
				const { error } = await supabase.from("transacoes").delete().eq("id_transacao", id_transacao);

				if (error) throw error.message;
				return { deleted: true };
			}

			if (!db) throw new Error("Banco local indisponivel");

			await db.runAsync(
				`
          UPDATE transacoes
          SET deleted = 1,
              updated_at = ?,
              data_sync = ?,
              sync_status = 'pending',
              synced = 0
          WHERE id_transacao = ?
        `,
				nowISO(),
				nowISO(),
				id_transacao
			);

			return { deleted: true };
		},

		getTransacao: async (
			id?: number,
			params?: {
				page?: number;
				limit?: number;
				dateFrom?: string;
				dateTo?: string;
				fallbackRemoteOnMiss?: boolean;
				visibilityScope?: VisibilityScope;
				userId?: string | null;
				familyId?: number | null;
			}
		) => {
			const visibility = await resolveVisibilityContext(params);

			if (Platform.OS !== "web") {
				const referenceDate = params?.dateTo ?? params?.dateFrom ?? null;
				await validateAndGeneratePendingRecurrences({
					referenceDate,
					visibilityScope: visibility.scope,
					userId: visibility.userId,
					familyId: visibility.familyId,
				});
			}

			if (Platform.OS === "web") {
				let query = supabase
					.from("transacoes")
					.select("*, pessoa_rel:pessoa(nome)")
					.order("id_transacao", { ascending: false });

				query = applySupabaseVisibility(query, visibility);

				if (id) {
					query = query.eq("id_transacao", id);
				}

				if (params?.dateFrom) {
					query = query.gte("data_transacao", params.dateFrom);
				}

				if (params?.dateTo) {
					query = query.lte("data_transacao", params.dateTo);
				}

				if (!id && params?.page && params?.limit) {
					const from = (params.page - 1) * params.limit;
					const to = from + params.limit - 1;
					query = query.range(from, to);
				}

				const { data, error } = await query;
				if (error) throw error.message;
				if (id) {
					if (!data?.[0]) return null;
					return {
						...normalizeTransacaoPessoa(data[0], visibility.familyId),
						is_from_recurrence: 0,
						recurrence_uuid: null,
						recurrence_frequency: null,
						recurrence_sequence: null,
					};
				}
				return (data ?? []).map((row: any) => ({
					...normalizeTransacaoPessoa(row, visibility.familyId),
					is_from_recurrence: 0,
					recurrence_uuid: null,
					recurrence_frequency: null,
					recurrence_sequence: null,
				}));
			}

			if (!db) throw new Error("Banco local indisponivel");
			const localVisibility = buildSqliteVisibilityClause(visibility);

			if (id) {
				const row = await db.getFirstAsync<any>(
					`
					SELECT
						t.*,
						COALESCE(p.nome, t.pessoa) AS pessoa,
						CASE WHEN rt.id_recurrencia IS NULL THEN 0 ELSE 1 END AS is_from_recurrence,
						r.uuid AS recurrence_uuid,
						r.frequency AS recurrence_frequency,
						rt.sequence AS recurrence_sequence
					FROM transacoes t
					LEFT JOIN pessoa p
						ON p.id_pessoa = t.id_pessoa
						AND p.deleted = 0
					LEFT JOIN recorrencia_transacoes rt
						ON rt.id_transacao = t.id_transacao
					LEFT JOIN recorrencias r
						ON r.id_recurrencia = rt.id_recurrencia
						AND r.deleted = 0
					WHERE t.id_transacao = ?
					  AND t.deleted = 0
					  AND ${localVisibility.where}
					LIMIT 1
				`,
					id,
					...localVisibility.args
				);

				if (row) return normalizeTransacaoPessoa(row, visibility.familyId);


				if (params?.fallbackRemoteOnMiss) {
					try {
						const remote = await fetchRemoteTransacaoById(id);
						if (!remote) return null;
						const local = await upsertRemoteTransacaoLocally(remote);
						return local ? normalizeTransacaoPessoa(local, visibility.familyId) : null;
					} catch {
						return null;
					}
				}

				return null;
			}

			const page = params?.page ?? 1;
			const limit = params?.limit ?? 50;
			const offset = (page - 1) * limit;

			const rows = await db.getAllAsync<any>(
				`
				SELECT
					t.*,
					COALESCE(p.nome, t.pessoa) AS pessoa,
					CASE WHEN rt.id_recurrencia IS NULL THEN 0 ELSE 1 END AS is_from_recurrence,
					r.uuid AS recurrence_uuid,
					r.frequency AS recurrence_frequency,
					rt.sequence AS recurrence_sequence
				FROM transacoes t
				LEFT JOIN pessoa p
					ON p.id_pessoa = t.id_pessoa
					AND p.deleted = 0
				LEFT JOIN recorrencia_transacoes rt
					ON rt.id_transacao = t.id_transacao
				LEFT JOIN recorrencias r
					ON r.id_recurrencia = rt.id_recurrencia
					AND r.deleted = 0
				WHERE t.deleted = 0
				  AND ${localVisibility.where}
				  ${params?.dateFrom ? "AND substr(t.data_transacao, 1, 10) >= ?" : ""}
				  ${params?.dateTo ? "AND substr(t.data_transacao, 1, 10) <= ?" : ""}
				ORDER BY t.id_transacao DESC
				LIMIT ? OFFSET ?
			`,
				...localVisibility.args,
				...(params?.dateFrom ? [params.dateFrom] : []),
				...(params?.dateTo ? [params.dateTo] : []),
				limit,
				offset
			);

			return (rows ?? []).map((row) => normalizeTransacaoPessoa(row, visibility.familyId));
		},

		syncPendingTransacoes,

			syncAllPendingData: async (options?: { force?: boolean }) => {
				const summary = await syncAllPendingData(options);
				if (Platform.OS !== "web") {
					await validateAndGeneratePendingRecurrences();
				}
				return summary;
			},

			validateAndGeneratePendingRecurrences,
			listRecorrencias,
			pauseRecorrencia,
			activateRecorrencia,
			deleteRecorrencia,

		getPessoasSuggestions: async (search?: string, limit = 8) => {
			const term = (search || "").trim().toLowerCase();

			if (Platform.OS === "web") {
				const { data, error } = await supabase
					.from("transacoes")
					.select("pessoa")
					.not("pessoa", "is", null)
					.order("id_transacao", { ascending: false })
					.limit(100);

				if (error) throw error.message;

				const unique = Array.from(
					new Set((data ?? []).map((row: any) => (row?.pessoa || "").trim()).filter(Boolean))
				);

				const filtered = term
					? unique.filter((name) => name.toLowerCase().includes(term))
					: unique;

				return filtered.slice(0, limit);
			}

			if (!db) return [];

			const rows = await db.getAllAsync<{ pessoa: string }>(
				`
          SELECT DISTINCT pessoa
          FROM transacoes
          WHERE pessoa IS NOT NULL
            AND TRIM(pessoa) <> ''
            AND deleted = 0
            AND (? = '' OR LOWER(pessoa) LIKE '%' || ? || '%')
          ORDER BY pessoa ASC
          LIMIT ?
        `,
				term,
				term,
				limit
			);

			return (rows ?? []).map((r) => r.pessoa).filter(Boolean);
		},

		fetchImobilizados: async (id?: number, text?: string) => {
			let query = supabase
				.from("imobilizado")
				.select("id_imobilizado,codigo,descricao")
				.limit(30)
				.order("descricao", { ascending: true });

			if (id) {
				query = query.eq("id_imobilizado", id);
			}

			if (text) {
				query = query.or(`descricao.ilike.%${text}%,codigo.ilike.%${text}%`);
			}

			const { data, error } = await query;
			if (error) throw error.message;

			return (data as ImobilizadoRow[]).map((row) => ({
				value: row.id_imobilizado,
				label: `${row.codigo} - ${row.descricao}`,
			}));
		},
	};
}
