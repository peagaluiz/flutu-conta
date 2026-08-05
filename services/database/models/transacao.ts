import { db, nowISO } from "@/services/database/db";
import { resolveLocalId, resolveRemoteId } from "@/services/database/sync/resolvers";
import type { SyncModel } from "./types";

async function toRemotePayload(row: any) {
	const remotePessoa = await resolveRemoteId("pessoa", row.id_pessoa ?? null);
	const remoteImobilizado = await resolveRemoteId("imobilizado", row.id_imobilizado ?? null);
	const remoteBanco = await resolveRemoteId("banco", row.id_banco ?? null);
	const remoteFatura = await resolveRemoteId("cartao_faturas", row.id_fatura ?? null);

	return {
		tipo: row.tipo,
		valor: Number(row.valor ?? 0),
		id_categoria: row.id_categoria ?? null,
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
		id_fatura: remoteFatura,
		parcela_atual: row.parcela_atual ?? null,
		parcela_total: row.parcela_total ?? null,
		ofx_fitid: row.ofx_fitid ?? null,
		created_at: row.created_at ?? nowISO(),
		updated_at: row.updated_at ?? nowISO(),
		json: row.json ?? null,
	};
}

export async function upsertRemoteTransacaoLocally(remote: any) {
	if (!db || !remote?.id_transacao) return null;

	const remoteDeleted = Number(remote.deleted ?? 0) === 1;
	const localPessoaId = await resolveLocalId("pessoa", remote.id_pessoa ?? null);
	const localImobilizadoId = await resolveLocalId("imobilizado", remote.id_imobilizado ?? null);
	const localBancoId = await resolveLocalId("banco", remote.id_banco ?? null);
	const localFaturaId = await resolveLocalId("cartao_faturas", remote.id_fatura ?? null);

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
			Number(existingByRemote?.id_categoria || 0) === Number(remote?.id_categoria || 0) &&
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
			Number(existingByRemote?.id_fatura || 0) === Number(localFaturaId || 0) &&
			Number(existingByRemote?.parcela_atual || 0) === Number(remote?.parcela_atual || 0) &&
			Number(existingByRemote?.parcela_total || 0) === Number(remote?.parcela_total || 0) &&
			String(existingByRemote?.ofx_fitid || "") === String(remote?.ofx_fitid || "") &&
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
            id_fatura = ?,
            parcela_atual = ?,
            parcela_total = ?,
            ofx_fitid = ?,
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
			remote.id_categoria ?? null,
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
			localFaturaId,
			remote.parcela_atual ?? null,
			remote.parcela_total ?? null,
			remote.ofx_fitid ?? null,
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
        id_categoria,
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
        id_fatura,
        parcela_atual,
        parcela_total,
        ofx_fitid,
        created_at,
        updated_at,
        data_sync,
        sync_status,
        synced,
        deleted
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
		remote.id_transacao,
		remote.tipo ?? null,
		remote.valor ?? 0,
		remote.id_categoria ?? null,
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
		localFaturaId,
		remote.parcela_atual ?? null,
		remote.parcela_total ?? null,
		remote.ofx_fitid ?? null,
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

export const transacaoModel: SyncModel = {
	table: "transacoes",
	idColumn: "id_transacao",
	remotePk: "id_transacao",
	deleteMode: "soft",
	touchUpdatedAt: true,
	toRemotePayload,
	fromRemote: upsertRemoteTransacaoLocally,
};
