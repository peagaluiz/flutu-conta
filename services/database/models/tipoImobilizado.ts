import { db, nowISO } from "@/services/database/db";
import type { SyncModel } from "./types";

function toRemotePayload(row: any) {
	return {
		nome: row.nome ?? "",
		user_id: row.user_id ?? null,
	};
}

async function fromRemote(remote: any) {
	if (!db || !remote?.id_tipo_imobilizado) return null;

	const existing = await db.getFirstAsync<any>(
		`
      SELECT *
      FROM tipo_imobilizado
      WHERE remote_id = ?
      LIMIT 1
    `,
		remote.id_tipo_imobilizado
	);

	if (existing) {
		if (Number(existing?.deleted || 0) === 1) return existing;

		if (
			String(existing?.nome || "") === String(remote?.nome || "") &&
			String(existing?.user_id || "") === String(remote?.user_id || "") &&
			String(existing?.sync_status || "") === "synced" &&
			Number(existing?.synced || 0) === 1
		) {
			return existing;
		}

		await db.runAsync(
			`
        UPDATE tipo_imobilizado
        SET nome = COALESCE(?, nome),
            user_id = COALESCE(?, user_id),
            data_sync = ?,
            sync_status = 'synced',
            synced = 1,
            deleted = 0
        WHERE id_tipo_imobilizado = ?
      `,
			remote.nome ?? null,
			remote.user_id ?? null,
			nowISO(),
			existing.id_tipo_imobilizado
		);

		return db.getFirstAsync<any>(
			`
        SELECT *
        FROM tipo_imobilizado
        WHERE id_tipo_imobilizado = ?
        LIMIT 1
      `,
			existing.id_tipo_imobilizado
		);
	}

	const inserted = await db.runAsync(
		`
      INSERT INTO tipo_imobilizado (
        remote_id,
        nome,
        user_id,
        data_sync,
        sync_status,
        synced,
        deleted
      ) VALUES (?, ?, ?, ?, 'synced', 1, 0)
    `,
		remote.id_tipo_imobilizado,
		remote.nome ?? "",
		remote.user_id ?? null,
		nowISO()
	);

	return db.getFirstAsync<any>(
		`
      SELECT *
      FROM tipo_imobilizado
      WHERE id_tipo_imobilizado = ?
      LIMIT 1
    `,
		inserted.lastInsertRowId
	);
}

export const tipoImobilizadoModel: SyncModel = {
	table: "tipo_imobilizado",
	idColumn: "id_tipo_imobilizado",
	remotePk: "id_tipo_imobilizado",
	deleteMode: "hard",
	toRemotePayload,
	fromRemote,
};
