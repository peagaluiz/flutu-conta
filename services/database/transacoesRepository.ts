import { Platform } from "react-native";
import { supabase } from "@/services/supabase/client";
import { db, nowISO } from "@/services/database/db";
import { ImobilizadoRow, TransacaoDatabase } from "@/services/database/types";
import {
	activateRecorrencia,
	applyEditToRecurrenceTransacoes,
	createRecurrenceFromNewTransaction,
	deleteRecorrencia,
	deleteRecorrenciaWithTransacoes,
	getRecorrenciaByUuid,
	listRecorrencias,
	materializeRecurrenceOccurrence,
	pauseRecorrencia,
	type RecurrenceCreateConfig,
	validateAndGeneratePendingRecurrences,
} from "@/services/database/recurrenceService";
import {
	compareTransacaoRows,
	projectGhostOccurrences,
} from "@/services/database/recurrenceProjection";
import {
	listRecorrenciasWeb,
	projectGhostOccurrencesWeb,
} from "@/services/database/recurrenceWeb";
import {
	fetchRemoteTransacaoById,
	syncAllPendingData,
	syncPendingTransacoes,
	upsertRemoteTransacaoLocally,
} from "@/services/database/transacoesSync";
import { createFaturaRepository } from "@/services/database/faturaRepository";
import {
	insertTransacaoLocal,
	normalizeTransacaoPessoa,
} from "@/services/database/transacoesLocalWriter";
import {
	applySupabaseVisibility,
	buildSqlVisibilityClause,
	resolveVisibilityContext,
	type VisibilityContext,
	type VisibilityScope,
} from "@/services/database/visibility";

const buildSqliteVisibilityClause = (visibility: VisibilityContext) =>
	buildSqlVisibilityClause("t", visibility);


