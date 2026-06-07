import { Platform } from "react-native";
import { supabase } from "@/services/supabase/client";
import { db, nowISO } from "@/services/database/db";

const SYNC_COOLDOWN_MS = 60_000;

let lastSyncAttemptAt = 0;
let syncInFlight: Promise<SyncSummary> | null = null;

let cachedAuthUserId: string | null | undefined;

export type SyncSummary = {
	processed: number;
	synced: number;
	errors: number;
	tables: {
		pessoa: { processed: number; synced: number; errors: number };
		tipo_imobilizado: { processed: number; synced: number; errors: number };
		imobilizado: { processed: number; synced: number; errors: number };
		transacoes: { processed: number; synced: number; errors: number };
		banco: { processed: number; synced: number; errors: number };
		recorrencias: { processed: number; synced: number; errors: number };
	};
};

function emptyTableSummary() {
	return { processed: 0, synced: 0, errors: 0 };
}

function createEmptySummary(): SyncSummary {
	return {
		processed: 0,
		synced: 0,
		errors: 0,
		tables: {
			pessoa: emptyTableSummary(),
			tipo_imobilizado: emptyTableSummary(),
			imobilizado: emptyTableSummary(),
			transacoes: emptyTableSummary(),
			banco: emptyTableSummary(),
			recorrencias: emptyTableSummary(),
		},
	};
}

function mergeSummary(target: SyncSummary, source: SyncSummary) {
	target.processed += source.processed;
	target.synced += source.synced;
	target.errors += source.errors;

	target.tables.pessoa.processed += source.tables.pessoa.processed;
	target.tables.pessoa.synced += source.tables.pessoa.synced;
	target.tables.pessoa.errors += source.tables.pessoa.errors;

	target.tables.tipo_imobilizado.processed += source.tables.tipo_imobilizado.processed;
	target.tables.tipo_imobilizado.synced += source.tables.tipo_imobilizado.synced;
	target.tables.tipo_imobilizado.errors += source.tables.tipo_imobilizado.errors;

	target.tables.imobilizado.processed += source.tables.imobilizado.processed;
	target.tables.imobilizado.synced += source.tables.imobilizado.synced;
	target.tables.imobilizado.errors += source.tables.imobilizado.errors;

	target.tables.transacoes.processed += source.tables.transacoes.processed;
	target.tables.transacoes.synced += source.tables.transacoes.synced;
	target.tables.transacoes.errors += source.tables.transacoes.errors;

	target.tables.banco.processed += source.tables.banco.processed;
	target.tables.banco.synced += source.tables.banco.synced;
	target.tables.banco.errors += source.tables.banco.errors;

	target.tables.recorrencias.processed += source.tables.recorrencias.processed;
	target.tables.recorrencias.synced += source.tables.recorrencias.synced;
	target.tables.recorrencias.errors += source.tables.recorrencias.errors;
}

async function getAuthUserId() {
	// Only cache a confirmed user ID — never cache null, so auth state changes are picked up
	if (cachedAuthUserId) return cachedAuthUserId;

	try {
		const { data, error } = await supabase.auth.getUser();
		if (error || !data?.user?.id) return null;
		cachedAuthUserId = data.user.id;
		return cachedAuthUserId;
	} catch {
		return null;
	}
}

async function backfillLocalOwnershipIfMissing() {
	if (!db || Platform.OS === "web") return;

	const userId = await getAuthUserId();
	if (!userId) return;

	const dataSync = nowISO();

	await db.runAsync(
		`
      UPDATE transacoes
      SET user_id = ?,
          data_sync = ?,
          sync_status = 'pending',
          synced = 0
      WHERE deleted = 0
        AND user_id IS NULL
        AND family_id IS NULL
    `,
		userId,
		dataSync
	);

	await db.runAsync(
		`
      UPDATE pessoa
      SET user_id = ?,
          data_sync = ?,
          sync_status = 'pending',
          synced = 0
      WHERE deleted = 0
        AND user_id IS NULL
        AND family_id IS NULL
    `,
		userId,
		dataSync
	);

	await db.runAsync(
		`
      UPDATE imobilizado
      SET user_id = ?,
          data_sync = ?,
          sync_status = 'pending',
          synced = 0
      WHERE deleted = 0
        AND user_id IS NULL
        AND family_id IS NULL
    `,
		userId,
		dataSync
	);
}

