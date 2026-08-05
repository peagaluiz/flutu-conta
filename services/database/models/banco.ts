import { db, nowISO } from "@/services/database/db";
import type { SyncModel } from "./types";

function toRemotePayload(row: any) {
	return {
		nome: row.nome,
		cor_hex: row.cor_hex,
		tipo: row.tipo ?? "corrente",
		is_corrente: Number(row.is_corrente ?? 1),
		is_cartao: Number(row.is_cartao ?? 0),
		dia_fechamento: row.dia_fechamento ?? null,
		dia_vencimento: row.dia_vencimento ?? null,
		user_id: row.user_id ?? null,
		family_id: row.family_id ?? null,
		is_family_shared: Number(row.is_family_shared ?? 0),
	};
}

async function fromRemote(remote: any) {
	if (!db || !remote?.id_banco) return null;

	const existing = await db.getFirstAsync<any>(
		`SELECT * FROM banco WHERE remote_id = ? LIMIT 1`,
		remote.id_banco
	);

	if (existing) {
		if (Number(existing?.deleted || 0) === 1) return existing;

		if (
			String(existing?.nome || "") === String(remote?.nome || "") &&
			String(existing?.cor_hex || "") === String(remote?.cor_hex || "") &&
			String(existing?.tipo || "corrente") === String(remote?.tipo || "corrente") &&
			Number(existing?.is_corrente ?? 1) === Number(remote?.is_corrente ?? 1) &&
			Number(existing?.is_cartao ?? 0) === Number(remote?.is_cartao ?? 0) &&
			Number(existing?.dia_fechamento || 0) === Number(remote?.dia_fechamento || 0) &&
			Number(existing?.dia_vencimento || 0) === Number(remote?.dia_vencimento || 0) &&
			String(existing?.user_id || "") === String(remote?.user_id || "") &&
			Number(existing?.family_id || 0) === Number(remote?.family_id || 0) &&
			Number(existing?.is_family_shared || 0) === Number(remote?.is_family_shared || 0) &&
			String(existing?.sync_status || "") === "synced" &&
			Number(existing?.synced || 0) === 1
		) {
			return existing;
		}

		await db.runAsync(
			`
			UPDATE banco
			SET nome = COALESCE(?, nome),
				cor_hex = COALESCE(?, cor_hex),
				tipo = COALESCE(?, tipo),
				is_corrente = ?,
				is_cartao = ?,
				dia_fechamento = ?,
				dia_vencimento = ?,
				user_id = COALESCE(?, user_id),
				family_id = ?,
				is_family_shared = ?,
				data_sync = ?,
				sync_status = 'synced',
				synced = 1,
				deleted = 0
			WHERE id_banco = ?
			`,
			remote.nome ?? null,
			remote.cor_hex ?? null,
			remote.tipo ?? null,
			Number(remote.is_corrente ?? 1),
			Number(remote.is_cartao ?? 0),
			remote.dia_fechamento ?? null,
			remote.dia_vencimento ?? null,
			remote.user_id ?? null,
			remote.family_id ?? null,
			Number(remote.is_family_shared ?? 0),
			nowISO(),
			existing.id_banco
		);

		return db.getFirstAsync<any>(`SELECT * FROM banco WHERE id_banco = ? LIMIT 1`, existing.id_banco);
	}

	const inserted = await db.runAsync(
		`
		INSERT INTO banco (
			remote_id, nome, cor_hex, tipo, is_corrente, is_cartao, dia_fechamento, dia_vencimento, user_id, family_id, is_family_shared,
			data_sync, sync_status, synced, deleted
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', 1, 0)
		`,
		remote.id_banco,
		remote.nome ?? "",
		remote.cor_hex ?? "#6B7280",
		remote.tipo ?? "corrente",
		Number(remote.is_corrente ?? 1),
		Number(remote.is_cartao ?? 0),
		remote.dia_fechamento ?? null,
		remote.dia_vencimento ?? null,
		remote.user_id ?? null,
		remote.family_id ?? null,
		Number(remote.is_family_shared ?? 0),
		nowISO()
	);

	return db.getFirstAsync<any>(`SELECT * FROM banco WHERE id_banco = ? LIMIT 1`, inserted.lastInsertRowId);
}

export const bancoModel: SyncModel = {
	table: "banco",
	idColumn: "id_banco",
	remotePk: "id_banco",
	deleteMode: "hard",
	unlinks: [{ table: "transacoes", column: "id_banco" }],
	toRemotePayload,
	fromRemote,
};
