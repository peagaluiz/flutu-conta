import { db, nowISO } from "@/services/database/db";
import { resolveLocalId, resolveRemoteId } from "@/services/database/sync/resolvers";
import type { SyncModel } from "./types";

async function toRemotePayload(row: any) {
	const remoteTipo = await resolveRemoteId("tipo_imobilizado", row.id_tipo_imobilizado ?? null);

	return {
		id_tipo_imobilizado: remoteTipo,
		codigo: row.codigo ?? "",
		descricao: row.descricao ?? "",
		family_id: row.family_id ?? null,
		is_family_shared: Number(row.is_family_shared ?? 0),
		user_id: row.user_id ?? null,
		status: row.status ?? null,
	};
}

async function fromRemote(remote: any) {
	if (!db || !remote?.id_imobilizado) return null;

	const localTipoId = await resolveLocalId("tipo_imobilizado", remote.id_tipo_imobilizado ?? null);
	const existing = await db.getFirstAsync<any>(
		`
      SELECT *
      FROM imobilizado
      WHERE remote_id = ?
      LIMIT 1
    `,
		remote.id_imobilizado
	);

	if (existing) {
		if (Number(existing?.deleted || 0) === 1) return existing;

		if (
			Number(existing?.id_tipo_imobilizado || 0) === Number(localTipoId || 0) &&
			String(existing?.codigo || "") === String(remote?.codigo || "") &&
			String(existing?.descricao || "") === String(remote?.descricao || "") &&
			Number(existing?.family_id || 0) === Number(remote?.family_id || 0) &&
			Number(existing?.is_family_shared || 0) === Number(remote?.is_family_shared || 0) &&
			String(existing?.user_id || "") === String(remote?.user_id || "") &&
			Number(existing?.status || 0) === Number(remote?.status || 0) &&
			String(existing?.sync_status || "") === "synced" &&
			Number(existing?.synced || 0) === 1
		) {
			return existing;
		}

		await db.runAsync(
			`
        UPDATE imobilizado
        SET id_tipo_imobilizado = ?,
            codigo = COALESCE(?, codigo),
            descricao = COALESCE(?, descricao),
			family_id = ?,
			is_family_shared = ?,
			user_id = COALESCE(?, user_id),
            status = COALESCE(?, status),
            data_sync = ?,
            sync_status = 'synced',
            synced = 1,
            deleted = 0
        WHERE id_imobilizado = ?
      `,
			localTipoId,
			remote.codigo ?? null,
			remote.descricao ?? null,
			remote.family_id ?? null,
			Number(remote.is_family_shared ?? 0),
			remote.user_id ?? null,
			remote.status ?? null,
			nowISO(),
			existing.id_imobilizado
		);

		return db.getFirstAsync<any>(
			`
        SELECT *
        FROM imobilizado
        WHERE id_imobilizado = ?
        LIMIT 1
      `,
			existing.id_imobilizado
		);
	}

	const inserted = await db.runAsync(
		`
      INSERT INTO imobilizado (
        remote_id,
        id_tipo_imobilizado,
        codigo,
        descricao,
		family_id,
		is_family_shared,
		user_id,
        status,
        data_sync,
        sync_status,
        synced,
        deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', 1, 0)
    `,
		remote.id_imobilizado,
		localTipoId,
		remote.codigo ?? "",
		remote.descricao ?? "",
		remote.family_id ?? null,
		Number(remote.is_family_shared ?? 0),
		remote.user_id ?? null,
		remote.status ?? null,
		nowISO()
	);

	return db.getFirstAsync<any>(
		`
      SELECT *
      FROM imobilizado
      WHERE id_imobilizado = ?
      LIMIT 1
    `,
		inserted.lastInsertRowId
	);
}

export const imobilizadoModel: SyncModel = {
	table: "imobilizado",
	idColumn: "id_imobilizado",
	remotePk: "id_imobilizado",
	deleteMode: "hard",
	unlinks: [{ table: "transacoes", column: "id_imobilizado" }],
	toRemotePayload,
	fromRemote,
};