function toPessoaPayload(row: any) {
	return {
		nome: row.nome ?? "",
		family_id: row.family_id ?? null,
		is_family_shared: Number(row.is_family_shared ?? 0),
		user_id: row.user_id ?? null,
	};
}

function toTipoImobilizadoPayload(row: any) {
	return {
		nome: row.nome ?? "",
	};
}

async function resolveTipoImobilizadoRemoteId(localId?: number | null) {
	if (!db || !localId) return localId ?? null;

	const row = await db.getFirstAsync<any>(
		`
      SELECT remote_id
      FROM tipo_imobilizado
      WHERE id_tipo_imobilizado = ?
      LIMIT 1
    `,
		localId
	);

	return row?.remote_id ?? localId;
}

async function resolveTipoImobilizadoLocalId(remoteId?: number | null) {
	if (!db || !remoteId) return remoteId ?? null;

	const row = await db.getFirstAsync<any>(
		`
      SELECT id_tipo_imobilizado
      FROM tipo_imobilizado
      WHERE remote_id = ?
      LIMIT 1
    `,
		remoteId
	);

	return row?.id_tipo_imobilizado ?? null;
}

async function resolvePessoaRemoteId(localId?: number | null) {
	if (!db || !localId) return localId ?? null;

	const row = await db.getFirstAsync<any>(
		`
      SELECT remote_id
      FROM pessoa
      WHERE id_pessoa = ?
      LIMIT 1
    `,
		localId
	);

	return row?.remote_id ?? localId;
}

async function resolveBancoRemoteId(localId?: number | null) {
	if (!db || !localId) return localId ?? null;

	const row = await db.getFirstAsync<any>(
		`SELECT remote_id FROM banco WHERE id_banco = ? LIMIT 1`,
		localId
	);

	return row?.remote_id ?? localId;
}

async function resolveBancoLocalId(remoteId?: number | null) {
	if (!db || !remoteId) return remoteId ?? null;

	const row = await db.getFirstAsync<any>(
		`SELECT id_banco FROM banco WHERE remote_id = ? LIMIT 1`,
		remoteId
	);

	return row?.id_banco ?? null;
}

async function resolvePessoaLocalId(remoteId?: number | null) {
	if (!db || !remoteId) return remoteId ?? null;

	const row = await db.getFirstAsync<any>(
		`
      SELECT id_pessoa
      FROM pessoa
      WHERE remote_id = ?
      LIMIT 1
    `,
		remoteId
	);

	return row?.id_pessoa ?? null;
}

async function resolveImobilizadoRemoteId(localId?: number | null) {
	if (!db || !localId) return localId ?? null;

	const row = await db.getFirstAsync<any>(
		`
      SELECT remote_id
      FROM imobilizado
      WHERE id_imobilizado = ?
      LIMIT 1
    `,
		localId
	);

	return row?.remote_id ?? localId;
}

async function resolveImobilizadoLocalId(remoteId?: number | null) {
	if (!db || !remoteId) return remoteId ?? null;

	const row = await db.getFirstAsync<any>(
		`
      SELECT id_imobilizado
      FROM imobilizado
      WHERE remote_id = ?
      LIMIT 1
    `,
		remoteId
	);

	return row?.id_imobilizado ?? null;
}