export function createTransacoesRepository() {
	return {
		createTransacao: async (
			data: Omit<TransacaoDatabase, "id_transacao" | "created_at" | "updated_at">
		) => {
			let resolvedUserId = data.user_id ?? null;
			if (!resolvedUserId) {
				const visibility = await resolveVisibilityContext();
				resolvedUserId = visibility.userId ?? null;
			}
			const payload = {
				...data,
				user_id: resolvedUserId,
			};

			if (Platform.OS === "web") {
				const { data: inserted, error } = await supabase
					.from("transacoes")
					.insert(payload)
					.select("id_transacao")
					.single();

				if (error) throw error.message;

				return { insertId: String(inserted.id_transacao) };
			}

			if (!db) throw new Error("Banco local indisponivel");

			const insertResult = await insertTransacaoLocal(payload);

			return { insertId: String(insertResult.insertId) };
		},

		// Cria uma transação por parcela, cada uma vinculada à fatura do mês correspondente.
		createTransacoesParceladas: async (
			data: Omit<TransacaoDatabase, "id_transacao" | "created_at" | "updated_at">,
			plano: Array<{
				mesReferencia: string;
				dataFechamento?: string | null;
				dataVencimento: string;
				parcelaAtual: number;
				parcelaTotal: number;
				valorParcela: number;
			}>,
			options?: { isFamilyShared?: boolean }
		) => {
			if (!data.id_banco) throw new Error("Cartão (banco) é obrigatório para parcelamento");

			let resolvedUserId = data.user_id ?? null;
			if (!resolvedUserId) {
				const visibility = await resolveVisibilityContext();
				resolvedUserId = visibility.userId ?? null;
			}

			const fatura = createFaturaRepository();
			const ids: string[] = [];
			const touchedFaturas = new Set<number>();

			for (const parcela of plano) {
				const idFatura = await fatura.findOrCreateFatura({
					idBanco: Number(data.id_banco),
					mesReferencia: parcela.mesReferencia,
					dataFechamento: parcela.dataFechamento ?? null,
					dataVencimento: parcela.dataVencimento,
					userId: resolvedUserId,
					familyId: data.family_id ?? null,
					isFamilyShared: Boolean(options?.isFamilyShared ?? Number(data.is_family_shared ?? 0) === 1),
				});
				touchedFaturas.add(idFatura);

				const result = await (Platform.OS === "web"
					? supabase
							.from("transacoes")
							.insert({
								...data,
								user_id: resolvedUserId,
								valor: parcela.valorParcela,
								data_vencimento: parcela.dataVencimento,
								id_fatura: idFatura,
								parcela_atual: parcela.parcelaAtual,
								parcela_total: parcela.parcelaTotal,
							})
							.select("id_transacao")
							.single()
							.then(({ data: inserted, error }) => {
								if (error) throw error.message;
								return { insertId: String(inserted.id_transacao) };
							})
					: insertTransacaoLocal({
							...data,
							user_id: resolvedUserId,
							valor: parcela.valorParcela,
							data_vencimento: parcela.dataVencimento,
							id_fatura: idFatura,
							parcela_atual: parcela.parcelaAtual,
							parcela_total: parcela.parcelaTotal,
						}));

				ids.push(result.insertId);
			}

			for (const idFatura of touchedFaturas) {
				await fatura.recalcFaturaTotal(idFatura);
			}

			return { created: ids.length, ids, faturaIds: Array.from(touchedFaturas) };
		},

		createRecurringTransacoes: async (
			data: Omit<TransacaoDatabase, "id_transacao" | "created_at" | "updated_at">,
			recurrence: RecurrenceCreateConfig
		) => {
			if (!db || Platform.OS === "web") {
				throw new Error("Recorrencia disponivel somente no banco local no app movel");
			}

			let resolvedUserId = data.user_id ?? null;
			if (!resolvedUserId) {
				const visibility = await resolveVisibilityContext();
				resolvedUserId = visibility.userId ?? null;
			}
			const dueDate =
				(data.data_vencimento && /^\d{4}-\d{2}-\d{2}$/.test(String(data.data_vencimento))
					? String(data.data_vencimento)
					: String(nowISO()).slice(0, 10));

			const seedPayload = {
				...data,
				user_id: resolvedUserId,
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
              id_categoria = ?,
              id_pessoa = ?,
              pessoa = ?,
              id_imobilizado = ?,
              id_banco = ?,
			  family_id = ?,
			  is_family_shared = ?,
			  user_id = COALESCE(?, user_id),
              data_transacao = COALESCE(?, data_transacao),
              data_vencimento = ?,
              data_baixa = ?,
              status = COALESCE(?, status),
              observacao = ?,
              json = ?,
              updated_at = ?,
              sync_status = 'pending',
              synced = 0
          WHERE id_transacao = ?
        `,
				data.tipo ?? null,
				data.valor ?? null,
				data.id_categoria ?? null,
				data.id_pessoa ?? null,
				data.pessoa ?? null,
				data.id_imobilizado ?? null,
				data.id_banco ?? null,
				data.family_id ?? null,
				Number(data.is_family_shared ?? 0),
				data.user_id ?? null,
				data.data_transacao ?? null,
				data.data_vencimento ?? null,
				data.data_baixa ?? null,
				data.status ?? null,
				data.observacao ?? null,
				data.json ?? null,
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
				dateField?: "data_vencimento" | "data_baixa";
					fallbackRemoteOnMiss?: boolean;
					visibilityScope?: VisibilityScope;
					userId?: string | null;
					familyId?: number | null;
					withCount?: boolean;
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
				const hasPaging = !id && !!params?.page && !!params?.limit;
				// Fantasmas de recorrência (previstas) só quando há dateTo e não filtrando por baixa,
				// espelhando o branch nativo. A projeção roda em JS sobre dados do Supabase.
				const wantGhosts =
					!id && !!params?.dateTo && params?.dateField !== "data_baixa";
				// Espelha o SELECT/ordenação do SQLite: traz o nome da categoria (JOIN),
				// ignora deletados e ordena não-baixados primeiro, depois por vencimento.
				let query = supabase
					.from("transacoes")
					.select(
						"*, pessoa_rel:pessoa(nome), categoria_rel:categoria_catalogo(nome)",
						params?.withCount ? { count: "exact" } : undefined
					)
					.eq("deleted", 0)
					.order("data_baixa", { ascending: true, nullsFirst: true })
					.order("data_vencimento", { ascending: true, nullsFirst: false })
					.order("id_transacao", { ascending: false });

				query = applySupabaseVisibility(query, visibility);

				if (id) {
					query = query.eq("id_transacao", id);
				}

				if (params?.dateField === "data_baixa") {
					if (params?.dateFrom) query = query.gte("data_baixa", params.dateFrom);
					if (params?.dateTo) query = query.lte("data_baixa", params.dateTo);
				} else {
					if (params?.dateFrom) {
						query = query.or(`data_vencimento.gte.${params.dateFrom},and(data_vencimento.is.null,data_transacao.gte.${params.dateFrom})`);
					}
					if (params?.dateTo) {
						query = query.or(`data_vencimento.lte.${params.dateTo},and(data_vencimento.is.null,data_transacao.lte.${params.dateTo})`);
					}
				}

				if (!id && params?.page && params?.limit) {
					// Com fantasmas, sobre-busca a partir de 0 para mesclar antes de paginar (igual ao nativo).
					const from = wantGhosts ? 0 : (params.page - 1) * params.limit;
					const to = params.page * params.limit - 1;
					query = query.range(from, to);
				}

				const { data, error, count } = await query;
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
				const normalized = (data ?? []).map((row: any) => ({
					...normalizeTransacaoPessoa(row, visibility.familyId),
					is_from_recurrence: 0,
					recurrence_uuid: null,
					recurrence_frequency: null,
					recurrence_sequence: null,
				}));

				if (!wantGhosts) {
					return params?.withCount
						? { rows: normalized, totalCount: count ?? normalized.length }
						: normalized;
				}

				const offset = hasPaging ? ((params?.page ?? 1) - 1) * (params?.limit ?? 0) : 0;
				const limit = params?.limit ?? 0;

				const ghosts = await projectGhostOccurrencesWeb({
					dateFrom: params?.dateFrom ?? null,
					dateTo: params?.dateTo,
					visibility,
				});

				if (!ghosts.length) {
					return hasPaging ? normalized.slice(offset, offset + limit) : normalized;
				}

				const merged = [
					...normalized,
					...ghosts.map((ghost) => normalizeTransacaoPessoa(ghost, visibility.familyId)),
				].sort(compareTransacaoRows);

				return hasPaging ? merged.slice(offset, offset + limit) : merged;
			}

			if (!db) throw new Error("Banco local indisponivel");
			const localVisibility = buildSqliteVisibilityClause(visibility);

			if (id) {
				const row = await db.getFirstAsync<any>(
					`
					SELECT
						t.*,
						cc.nome AS categoria,
						COALESCE(p.nome, t.pessoa) AS pessoa,
						CASE WHEN rt.id_recurrencia IS NULL THEN 0 ELSE 1 END AS is_from_recurrence,
						r.uuid AS recurrence_uuid,
						r.frequency AS recurrence_frequency,
						rt.sequence AS recurrence_sequence
					FROM transacoes t
					LEFT JOIN categoria_catalogo cc
						ON cc.id = t.id_categoria
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

			const ghosts =
				params?.dateTo && params?.dateField !== "data_baixa"
					? await projectGhostOccurrences({
							dateFrom: params?.dateFrom ?? null,
							dateTo: params.dateTo,
							visibility,
						})
					: [];

			const rows = await db.getAllAsync<any>(
				`
				SELECT
					t.*,
					cc.nome AS categoria,
					COALESCE(p.nome, t.pessoa) AS pessoa,
					CASE WHEN rt.id_recurrencia IS NULL THEN 0 ELSE 1 END AS is_from_recurrence,
					r.uuid AS recurrence_uuid,
					r.frequency AS recurrence_frequency,
					rt.sequence AS recurrence_sequence
				FROM transacoes t
				LEFT JOIN categoria_catalogo cc
					ON cc.id = t.id_categoria
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
				  ${params?.dateFrom ? `AND substr(${params?.dateField === "data_baixa" ? "t.data_baixa" : "COALESCE(t.data_vencimento, t.data_transacao)"}, 1, 10) >= ?` : ""}
				  ${params?.dateTo ? `AND substr(${params?.dateField === "data_baixa" ? "t.data_baixa" : "COALESCE(t.data_vencimento, t.data_transacao)"}, 1, 10) <= ?` : ""}
				ORDER BY
					CASE WHEN t.data_baixa IS NULL OR t.data_baixa = '' THEN 0 ELSE 1 END ASC,
					COALESCE(t.data_vencimento, t.data_transacao) ASC,
					t.id_transacao DESC
				LIMIT ? OFFSET ?
			`,
				...localVisibility.args,
				...(params?.dateFrom ? [params.dateFrom] : []),
				...(params?.dateTo ? [params.dateTo] : []),
				ghosts.length ? page * limit : limit,
				ghosts.length ? 0 : offset
			);

			const normalized = (rows ?? []).map((row) =>
				normalizeTransacaoPessoa(row, visibility.familyId)
			);
			if (!ghosts.length) return normalized;

			const merged = [
				...normalized,
				...ghosts.map((ghost) => normalizeTransacaoPessoa(ghost, visibility.familyId)),
			].sort(compareTransacaoRows);
			return merged.slice(offset, offset + limit);
		},

		syncPendingTransacoes,

			syncAllPendingData: async (options?: { force?: boolean; onProgress?: (step: string) => void }) => {
				const summary = await syncAllPendingData(options);
				if (Platform.OS !== "web") {
					await validateAndGeneratePendingRecurrences();
				}
				return summary;
			},

			validateAndGeneratePendingRecurrences,
			materializeRecurrenceOccurrence,
			getRecorrenciaByUuid,
			listRecorrencias: (params?: {
				visibilityScope?: VisibilityScope;
				userId?: string | null;
				familyId?: number | null;
			}) => (Platform.OS === "web" ? listRecorrenciasWeb(params) : listRecorrencias(params)),
			projectGhostOccurrences: async (params?: {
				dateFrom?: string | null;
				dateTo?: string | null;
				dateField?: "data_vencimento" | "data_baixa";
				visibilityScope?: VisibilityScope;
				userId?: string | null;
				familyId?: number | null;
			}) => {
				if (!params?.dateTo || params.dateField === "data_baixa") return [];
				const visibility = await resolveVisibilityContext(params);
				if (Platform.OS === "web") {
					return projectGhostOccurrencesWeb({
						dateFrom: params.dateFrom ?? null,
						dateTo: params.dateTo,
						visibility,
					});
				}
				await validateAndGeneratePendingRecurrences({
					referenceDate: params.dateTo,
					visibilityScope: visibility.scope,
					userId: visibility.userId,
					familyId: visibility.familyId,
				});
				return projectGhostOccurrences({
					dateFrom: params.dateFrom ?? null,
					dateTo: params.dateTo,
					visibility,
				});
			},
			pauseRecorrencia,
			activateRecorrencia,
			deleteRecorrencia,
			deleteRecorrenciaWithTransacoes,
			applyEditToRecurrenceTransacoes,

		darBaixa: async (id_transacao: number, dataBaixa?: string | null) => {
			if (Platform.OS === "web") {
				const { error } = await supabase
					.from("transacoes")
					.update({ status: "pago", data_baixa: dataBaixa || nowISO(), updated_at: nowISO() })
					.eq("id_transacao", id_transacao);
				if (error) throw error.message;
				return { updated: true };
			}

			if (!db) throw new Error("Banco local indisponivel");
			await db.runAsync(
				`UPDATE transacoes
				 SET status = 'pago',
				     data_baixa = ?,
				     updated_at = ?,
				     sync_status = 'pending',
				     synced = 0
				 WHERE id_transacao = ?`,
				dataBaixa || nowISO(),
				nowISO(),
				id_transacao
			);
			return { updated: true };
		},

		removerBaixa: async (id_transacao: number) => {
			if (Platform.OS === "web") {
				const { error } = await supabase
					.from("transacoes")
					.update({ status: "pendente", data_baixa: null, updated_at: nowISO() })
					.eq("id_transacao", id_transacao);
				if (error) throw error.message;
				return { updated: true };
			}

			if (!db) throw new Error("Banco local indisponivel");
			await db.runAsync(
				`UPDATE transacoes
				 SET status = 'pendente',
				     data_baixa = NULL,
				     updated_at = ?,
				     sync_status = 'pending',
				     synced = 0
				 WHERE id_transacao = ?`,
				nowISO(),
				id_transacao
			);
			return { updated: true };
		},

		// Retorna o conjunto de ofx_fitid já existentes (não deletados) dentre os informados.
		findExistingFitids: async (fitids: string[]): Promise<Set<string>> => {
			const clean = Array.from(new Set((fitids || []).filter(Boolean)));
			if (!clean.length) return new Set();

			if (Platform.OS === "web") {
				const { data, error } = await supabase
					.from("transacoes")
					.select("ofx_fitid")
					.eq("deleted", 0)
					.in("ofx_fitid", clean);
				if (error) throw error.message;
				return new Set((data ?? []).map((r: any) => String(r.ofx_fitid)).filter(Boolean));
			}

			if (!db) return new Set();
			const placeholders = clean.map(() => "?").join(",");
			const rows = await db.getAllAsync<{ ofx_fitid: string }>(
				`SELECT DISTINCT ofx_fitid FROM transacoes
				 WHERE deleted = 0 AND ofx_fitid IN (${placeholders})`,
				...clean
			);
			return new Set((rows ?? []).map((r) => String(r.ofx_fitid)).filter(Boolean));
		},

		// Transações vinculadas a uma fatura (para match na importação e exibição).
		listTransacoesByFatura: async (idFatura: number) => {
			if (Platform.OS === "web") {
				const { data, error } = await supabase
					.from("transacoes")
					.select("id_transacao, valor, tipo, json, observacao, ofx_fitid")
					.eq("id_fatura", idFatura)
					.eq("deleted", 0);
				if (error) throw error.message;
				return data ?? [];
			}
			if (!db) return [];
			const rows = await db.getAllAsync<any>(
				`SELECT id_transacao, valor, tipo, json, observacao, ofx_fitid
				 FROM transacoes WHERE id_fatura = ? AND deleted = 0`,
				idFatura
			);
			return rows ?? [];
		},

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
