import { Platform } from "react-native";
import { supabase } from "@/services/supabase/client";
import { db, nowISO } from "@/services/database/db";
import {
	applySupabaseVisibility,
	buildSqlVisibilityClause,
	resolveOwnership,
	resolveVisibilityContext,
	type OwnershipOptions,
	type VisibilityParams,
} from "@/services/database/visibility";
import {
	ensureDefaultTipoImobilizadoLocal,
	ensureDefaultTipoImobilizadoRemote,
} from "@/services/database/tipoImobilizadoRepository";

export type ImobilizadoListRow = {
	id_imobilizado: number;
	codigo: string;
	descricao: string;
	remote_id?: number | null;
	user_id?: string | null;
	family_id?: number | null;
	is_family_shared?: number;
};

export function createImobilizadoRepository() {
	return {
		listImobilizados: async (params?: VisibilityParams) => {
			const visibility = await resolveVisibilityContext(params);

			if (Platform.OS === "web") {
				let query = supabase
					.from("imobilizado")
					.select("id_imobilizado,codigo,descricao,user_id,family_id,is_family_shared")
					.eq("deleted", 0)
					.order("descricao", { ascending: true });

				query = applySupabaseVisibility(query, visibility);

				const { data, error } = await query;
				if (error) throw error.message;
				return (data ?? []) as ImobilizadoListRow[];
			}

			if (!db) return [] as ImobilizadoListRow[];
			const sqlVisibility = buildSqlVisibilityClause("i", visibility);

			const rows = await db.getAllAsync<ImobilizadoListRow>(
				`
          SELECT id_imobilizado, codigo, descricao, remote_id, user_id, family_id, is_family_shared
          FROM imobilizado i
          WHERE i.deleted = 0
            AND ${sqlVisibility.where}
          ORDER BY descricao ASC
        `,
				...sqlVisibility.args
			);

			return rows ?? [];
		},

		createImobilizado: async (nome: string, options?: OwnershipOptions) => {
			const cleanName = nome.trim();
			if (!cleanName) throw new Error("Informe um nome");
			const ownership = await resolveOwnership(options);

			if (Platform.OS === "web") {
				const tipoId = await ensureDefaultTipoImobilizadoRemote(ownership.userId);

				const { error } = await supabase.from("imobilizado").insert({
					id_tipo_imobilizado: tipoId,
					codigo: cleanName,
					descricao: cleanName,
					user_id: ownership.userId,
					family_id: ownership.familyId,
					is_family_shared: ownership.isFamilyShared ? 1 : 0,
					status: 1,
				});

				if (error) throw error.message;
				return;
			}

			if (!db) throw new Error("Banco local indisponivel");

			const tipoId = await ensureDefaultTipoImobilizadoLocal(ownership.userId);

			await db.runAsync(
				`
          INSERT INTO imobilizado (
            id_tipo_imobilizado,
            codigo,
            descricao,
            user_id,
            family_id,
            is_family_shared,
            status,
            data_sync,
            sync_status,
            synced,
            deleted
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, 0)
        `,
				tipoId,
				cleanName,
				cleanName,
				ownership.userId,
				ownership.familyId,
				ownership.isFamilyShared ? 1 : 0,
				1,
				nowISO()
			);
		},

		updateImobilizado: async (id_imobilizado: number, nome: string) => {
			const cleanName = nome.trim();
			if (!cleanName) throw new Error("Informe um nome");

			if (Platform.OS === "web") {
				const { error } = await supabase
					.from("imobilizado")
					.update({ codigo: cleanName, descricao: cleanName })
					.eq("id_imobilizado", id_imobilizado);

				if (error) throw error.message;
				return;
			}

			if (!db) throw new Error("Banco local indisponivel");

			await db.runAsync(
				`
          UPDATE imobilizado
          SET codigo = ?,
              descricao = ?,
              updated_at = ?,
              data_sync = ?,
              sync_status = 'pending',
              synced = 0
          WHERE id_imobilizado = ?
        `,
				cleanName,
				cleanName,
				nowISO(),
				nowISO(),
				id_imobilizado
			);
		},

		deleteImobilizado: async (id_imobilizado: number) => {
			const localNow = nowISO();

			if (Platform.OS === "web") {
				const { error: transacoesError } = await supabase
					.from("transacoes")
					.update({
						id_imobilizado: null,
						updated_at: localNow,
						data_sync: localNow,
						sync_status: "pending",
						synced: 0,
					})
					.eq("id_imobilizado", id_imobilizado);

				if (transacoesError) throw transacoesError.message;

				const { error } = await supabase
					.from("imobilizado")
					.update({
						deleted: 1,
						data_sync: localNow,
						sync_status: "pending",
						synced: 0,
					})
					.eq("id_imobilizado", id_imobilizado);

				if (error) throw error.message;
				return;
			}

			if (!db) throw new Error("Banco local indisponivel");

			await db.runAsync(
				`
          UPDATE transacoes
          SET id_imobilizado = NULL,
              updated_at = ?,
              data_sync = ?,
              sync_status = 'pending',
              synced = 0
          WHERE id_imobilizado = ?
            AND deleted = 0
        `,
				localNow,
				localNow,
				id_imobilizado
			);

			await db.runAsync(
				`
          UPDATE imobilizado
          SET deleted = 1,
              updated_at = ?,
              data_sync = ?,
              sync_status = 'pending',
              synced = 0
          WHERE id_imobilizado = ?
        `,
				localNow,
				localNow,
				id_imobilizado
			);
		},
	};
}
