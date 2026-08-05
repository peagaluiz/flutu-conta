import { db, nowISO } from "@/services/database/db";
import type { SyncModel } from "./types";

function toRemotePayload(row: any) {
	return {
		nome: row.nome ?? "",
		family_id: row.family_id ?? null,
		is_family_shared: Number(row.is_family_shared ?? 0),
		user_id: row.user_id ?? null,
	};
}

async function fromRemote(remote: any) {
	if (!db || !remote?.id_pessoa) return null;

	const existing = await db.getFirstAsync<any>(
		`
      SELECT *
      FROM pessoa
      WHERE remote_id = ?
      LIMIT 1
    `,
		remote.id_pessoa
	);

	if (existing) {
		if (Number(existing?.deleted || 0) === 1) return existing;

		if (
			String(existing?.nome || "") === String(remote?.nome || "") &&
			Number(existing?.family_id || 0) === Number(remote?.family_id || 0) &&
			Number(existing?.is_family_shared || 0) === Number(remote?.is_family_shared || 0) &&
			String(existing?.user_id || "") === String(remote?.user_id || "") &&
			String(existing?.sync_status || "") === "synced" &&
			Number(existing?.synced || 0) === 1
		) {
			return existing;
		}

		await db.runAsync(
			`
        UPDATE pessoa
        SET nome = COALESCE(?, nome),
			family_id = ?,
			is_family_shared = ?,
			user_id = COALESCE(?, user_id),
            data_sync = ?,
            sync_status = 'synced',
            synced = 1,
            deleted = 0
        WHERE id_pessoa = ?
      `,
			remote.nome ?? null,
			remote.family_id ?? null,
			Number(remote.is_family_shared ?? 0),
			remote.user_id ?? null,
			nowISO(),
			existing.id_pessoa
		);

		return db.getFirstAsync<any>(
			`
        SELECT *
        FROM pessoa
        WHERE id_pessoa = ?
        LIMIT 1
      `,
			existing.id_pessoa
		);
	}

	const inserted = await db.runAsync(
		`
      INSERT INTO pessoa (
        remote_id,
        nome,
        family_id,
        is_family_shared,
        user_id,
        data_sync,
        sync_status,
        synced,
        deleted
      ) VALUES (?, ?, ?, ?, ?, ?, 'synced', 1, 0)
    `,
		remote.id_pessoa,
		remote.nome ?? "",
		remote.family_id ?? null,
		Number(remote.is_family_shared ?? 0),
		remote.user_id ?? null,
		nowISO()
	);

	return db.getFirstAsync<any>(
		`
      SELECT *
      FROM pessoa
      WHERE id_pessoa = ?
      LIMIT 1
    `,
		inserted.lastInsertRowId
	);
}

export const pessoaModel: SyncModel = {
	table: "pessoa",
	idColumn: "id_pessoa",
	remotePk: "id_pessoa",
	deleteMode: "hard",
	unlinks: [
		{
			table: "transacoes",
			column: "id_pessoa",
			// Ao excluir a pessoa, o lançamento mantém o nome dela como texto livre.
			extraFields: (localRow) => ({ pessoa: localRow?.nome ?? null }),
		},
	],
	toRemotePayload,
	fromRemote,
};
