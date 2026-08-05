import { Platform } from "react-native";
import { supabase } from "@/services/supabase/client";
import { db, nowISO } from "@/services/database/db";
import { getAuthUserId } from "./resolvers";
import { countError, countProcessed, countSynced, type SyncSummary } from "./summary";

// Recorrências e seus vínculos não passam pelo motor genérico: a regra de subida
// depende do usuário da sessão e o vínculo é um upsert por chave composta.

export async function syncPendingRecorrencias(summary: SyncSummary) {
	if (!db || Platform.OS === "web") return;
	const userId = await getAuthUserId();
	if (!userId) return;

	const pendingRows = await db.getAllAsync<any>(
		`SELECT * FROM recorrencias
         WHERE deleted = 0
           AND (sync_status = 'pending' OR sync_status = 'error' OR synced = 0)
           AND user_id = ?
         ORDER BY id_recurrencia ASC
         LIMIT 100`,
		userId
	);

	for (const row of pendingRows ?? []) {
		countProcessed(summary, "recorrencias");
		try {
			let templateJson: any = null;
			try { templateJson = row.template_json ? JSON.parse(row.template_json) : null; } catch {}

			const payload: any = {
				uuid: row.uuid,
				status: row.status ?? "ativa",
				frequency: row.frequency,
				interval_days: row.interval_days ?? null,
				base_due_date: row.base_due_date,
				next_due_date: row.next_due_date,
				end_date: row.end_date ?? null,
				template_json: templateJson,
				occurrences_count: Number(row.occurrences_count ?? 0),
				last_generated_at: row.last_generated_at ?? null,
				user_id: row.user_id ?? userId,
				family_id: row.family_id ?? null,
				is_family_shared: Number(row.is_family_shared ?? 0),
				skip_non_working: Number(row.skip_non_working ?? 0),
				skip_direction: row.skip_direction ?? null,
				deleted: Number(row.deleted ?? 0),
			};

			let remoteId = row.remote_id ?? null;

			if (remoteId) {
				const { error } = await supabase
					.from("recorrencias")
					.update({ ...payload, updated_at: nowISO() })
					.eq("id_recurrencia", remoteId);
				if (error) throw error;
			} else {
				const { data: inserted, error } = await supabase
					.from("recorrencias")
					.insert(payload)
					.select("id_recurrencia")
					.single();
				if (error) throw error;
				remoteId = inserted.id_recurrencia;
			}

			await db.runAsync(
				`UPDATE recorrencias
                 SET remote_id = ?, sync_status = 'synced', synced = 1, updated_at = ?
                 WHERE id_recurrencia = ?`,
				remoteId,
				nowISO(),
				row.id_recurrencia
			);
			countSynced(summary, "recorrencias");
		} catch (error) {
			console.warn("[sync:push:recorrencias] erro", row?.id_recurrencia, error);
			countError(summary, "recorrencias");
			await db.runAsync(
				`UPDATE recorrencias SET sync_status = 'error' WHERE id_recurrencia = ?`,
				row.id_recurrencia
			).catch(() => {});
		}
	}

	// Soft deletes
	const deletedRows = await db.getAllAsync<any>(
		`SELECT * FROM recorrencias
         WHERE deleted = 1
           AND remote_id IS NOT NULL
           AND (sync_status = 'pending' OR sync_status = 'error' OR synced = 0)
           AND user_id = ?
         LIMIT 50`,
		userId
	);

	for (const row of deletedRows ?? []) {
		try {
			const { error } = await supabase
				.from("recorrencias")
				.update({ deleted: 1, updated_at: nowISO() })
				.eq("id_recurrencia", row.remote_id);
			if (!error) {
				await db.runAsync(
					`UPDATE recorrencias SET sync_status = 'synced', synced = 1 WHERE id_recurrencia = ?`,
					row.id_recurrencia
				);
			}
		} catch {}
	}
}

export async function syncPendingRecorrenciaTransacoes(summary: SyncSummary) {
	if (!db || Platform.OS === "web") return;
	const userId = await getAuthUserId();
	if (!userId) return;

	const pendingRows = await db.getAllAsync<any>(
		`SELECT rt.*,
		        r.remote_id AS recorrencia_remote_id,
		        t.remote_id AS transacao_remote_id
		 FROM recorrencia_transacoes rt
		 JOIN recorrencias r ON r.id_recurrencia = rt.id_recurrencia
		 JOIN transacoes t   ON t.id_transacao = rt.id_transacao
		 WHERE rt.synced = 0
		   AND r.deleted = 0
		   AND t.deleted = 0
		   AND r.remote_id IS NOT NULL
		   AND t.remote_id IS NOT NULL
		   AND r.user_id = ?
		 LIMIT 200`,
		userId
	);

	for (const row of pendingRows ?? []) {
		countProcessed(summary, "recorrencia_transacoes");
		try {
			const payload = {
				id_recurrencia: row.recorrencia_remote_id,
				id_transacao: row.transacao_remote_id,
				due_date: row.due_date,
				sequence: Number(row.sequence),
				created_at: row.created_at,
			};

			const { error } = await supabase
				.from("recorrencia_transacoes")
				.upsert(payload, { onConflict: "id_recurrencia,due_date" });

			if (error) throw error;

			await db.runAsync(
				`UPDATE recorrencia_transacoes SET synced = 1 WHERE id_recurrencia_transacao = ?`,
				row.id_recurrencia_transacao
			);
			countSynced(summary, "recorrencia_transacoes");
		} catch (error) {
			console.warn("[sync:push:recorrencia_transacoes] erro", row?.id_recurrencia_transacao, error);
			countError(summary, "recorrencia_transacoes");
		}
	}
}