async function toImobilizadoPayload(row: any) {
	const remoteTipo = await resolveTipoImobilizadoRemoteId(row.id_tipo_imobilizado ?? null);

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

async function toTransacaoPayload(row: any) {
	const remotePessoa = await resolvePessoaRemoteId(row.id_pessoa ?? null);
	const remoteImobilizado = await resolveImobilizadoRemoteId(row.id_imobilizado ?? null);
	const remoteBanco = await resolveBancoRemoteId(row.id_banco ?? null);

	return {
		tipo: row.tipo,
		valor: Number(row.valor ?? 0),
		categoria: row.categoria,
		id_pessoa: remotePessoa,
		pessoa: row.pessoa ?? null,
		id_imobilizado: remoteImobilizado,
		id_banco: remoteBanco,
		family_id: row.family_id ?? null,
		is_family_shared: Number(row.is_family_shared ?? 0),
		user_id: row.user_id ?? null,
		data_transacao: row.data_transacao ?? nowISO(),
		data_vencimento: row.data_vencimento ?? null,
		data_baixa: row.data_baixa ?? null,
		status: row.status ?? "pendente",
		observacao: row.observacao ?? null,
		created_at: row.created_at ?? nowISO(),
		updated_at: row.updated_at ?? nowISO(),
		json: row.json ?? null,
	};
}

async function upsertRemotePessoaLocally(remote: any) {
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

async function upsertRemoteTipoImobilizadoLocally(remote: any) {
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
			String(existing?.sync_status || "") === "synced" &&
			Number(existing?.synced || 0) === 1
		) {
			return existing;
		}

		await db.runAsync(
			`
        UPDATE tipo_imobilizado
        SET nome = COALESCE(?, nome),
            data_sync = ?,
            sync_status = 'synced',
            synced = 1,
            deleted = 0
        WHERE id_tipo_imobilizado = ?
      `,
			remote.nome ?? null,
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
        data_sync,
        sync_status,
        synced,
        deleted
      ) VALUES (?, ?, ?, 'synced', 1, 0)
    `,
		remote.id_tipo_imobilizado,
		remote.nome ?? "",
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

async function upsertRemoteImobilizadoLocally(remote: any) {
	if (!db || !remote?.id_imobilizado) return null;

	const localTipoId = await resolveTipoImobilizadoLocalId(remote.id_tipo_imobilizado ?? null);
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

async function markAsSynced(localId: number, remoteId?: number | null) {
	if (!db) return;
	await db.runAsync(
		`
      UPDATE transacoes
      SET synced = 1,
          sync_status = 'synced',
          data_sync = ?,
          remote_id = COALESCE(?, remote_id)
      WHERE id_transacao = ?
    `,
		nowISO(),
		remoteId ?? null,
		localId
	);
}

async function markAsError(localId: number) {
	if (!db) return;
	await db.runAsync(
		`
      UPDATE transacoes
      SET sync_status = 'error',
          synced = 0,
          data_sync = ?
      WHERE id_transacao = ?
    `,
		nowISO(),
		localId
	);
}

async function markRowAsSynced(table: string, idColumn: string, localId: number, remoteId?: number | null) {
	if (!db) return;

	await db.runAsync(
		`
      UPDATE ${table}
      SET synced = 1,
          sync_status = 'synced',
          data_sync = ?,
          remote_id = COALESCE(?, remote_id)
      WHERE ${idColumn} = ?
    `,
		nowISO(),
		remoteId ?? null,
		localId
	);
}

async function markRowAsError(table: string, idColumn: string, localId: number) {
	if (!db) return;

	await db.runAsync(
		`
      UPDATE ${table}
      SET sync_status = 'error',
          synced = 0,
          data_sync = ?
      WHERE ${idColumn} = ?
    `,
		nowISO(),
		localId
	);
}

async function syncTable(
	table: "pessoa" | "tipo_imobilizado" | "imobilizado",
	idColumn: string,
	remotePkColumn: string,
	toPayload: (row: any) => Promise<any> | any
) {
	if (!db || Platform.OS === "web") return createEmptySummary();

	const summary = createEmptySummary();

	const rows = await db.getAllAsync<any>(
		`
      SELECT *
      FROM ${table}
			WHERE (sync_status = 'pending' OR sync_status = 'error' OR synced = 0)
      ORDER BY ${idColumn} ASC
      LIMIT 100
    `
	);

	for (const row of rows) {
		summary.processed += 1;
		summary.tables[table].processed += 1;

		try {
			if (Number(row?.deleted || 0) === 1) {
				if (row.remote_id) {
					if (table === "pessoa") {
						const { error: unlinkError } = await supabase
							.from("transacoes")
							.update({
								id_pessoa: null,
								pessoa: row?.nome ?? null,
								updated_at: nowISO(),
							})
							.eq("id_pessoa", row.remote_id);

						if (unlinkError) throw unlinkError;
					}

					if (table === "imobilizado") {
						const { error: unlinkError } = await supabase
							.from("transacoes")
							.update({
								id_imobilizado: null,
								updated_at: nowISO(),
							})
							.eq("id_imobilizado", row.remote_id);

						if (unlinkError) throw unlinkError;
					}

					const { error } = await supabase.from(table).delete().eq(remotePkColumn, row.remote_id);
					if (error) throw error;
				}

				await markRowAsSynced(table, idColumn, row[idColumn], row.remote_id ?? null);
				summary.synced += 1;
				summary.tables[table].synced += 1;
				continue;
			}

			const payload = await toPayload(row);

			if (row.remote_id) {
				const { error } = await supabase
					.from(table)
					.update(payload)
					.eq(remotePkColumn, row.remote_id);

				if (error) throw error;

				await markRowAsSynced(table, idColumn, row[idColumn], row.remote_id);
			} else {
				const { data: inserted, error } = await supabase
					.from(table)
					.insert(payload)
					.select(remotePkColumn)
					.single();

				if (error) throw error;

				const remoteInsertedId = (inserted as any)?.[remotePkColumn] ?? null;
				await markRowAsSynced(table, idColumn, row[idColumn], remoteInsertedId);
			}

			summary.synced += 1;
			summary.tables[table].synced += 1;
		} catch (error) {
			await markRowAsError(table, idColumn, row[idColumn]);
			summary.errors += 1;
			summary.tables[table].errors += 1;
			console.warn("[syncTable] erro", table, row?.[idColumn], error);
			continue;
		}
	}

	return summary;
}

async function syncPendingTransacoesInternal() {
	if (!db || Platform.OS === "web") return createEmptySummary();

	const summary = createEmptySummary();

	const rows = await db.getAllAsync<any>(
		`
      SELECT *
      FROM transacoes
			WHERE (sync_status = 'pending' OR sync_status = 'error' OR synced = 0)
      ORDER BY id_transacao ASC
      LIMIT 100
    `
	);

	if (!rows.length) return summary;

	for (const row of rows) {
		summary.processed += 1;
		summary.tables.transacoes.processed += 1;

		try {
			if (Number(row?.deleted || 0) === 1) {
				if (row.remote_id) {
					const { error } = await supabase
						.from("transacoes")
						.update({ deleted: 1, updated_at: nowISO() })
						.eq("id_transacao", row.remote_id);
					if (error) throw error;
				}

				await markAsSynced(row.id_transacao, row.remote_id ?? null);
				summary.synced += 1;
				summary.tables.transacoes.synced += 1;
				continue;
			}

			const payload = await toTransacaoPayload(row);

			if (row.remote_id) {
				const { error } = await supabase
					.from("transacoes")
					.update({
						...payload,
						updated_at: nowISO(),
					})
					.eq("id_transacao", row.remote_id);

				if (error) throw error;

				await markAsSynced(row.id_transacao, row.remote_id);
			} else {
				const { data: inserted, error } = await supabase
					.from("transacoes")
					.insert(payload)
					.select("id_transacao")
					.single();

				if (error) throw error;

				await markAsSynced(row.id_transacao, inserted?.id_transacao ?? null);
			}

			summary.synced += 1;
			summary.tables.transacoes.synced += 1;
		} catch (error) {
			await markAsError(row.id_transacao);
			summary.errors += 1;
			summary.tables.transacoes.errors += 1;
			console.warn("[syncTransacoes] erro", row?.id_transacao, error);
			continue;
		}
	}

	return summary;
}

async function fetchRemoteTableRows(table: "pessoa" | "tipo_imobilizado" | "imobilizado" | "transacoes") {
	const orderColumn =
		table === "pessoa"
			? "id_pessoa"
			: table === "tipo_imobilizado"
				? "id_tipo_imobilizado"
				: table === "imobilizado"
					? "id_imobilizado"
					: "id_transacao";

	const { data, error } = await supabase
		.from(table)
		.select("*")
		.order(orderColumn, { ascending: true });

	if (error) throw error.message;
	return Array.isArray(data) ? data : [];
}

async function syncRemoteTableDown(
	table: "pessoa" | "tipo_imobilizado" | "imobilizado" | "transacoes"
): Promise<SyncSummary> {
	if (!db || Platform.OS === "web") return createEmptySummary();

	const summary = createEmptySummary();
	const rows = await fetchRemoteTableRows(table);

	for (const row of rows) {
		summary.processed += 1;
		summary.tables[table].processed += 1;

		try {
			if (table === "pessoa") {
				await upsertRemotePessoaLocally(row);
			} else if (table === "tipo_imobilizado") {
				await upsertRemoteTipoImobilizadoLocally(row);
			} else if (table === "imobilizado") {
				await upsertRemoteImobilizadoLocally(row);
			} else {
				await upsertRemoteTransacaoLocally(row);
			}

			summary.synced += 1;
			summary.tables[table].synced += 1;
		} catch {
			summary.errors += 1;
			summary.tables[table].errors += 1;
		}
	}

	return summary;
}

async function upsertRemoteBancoLocally(remote: any) {
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
			remote_id, nome, cor_hex, user_id, family_id, is_family_shared,
			data_sync, sync_status, synced, deleted
		) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', 1, 0)
		`,
		remote.id_banco,
		remote.nome ?? "",
		remote.cor_hex ?? "#6B7280",
		remote.user_id ?? null,
		remote.family_id ?? null,
		Number(remote.is_family_shared ?? 0),
		nowISO()
	);

	return db.getFirstAsync<any>(`SELECT * FROM banco WHERE id_banco = ? LIMIT 1`, inserted.lastInsertRowId);
}

