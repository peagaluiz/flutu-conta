import { supabase } from "@/services/supabase/client";
import { db, nowISO } from "@/services/database/db";

// Tradução id local <-> remote_id. Antes eram 7 pares de funções idênticas,
// diferindo só no nome da tabela e da PK.

export type ResolvableTable =
	| "pessoa"
	| "tipo_imobilizado"
	| "imobilizado"
	| "banco"
	| "cartao_faturas"
	| "transacoes";

const ID_COLUMN: Record<ResolvableTable, string> = {
	pessoa: "id_pessoa",
	tipo_imobilizado: "id_tipo_imobilizado",
	imobilizado: "id_imobilizado",
	banco: "id_banco",
	cartao_faturas: "id_fatura",
	transacoes: "id_transacao",
};

// Transações são o único caso em que um id local sem remote_id não pode ser
// reaproveitado como id remoto: o payload precisa de null para não apontar errado.
const FALLBACK_TO_LOCAL_ID: Record<ResolvableTable, boolean> = {
	pessoa: true,
	tipo_imobilizado: true,
	imobilizado: true,
	banco: true,
	cartao_faturas: true,
	transacoes: false,
};

export function idColumnOf(table: ResolvableTable) {
	return ID_COLUMN[table];
}

export async function resolveRemoteId(table: ResolvableTable, localId?: number | null) {
	if (!db || !localId) return localId ?? null;

	const row = await db.getFirstAsync<any>(
		`SELECT remote_id FROM ${table} WHERE ${ID_COLUMN[table]} = ? LIMIT 1`,
		localId
	);

	return row?.remote_id ?? (FALLBACK_TO_LOCAL_ID[table] ? localId : null);
}

export async function resolveLocalId(table: ResolvableTable, remoteId?: number | null) {
	if (!db || !remoteId) return remoteId ?? null;

	const row = await db.getFirstAsync<any>(
		`SELECT ${ID_COLUMN[table]} FROM ${table} WHERE remote_id = ? LIMIT 1`,
		remoteId
	);

	return row?.[ID_COLUMN[table]] ?? null;
}

export async function markRowAsSynced(
	table: string,
	idColumn: string,
	localId: number,
	remoteId?: number | null
) {
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

export async function markRowAsError(table: string, idColumn: string, localId: number) {
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

let cachedAuthUserId: string | null | undefined;

export async function getAuthUserId() {
	// Só cacheia um id confirmado — nunca null, para não travar troca de sessão.
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
