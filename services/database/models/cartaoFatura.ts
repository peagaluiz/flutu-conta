import { db, nowISO } from "@/services/database/db";
import { resolveLocalId, resolveRemoteId } from "@/services/database/sync/resolvers";
import type { SyncModel } from "./types";

async function toRemotePayload(row: any) {
	const remoteBanco = await resolveRemoteId("banco", row.id_banco ?? null);
	const remotePagamento = await resolveRemoteId("transacoes", row.id_transacao_pagamento ?? null);

	return {
		id_banco: remoteBanco,
		mes_referencia: row.mes_referencia,
		data_fechamento: row.data_fechamento ?? null,
		data_vencimento: row.data_vencimento ?? null,
		valor_total: Number(row.valor_total ?? 0),
		status: row.status ?? "aberta",
		id_transacao_pagamento: remotePagamento,
		family_id: row.family_id ?? null,
		is_family_shared: Number(row.is_family_shared ?? 0),
		user_id: row.user_id ?? null,
	};
}

async function fromRemote(remote: any) {
	if (!db || !remote?.id_fatura) return null;

	const localBancoId = await resolveLocalId("banco", remote.id_banco ?? null);
	const localPagamentoId = await resolveLocalId("transacoes", remote.id_transacao_pagamento ?? null);

	const existing = await db.getFirstAsync<any>(
		`SELECT * FROM cartao_faturas WHERE remote_id = ? LIMIT 1`,
		remote.id_fatura
	);

	if (existing) {
		if (Number(existing?.deleted || 0) === 1) return existing;

		await db.runAsync(
			`
			UPDATE cartao_faturas
			SET id_banco = COALESCE(?, id_banco),
				mes_referencia = COALESCE(?, mes_referencia),
				data_fechamento = ?,
				data_vencimento = ?,
				valor_total = ?,
				status = COALESCE(?, status),
				id_transacao_pagamento = ?,
				family_id = ?,
				is_family_shared = ?,
				user_id = COALESCE(?, user_id),
				data_sync = ?,
				sync_status = 'synced',
				synced = 1,
				deleted = 0
			WHERE id_fatura = ?
			`,
			localBancoId,
			remote.mes_referencia ?? null,
			remote.data_fechamento ?? null,
			remote.data_vencimento ?? null,
			Number(remote.valor_total ?? 0),
			remote.status ?? null,
			localPagamentoId,
			remote.family_id ?? null,
			Number(remote.is_family_shared ?? 0),
			remote.user_id ?? null,
			nowISO(),
			existing.id_fatura
		);
		return db.getFirstAsync<any>(`SELECT * FROM cartao_faturas WHERE id_fatura = ? LIMIT 1`, existing.id_fatura);
	}

	const inserted = await db.runAsync(
		`
		INSERT INTO cartao_faturas (
			remote_id, id_banco, mes_referencia, data_fechamento, data_vencimento, valor_total,
			status, id_transacao_pagamento, family_id, is_family_shared, user_id,
			data_sync, sync_status, synced, deleted
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', 1, 0)
		`,
		remote.id_fatura,
		localBancoId,
		remote.mes_referencia ?? null,
		remote.data_fechamento ?? null,
		remote.data_vencimento ?? null,
		Number(remote.valor_total ?? 0),
		remote.status ?? "aberta",
		localPagamentoId,
		remote.family_id ?? null,
		Number(remote.is_family_shared ?? 0),
		remote.user_id ?? null,
		nowISO()
	);
	return db.getFirstAsync<any>(`SELECT * FROM cartao_faturas WHERE id_fatura = ? LIMIT 1`, inserted.lastInsertRowId);
}

export const cartaoFaturaModel: SyncModel = {
	table: "cartao_faturas",
	idColumn: "id_fatura",
	remotePk: "id_fatura",
	deleteMode: "soft",
	touchUpdatedAt: true,
	toRemotePayload,
	fromRemote,
};
