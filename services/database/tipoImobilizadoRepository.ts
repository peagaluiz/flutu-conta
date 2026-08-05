import { supabase } from "@/services/supabase/client";
import { db, nowISO } from "@/services/database/db";

// Todo imobilizado precisa de um tipo; o app não expõe cadastro de tipos, então
// garantimos um tipo "Geral" por usuário sob demanda.
const DEFAULT_TIPO_NOME = "Geral";

export async function ensureDefaultTipoImobilizadoLocal(userId: string | null) {
	if (!db || !userId) return null;

	const existing = await db.getFirstAsync<any>(
		`
      SELECT id_tipo_imobilizado
      FROM tipo_imobilizado
      WHERE deleted = 0 AND user_id = ?
      ORDER BY id_tipo_imobilizado ASC
      LIMIT 1
    `,
		userId
	);

	if (existing?.id_tipo_imobilizado) return existing.id_tipo_imobilizado as number;

	const inserted = await db.runAsync(
		`
      INSERT INTO tipo_imobilizado (
        nome,
        user_id,
        data_sync,
        sync_status,
        synced,
        deleted
      ) VALUES (?, ?, ?, 'pending', 0, 0)
    `,
		DEFAULT_TIPO_NOME,
		userId,
		nowISO()
	);

	return Number(inserted.lastInsertRowId);
}

export async function ensureDefaultTipoImobilizadoRemote(userId: string | null) {
	const { data: tipos, error: tipoError } = await supabase
		.from("tipo_imobilizado")
		.select("id_tipo_imobilizado")
		.eq("user_id", userId)
		.limit(1);

	if (tipoError) throw tipoError.message;

	const tipoId = tipos?.[0]?.id_tipo_imobilizado ?? null;
	if (tipoId) return tipoId;

	const { data: insertedTipo, error: insertedTipoError } = await supabase
		.from("tipo_imobilizado")
		.insert({ nome: DEFAULT_TIPO_NOME, user_id: userId })
		.select("id_tipo_imobilizado")
		.single();

	if (insertedTipoError) throw insertedTipoError.message;
	return insertedTipo?.id_tipo_imobilizado ?? null;
}
