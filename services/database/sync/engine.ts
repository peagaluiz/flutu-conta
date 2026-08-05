import { Platform } from "react-native";
import { supabase } from "@/services/supabase/client";
import { db, nowISO } from "@/services/database/db";
import type { SyncModel } from "@/services/database/models/types";
import { markRowAsError, markRowAsSynced } from "./resolvers";
import {
	countError,
	countProcessed,
	countSynced,
	createEmptySummary,
	type SyncSummary,
} from "./summary";

// Motor genérico de sincronização: a diferença entre as tabelas vive nos models,
// não em uma função por tabela.

const PENDING_WHERE = "(sync_status = 'pending' OR sync_status = 'error' OR synced = 0)";

async function deleteRemoteRow(model: SyncModel, localRow: any) {
	for (const unlink of model.unlinks ?? []) {
		const { error } = await supabase
			.from(unlink.table)
			.update({
				[unlink.column]: null,
				...(unlink.extraFields?.(localRow) ?? {}),
				updated_at: nowISO(),
			})
			.eq(unlink.column, localRow.remote_id);

		if (error) throw error;
	}

	if (model.deleteMode === "soft") {
		const { error } = await supabase
			.from(model.table)
			.update({ deleted: 1, updated_at: nowISO() })
			.eq(model.remotePk, localRow.remote_id);
		if (error) throw error;
		return;
	}

	const { error } = await supabase
		.from(model.table)
		.delete()
		.eq(model.remotePk, localRow.remote_id);
	if (error) throw error;
}

export async function pushModel(model: SyncModel): Promise<SyncSummary> {
	if (!db || Platform.OS === "web") return createEmptySummary();

	const summary = createEmptySummary();

	const rows = await db.getAllAsync<any>(
		`
      SELECT *
      FROM ${model.table}
      WHERE ${PENDING_WHERE}
      ORDER BY ${model.idColumn} ASC
      LIMIT 100
    `
	);

	for (const row of rows ?? []) {
		countProcessed(summary, model.table);
		const localId = row[model.idColumn];

		try {
			if (Number(row?.deleted || 0) === 1) {
				if (row.remote_id) await deleteRemoteRow(model, row);
				await markRowAsSynced(model.table, model.idColumn, localId, row.remote_id ?? null);
				countSynced(summary, model.table);
				continue;
			}

			const payload = await model.toRemotePayload(row);

			if (row.remote_id) {
				const { error } = await supabase
					.from(model.table)
					.update(model.touchUpdatedAt ? { ...payload, updated_at: nowISO() } : payload)
					.eq(model.remotePk, row.remote_id);

				if (error) throw error;

				await markRowAsSynced(model.table, model.idColumn, localId, row.remote_id);
			} else {
				const { data: inserted, error } = await supabase
					.from(model.table)
					.insert(payload)
					.select(model.remotePk)
					.single();

				if (error) throw error;

				await markRowAsSynced(
					model.table,
					model.idColumn,
					localId,
					(inserted as any)?.[model.remotePk] ?? null
				);
			}

			countSynced(summary, model.table);
		} catch (error) {
			await markRowAsError(model.table, model.idColumn, localId);
			countError(summary, model.table);
			console.warn(`[sync:push:${model.table}] erro`, localId, error);
		}
	}

	return summary;
}

export async function pullModel(model: SyncModel): Promise<SyncSummary> {
	if (!db || Platform.OS === "web") return createEmptySummary();

	const { data, error } = await supabase
		.from(model.table)
		.select("*")
		.order(model.remotePk, { ascending: true });

	if (error) throw error.message;

	const summary = createEmptySummary();
	const rows = Array.isArray(data) ? data : [];

	for (const row of rows) {
		countProcessed(summary, model.table);

		try {
			await model.fromRemote(row);
			countSynced(summary, model.table);
		} catch {
			countError(summary, model.table);
		}
	}

	return summary;
}