async function syncBancoInternal(): Promise<SyncSummary> {
	if (!db || Platform.OS === "web") return createEmptySummary();

	const summary = createEmptySummary();

	const rows = await db.getAllAsync<any>(
		`
		SELECT * FROM banco
		WHERE (sync_status = 'pending' OR sync_status = 'error' OR synced = 0)
		ORDER BY id_banco ASC
		LIMIT 100
		`
	);

	for (const row of rows) {
		summary.processed += 1;
		summary.tables.banco.processed += 1;

		try {
			if (Number(row?.deleted || 0) === 1) {
				if (row.remote_id) {
					const { error: unlinkError } = await supabase
						.from("transacoes")
						.update({ id_banco: null, updated_at: nowISO() })
						.eq("id_banco", row.remote_id);
					if (unlinkError) throw unlinkError;

					const { error } = await supabase.from("banco").delete().eq("id_banco", row.remote_id);
					if (error) throw error;
				}

				await markRowAsSynced("banco", "id_banco", row.id_banco, row.remote_id ?? null);
				summary.synced += 1;
				summary.tables.banco.synced += 1;
				continue;
			}

			const payload = {
				nome: row.nome,
				cor_hex: row.cor_hex,
				user_id: row.user_id ?? null,
				family_id: row.family_id ?? null,
				is_family_shared: Number(row.is_family_shared ?? 0),
			};

			if (row.remote_id) {
				const { error } = await supabase.from("banco").update(payload).eq("id_banco", row.remote_id);
				if (error) throw error;
				await markRowAsSynced("banco", "id_banco", row.id_banco, row.remote_id);
			} else {
				const { data: inserted, error } = await supabase
					.from("banco")
					.insert(payload)
					.select("id_banco")
					.single();
				if (error) throw error;
				await markRowAsSynced("banco", "id_banco", row.id_banco, (inserted as any)?.id_banco ?? null);
			}

			summary.synced += 1;
			summary.tables.banco.synced += 1;
		} catch (error) {
			await markRowAsError("banco", "id_banco", row.id_banco);
			summary.errors += 1;
			summary.tables.banco.errors += 1;
			console.warn("[syncBanco] erro", row?.id_banco, error);
		}
	}

	return summary;
}

