import { db, nowISO } from "@/services/database/db";
import { RecurrenceDatabase, TransacaoDatabase } from "@/services/database/types";
import { atNoonISO } from "./recurrenceDates";

export type SeedTransacaoPayload = Omit<TransacaoDatabase, "id_transacao" | "created_at" | "updated_at">;

export type RecurrenceCreateConfig = {
	frequency: import("@/services/database/types").RecurrenceFrequency;
	endDate?: string | null;
	skipNonWorking?: boolean;
	skipDirection?: "before" | "after" | null;
};

export function generateRecurrenceUuid() {
	return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildTemplatePayload(data: SeedTransacaoPayload) {
	return {
		tipo: data.tipo,
		valor: data.valor,
		id_categoria: data.id_categoria ?? null,
		id_pessoa: data.id_pessoa ?? null,
		pessoa: data.pessoa ?? null,
		id_imobilizado: data.id_imobilizado ?? null,
		status: data.status ?? "pendente",
		observacao: data.observacao ?? null,
		json: data.json ?? null,
		family_id: data.family_id ?? null,
		is_family_shared: Number(data.is_family_shared ?? 0),
		user_id: data.user_id ?? null,
	};
}

export async function insertGeneratedTransacaoLocal(payload: SeedTransacaoPayload, dueDate: string) {
	if (!db) throw new Error("Banco local indisponivel");

	const template = buildTemplatePayload(payload);
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
		family_id,
		is_family_shared,
		user_id,
        data_transacao,
        data_vencimento,
        status,
        observacao,
        json,
        created_at,
        updated_at,
        data_sync,
        sync_status,
        synced,
        deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
		null,
		template.tipo,
		template.valor,
		template.id_categoria ?? null,
		template.id_pessoa,
		template.pessoa,
		template.id_imobilizado,
		template.family_id,
		template.is_family_shared,
		template.user_id,
		atNoonISO(dueDate),
		dueDate,
		template.status,
		template.observacao,
		template.json,
		nowISO(),
		nowISO(),
		null,
		"pending",
		0,
		0
	);

	return Number(insertResult.lastInsertRowId);
}

export async function loadRecurrenceByUuid(uuid: string) {
	if (!db) return null;
	return db.getFirstAsync<RecurrenceDatabase>(
		`
      SELECT *
      FROM recorrencias
      WHERE uuid = ?
        AND deleted = 0
      LIMIT 1
    `,
		uuid
	);
}
