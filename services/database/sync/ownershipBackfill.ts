import { Platform } from "react-native";
import { db, nowISO } from "@/services/database/db";
import { getAuthUserId } from "./resolvers";

// Registros criados antes do login (ou antes do suporte a família) ficam sem dono
// e nunca subiriam. Marca-os com o usuário atual e devolve à fila de sync.
const TABLES_WITH_DATA_SYNC = ["transacoes", "pessoa", "imobilizado"] as const;

export async function backfillLocalOwnershipIfMissing() {
	if (!db || Platform.OS === "web") return;

	const userId = await getAuthUserId();
	if (!userId) return;

	const dataSync = nowISO();

	for (const table of TABLES_WITH_DATA_SYNC) {
		await db.runAsync(
			`
      UPDATE ${table}
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

	// recorrencias não tem data_sync
	await db.runAsync(
		`
      UPDATE recorrencias
      SET user_id = ?,
          sync_status = 'pending',
          synced = 0
      WHERE deleted = 0
        AND user_id IS NULL
        AND family_id IS NULL
    `,
		userId
	);
}
