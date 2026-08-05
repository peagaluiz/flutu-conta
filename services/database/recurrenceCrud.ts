import { Platform } from "react-native";
import { db, nowISO } from "@/services/database/db";
import { RecurrenceDatabase } from "@/services/database/types";
import {
	buildSqlVisibilityClause,
	resolveVisibilityContext,
	type VisibilityParams as RecurrenceVisibilityParams,
} from "@/services/database/visibility";

// Leitura e mudanças de estado das regras de recorrência (sem geração).

export async function listRecorrencias(params?: RecurrenceVisibilityParams) {
	if (!db || Platform.OS === "web") {
		return [] as RecurrenceDatabase[];
	}

	const visibility = await resolveVisibilityContext(params);
	const sqlVisibility = buildSqlVisibilityClause("r", visibility);
	const rows = await db.getAllAsync<RecurrenceDatabase>(
		`
      SELECT
        r.*,
        COUNT(CASE WHEN t.deleted = 0 THEN rt.id_transacao END) AS active_transactions_count,
        json_extract(r.template_json, '$.valor')       AS valor,
        json_extract(r.template_json, '$.pessoa')      AS pessoa,
        json_extract(r.template_json, '$.observacao')  AS observacao,
        json_extract(r.template_json, '$.json')        AS json,
        cc.nome                                         AS categoria
      FROM recorrencias r
      LEFT JOIN recorrencia_transacoes rt
        ON rt.id_recurrencia = r.id_recurrencia
      LEFT JOIN transacoes t
        ON t.id_transacao = rt.id_transacao
      LEFT JOIN categoria_catalogo cc
        ON cc.id = json_extract(r.template_json, '$.id_categoria')
      WHERE r.deleted = 0
        AND ${sqlVisibility.where}
      GROUP BY r.id_recurrencia
      ORDER BY r.id_recurrencia DESC
    `,
		...sqlVisibility.args
	);

	return rows ?? [];
}

export async function pauseRecorrencia(uuid: string) {
	if (!db || Platform.OS === "web") return { updated: false };
	await db.runAsync(
		`
      UPDATE recorrencias
      SET status = 'pausada',
          updated_at = ?,
          sync_status = 'pending',
          synced = 0
      WHERE uuid = ?
        AND deleted = 0
    `,
		nowISO(),
		uuid
	);
	return { updated: true };
}

export async function activateRecorrencia(uuid: string) {
	if (!db || Platform.OS === "web") return { updated: false };
	await db.runAsync(
		`
      UPDATE recorrencias
      SET status = 'ativa',
          updated_at = ?,
          sync_status = 'pending',
          synced = 0
      WHERE uuid = ?
        AND deleted = 0
    `,
		nowISO(),
		uuid
	);
	return { updated: true };
}

export async function deleteRecorrencia(uuid: string) {
	if (!db || Platform.OS === "web") return { deleted: false };
	await db.runAsync(
		`
      UPDATE recorrencias
      SET deleted = 1,
          updated_at = ?,
          sync_status = 'pending',
          synced = 0
      WHERE uuid = ?
        AND deleted = 0
    `,
		nowISO(),
		uuid
	);
	return { deleted: true };
}

export async function getRecorrenciaByUuid(uuid: string) {
	if (!db || Platform.OS === "web") return null;

	const row = await db.getFirstAsync<any>(
		`
      SELECT
        r.*,
        cc.nome AS categoria
      FROM recorrencias r
      LEFT JOIN categoria_catalogo cc
        ON cc.id = json_extract(r.template_json, '$.id_categoria')
      WHERE r.uuid = ?
        AND r.deleted = 0
      LIMIT 1
    `,
		uuid
	);
	if (!row) return null;

	let template: any = {};
	try {
		template = row.template_json ? JSON.parse(row.template_json) : {};
	} catch {}

	return { ...row, template };
}

export async function deleteRecorrenciaWithTransacoes(uuid: string) {
	if (!db || Platform.OS === "web") return { deleted: false };
	await db.runAsync(
		`
      UPDATE transacoes
      SET deleted = 1,
          updated_at = ?,
          sync_status = 'pending',
          synced = 0
      WHERE id_transacao IN (
        SELECT rt.id_transacao
        FROM recorrencia_transacoes rt
        JOIN recorrencias r ON r.id_recurrencia = rt.id_recurrencia
        WHERE r.uuid = ? AND r.deleted = 0
      ) AND deleted = 0
    `,
		nowISO(),
		uuid
	);
	return deleteRecorrencia(uuid);
}