async function syncRemoteBancoDown(): Promise<SyncSummary> {
	if (!db || Platform.OS === "web") return createEmptySummary();

	const { data, error } = await supabase
		.from("banco")
		.select("*")
		.order("id_banco", { ascending: true });

	if (error) throw error.message;

	const summary = createEmptySummary();
	const rows = Array.isArray(data) ? data : [];

	for (const row of rows) {
		summary.processed += 1;
		summary.tables.banco.processed += 1;

		try {
			await upsertRemoteBancoLocally(row);
			summary.synced += 1;
			summary.tables.banco.synced += 1;
		} catch {
			summary.errors += 1;
			summary.tables.banco.errors += 1;
		}
	}

	return summary;
}

async function syncPendingRecorrencias(summary: SyncSummary) {
	if (!db || Platform.OS === "web") return;
	const userId = await getAuthUserId();
	if (!userId) return;

	const pendingRows = await db.getAllAsync<any>(
		`SELECT * FROM recorrencias
         WHERE deleted = 0
           AND sync_status = 'pending'
           AND user_id = ?
         ORDER BY id_recurrencia ASC
         LIMIT 100`,
		userId
	);

	for (const row of pendingRows ?? []) {
		summary.tables.recorrencias.processed += 1;
		summary.processed += 1;
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
			summary.tables.recorrencias.synced += 1;
			summary.synced += 1;
		} catch {
			summary.tables.recorrencias.errors += 1;
			summary.errors += 1;
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
           AND sync_status = 'pending'
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

async function syncAllPendingInternal(onProgress?: (step: string) => void) {
	onProgress?.("Verificando dados locais...");
	await backfillLocalOwnershipIfMissing();

	const full = createEmptySummary();

	onProgress?.("Enviando pessoas...");
	const pessoaSummary = await syncTable("pessoa", "id_pessoa", "id_pessoa", toPessoaPayload);
	mergeSummary(full, pessoaSummary);

	onProgress?.("Enviando tipos...");
	const tipoSummary = await syncTable(
		"tipo_imobilizado",
		"id_tipo_imobilizado",
		"id_tipo_imobilizado",
		toTipoImobilizadoPayload
	);
	mergeSummary(full, tipoSummary);

	onProgress?.("Enviando bens...");
	const imobilizadoSummary = await syncTable(
		"imobilizado",
		"id_imobilizado",
		"id_imobilizado",
		toImobilizadoPayload
	);
	mergeSummary(full, imobilizadoSummary);

	onProgress?.("Enviando lançamentos...");
	const transacoesSummary = await syncPendingTransacoesInternal();
	mergeSummary(full, transacoesSummary);

	onProgress?.("Enviando bancos...");
	const bancoSummary = await syncBancoInternal();
	mergeSummary(full, bancoSummary);

	onProgress?.("Baixando dados do servidor...");
	const pessoaDown = await syncRemoteTableDown("pessoa");
	mergeSummary(full, pessoaDown);

	const tipoDown = await syncRemoteTableDown("tipo_imobilizado");
	mergeSummary(full, tipoDown);

	const imobilizadoDown = await syncRemoteTableDown("imobilizado");
	mergeSummary(full, imobilizadoDown);

	const transacoesDown = await syncRemoteTableDown("transacoes");
	mergeSummary(full, transacoesDown);

	onProgress?.("Atualizando bancos...");
	const bancoDown = await syncRemoteBancoDown();
	mergeSummary(full, bancoDown);

	onProgress?.("Enviando recorrências...");
	await syncPendingRecorrencias(full);

	return full;
}

export async function syncAllPendingData(options?: { force?: boolean; throwOnError?: boolean; onProgress?: (step: string) => void }) {
	if (Platform.OS === "web") return;

	const force = !!options?.force;
	const throwOnError = !!options?.throwOnError;
	const now = Date.now();

	if (!force && now - lastSyncAttemptAt < SYNC_COOLDOWN_MS) {
		return createEmptySummary();
	}

	if (syncInFlight) {
		return syncInFlight;
	}

	lastSyncAttemptAt = now;
	syncInFlight = (async () => {
		let summary = createEmptySummary();
		try {
			summary = await syncAllPendingInternal(options?.onProgress);

			if (throwOnError && summary.errors > 0) {
				throw new Error("Falha ao sincronizar alguns registros com o Supabase");
			}

			return summary;
		} finally {
			syncInFlight = null;
		}
	})();

	return syncInFlight;
}

export async function syncPendingTransacoes(options?: { force?: boolean }) {
	return syncAllPendingData({ force: options?.force });
}

export async function fetchRemoteTransacaoById(id: number) {
	const { data, error } = await supabase
		.from("transacoes")
		.select("*")
		.eq("id_transacao", id)
		.maybeSingle();

	if (error) throw error.message;
	return data ?? null;
}

export async function upsertRemoteTransacaoLocally(remote: any) {
	if (!db || !remote?.id_transacao) return null;

	const remoteDeleted = Number(remote.deleted ?? 0) === 1;
	const localPessoaId = await resolvePessoaLocalId(remote.id_pessoa ?? null);
	const localImobilizadoId = await resolveImobilizadoLocalId(remote.id_imobilizado ?? null);
	const localBancoId = await resolveBancoLocalId(remote.id_banco ?? null);

	const existingByRemote = await db.getFirstAsync<any>(
		`
      SELECT *
      FROM transacoes
      WHERE remote_id = ?
      LIMIT 1
    `,
		remote.id_transacao
	);

	if (existingByRemote) {
		// Se o registro foi deletado remotamente, propagar a deleção para o local
		if (remoteDeleted && Number(existingByRemote?.deleted || 0) === 0) {
			await db.runAsync(
				`UPDATE transacoes
				 SET deleted = 1, sync_status = 'synced', synced = 1, data_sync = ?
				 WHERE id_transacao = ?`,
				nowISO(),
				existingByRemote.id_transacao
			);
			return null;
		}

		if (Number(existingByRemote?.deleted || 0) === 1) return existingByRemote;

		const isSameRow =
			String(existingByRemote?.tipo || "") === String(remote?.tipo || "") &&
			Number(existingByRemote?.valor || 0) === Number(remote?.valor || 0) &&
			String(existingByRemote?.categoria || "") === String(remote?.categoria || "") &&
			Number(existingByRemote?.id_pessoa || 0) === Number(localPessoaId || 0) &&
			String(existingByRemote?.pessoa || "") === String(remote?.pessoa || "") &&
			Number(existingByRemote?.id_imobilizado || 0) === Number(localImobilizadoId || 0) &&
			Number(existingByRemote?.id_banco || 0) === Number(localBancoId || 0) &&
			Number(existingByRemote?.family_id || 0) === Number(remote?.family_id || 0) &&
			Number(existingByRemote?.is_family_shared || 0) === Number(remote?.is_family_shared || 0) &&
			String(existingByRemote?.user_id || "") === String(remote?.user_id || "") &&
			String(existingByRemote?.data_transacao || "") === String(remote?.data_transacao || "") &&
			String(existingByRemote?.data_vencimento || "") === String(remote?.data_vencimento || "") &&
			String(existingByRemote?.data_baixa || "") === String(remote?.data_baixa || "") &&
			String(existingByRemote?.status || "") === String(remote?.status || "") &&
			String(existingByRemote?.observacao || "") === String(remote?.observacao || "") &&
			String(existingByRemote?.json || "") === String(remote?.json || "") &&
			String(existingByRemote?.sync_status || "") === "synced" &&
			Number(existingByRemote?.synced || 0) === 1;

		if (isSameRow) {
			return existingByRemote;
		}

		await db.runAsync(
			`
        UPDATE transacoes
        SET tipo = COALESCE(?, tipo),
            valor = COALESCE(?, valor),
            categoria = COALESCE(?, categoria),
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
            updated_at = ?,
            data_sync = ?,
            sync_status = 'synced',
            synced = 1,
            deleted = 0,
            json = ?
        WHERE id_transacao = ?
      `,
			remote.tipo ?? null,
			remote.valor ?? null,
			remote.categoria ?? null,
			localPessoaId,
			remote.pessoa ?? null,
			localImobilizadoId,
			localBancoId,
			remote.family_id ?? null,
			Number(remote.is_family_shared ?? 0),
			remote.user_id ?? null,
			remote.data_transacao ?? null,
			remote.data_vencimento ?? null,
			remote.data_baixa ?? null,
			remote.status ?? null,
			remote.observacao ?? null,
			remote.updated_at ?? nowISO(),
			nowISO(),
			remote.json ?? null,
			existingByRemote.id_transacao
		);

		return db.getFirstAsync<any>(
			`
        SELECT *
        FROM transacoes
        WHERE id_transacao = ?
        LIMIT 1
      `,
			existingByRemote.id_transacao
		);
	}

	// Não inserir localmente um registro que já foi deletado remotamente
	if (remoteDeleted) return null;

	const inserted = await db.runAsync(
		`
      INSERT INTO transacoes (
        remote_id,
        tipo,
        valor,
        categoria,
        id_pessoa,
        pessoa,
        id_imobilizado,
        id_banco,
		family_id,
		is_family_shared,
		user_id,
        data_transacao,
        data_vencimento,
        data_baixa,
        status,
        observacao,
        json,
        created_at,
        updated_at,
        data_sync,
        sync_status,
        synced,
        deleted
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
		remote.id_transacao,
		remote.tipo ?? null,
		remote.valor ?? 0,
		remote.categoria ?? null,
		localPessoaId,
		remote.pessoa ?? null,
		localImobilizadoId,
		localBancoId,
		remote.family_id ?? null,
		Number(remote.is_family_shared ?? 0),
		remote.user_id ?? null,
		remote.data_transacao ?? nowISO(),
		remote.data_vencimento ?? null,
		remote.data_baixa ?? null,
		remote.status ?? "pendente",
		remote.observacao ?? null,
		remote.json ?? null,
		remote.created_at ?? nowISO(),
		remote.updated_at ?? null,
		nowISO(),
		"synced",
		1,
		0,
	);

	return db.getFirstAsync<any>(
		`
      SELECT *
      FROM transacoes
      WHERE id_transacao = ?
      LIMIT 1
    `,
		inserted.lastInsertRowId
	);
}
