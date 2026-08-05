import { db, nowISO } from "@/services/database/db";
import { TransacaoDatabase } from "@/services/database/types";

// Normalização e escrita local de transações — a montagem da linha, separada das
// queries do repositório.

export function normalizeTransacaoPessoa<
	T extends {
		pessoa?: string | null;
		pessoa_rel?: { nome?: string | null } | null;
		categoria?: string | null;
		categoria_rel?: { nome?: string | null } | null;
		family_id?: number | null;
		is_family_shared?: number | boolean | null;
	}
>(row: T, fallbackFamilyId?: number | null) {
	const { pessoa_rel, categoria_rel, ...rest } = row as T & {
		pessoa_rel?: { nome?: string | null } | null;
		categoria_rel?: { nome?: string | null } | null;
	};
	const shouldFallbackFamily =
		(rest.family_id == null || Number(rest.family_id) <= 0) &&
		Number(rest.is_family_shared ?? 0) === 1 &&
		Number(fallbackFamilyId ?? 0) > 0;

	return {
		...rest,
		pessoa: pessoa_rel?.nome ?? rest.pessoa ?? null,
		categoria: categoria_rel?.nome ?? rest.categoria ?? null,
		family_id: shouldFallbackFamily ? Number(fallbackFamilyId) : rest.family_id ?? null,
	};
}

export async function insertTransacaoLocal(
	data: Omit<TransacaoDatabase, "id_transacao" | "created_at" | "updated_at">
) {
	if (!db) throw new Error("Banco local indisponivel");

	const insertResult = await db.runAsync(
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
		null,
		data.tipo,
		data.valor,
		data.id_categoria ?? null,
		data.id_pessoa ?? null,
		data.pessoa ?? null,
		data.id_imobilizado ?? null,
		data.id_banco ?? null,
		data.family_id ?? null,
		Number(data.is_family_shared ?? 0),
		data.user_id ?? null,
		data.data_transacao ?? nowISO(),
		data.data_vencimento ?? null,
		data.data_baixa ?? null,
		data.status ?? "pendente",
		data.observacao ?? null,
		data.json ?? null,
		data.id_fatura ?? null,
		data.parcela_atual ?? null,
		data.parcela_total ?? null,
		data.ofx_fitid ?? null,
		nowISO(),
		nowISO(),
		null,
		"pending",
		0,
		0
	);

	return { insertId: String(insertResult.lastInsertRowId), skipped: false };
}
