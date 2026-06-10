import { Platform } from "react-native";
import { supabase } from "@/services/supabase/client";
import { db, nowISO } from "@/services/database/db";

type VisibilityScope = "mine" | "family" | "all";

type VisibilityParams = {
	visibilityScope?: VisibilityScope;
	userId?: string | null;
	familyId?: number | null;
};

type PessoaRow = {
	id_pessoa: number;
	nome: string;
	remote_id?: number | null;
	user_id?: string | null;
	family_id?: number | null;
	is_family_shared?: number;
};

type PessoaWithPending = PessoaRow & {
	is_pending?: boolean;
	pending_count?: number;
	pending_ids?: string;
};

type ImobilizadoListRow = {
	id_imobilizado: number;
	codigo: string;
	descricao: string;
	remote_id?: number | null;
	user_id?: string | null;
	family_id?: number | null;
	is_family_shared?: number;
};

function parsePendingTransactionIds(value?: string | number[] | null) {
	if (Array.isArray(value)) {
		return value
			.map((item) => Number(item))
			.filter((item) => Number.isInteger(item) && item > 0);
	}

	return String(value || "")
		.split(",")
		.map((item) => Number(String(item).trim()))
		.filter((item) => Number.isInteger(item) && item > 0);
}

function buildPendingTransacoesScope(pendingName: string, pendingIds: number[]) {
	if (pendingIds.length > 0) {
		return {
			whereClause: `id_transacao IN (${pendingIds.join(",")})`,
			whereArgs: [] as Array<string | number>,
		};
	}

	return {
		whereClause: "id_pessoa IS NULL AND LOWER(TRIM(COALESCE(pessoa, ''))) = LOWER(TRIM(?))",
		whereArgs: [pendingName],
	};
}

async function listScopedPendingTransacoes(whereClause: string, whereArgs: Array<string | number>) {
	if (!db) return [];

	return db.getAllAsync<any>(
		`
      SELECT id_transacao, remote_id
      FROM transacoes
      WHERE deleted = 0
        AND ${whereClause}
      ORDER BY id_transacao ASC
    `,
		...whereArgs
	);
}

async function loadPendingTransacoesByPessoaNome(nome: string) {
	const cleanName = String(nome || "").trim();
	if (!cleanName) return [];

	if (Platform.OS === "web") {
		const { data, error } = await supabase
			.from("transacoes")
			.select("id_transacao")
			.eq("deleted", 0)
			.is("id_pessoa", null)
			.eq("pessoa", cleanName);

		if (error) throw new Error(error.message || "Falha ao ler transações pendentes");

		return (data ?? []).map((item: any) => ({
			id_transacao: Number(item.id_transacao),
			remote_id: Number(item.id_transacao),
		}));
	}

	if (!db) return [] as Array<{ id_transacao: number; remote_id?: number | null }>;

	return db.getAllAsync<any>(
		`
      SELECT id_transacao, remote_id
      FROM transacoes
      WHERE deleted = 0
        AND id_pessoa IS NULL
        AND LOWER(TRIM(COALESCE(pessoa, ''))) = LOWER(TRIM(?))
      ORDER BY id_transacao ASC
    `,
		cleanName
	);
}

async function updateTransacoesPessoaLink(params: {
	whereClause: string;
	whereArgs: Array<string | number>;
	idPessoa: number;
	linkStatus?: "pending" | "synced";
}) {
	if (!db) throw new Error("Banco local indisponivel");

	const localNow = nowISO();
	const linkStatus = params.linkStatus ?? "pending";

	await db.runAsync(
		`
          UPDATE transacoes
          SET id_pessoa = ?,
              pessoa = NULL,
              updated_at = ?,
              data_sync = ?,
              sync_status = ?,
              synced = ?
          WHERE deleted = 0
            AND ${params.whereClause}
        `,
		params.idPessoa,
		localNow,
		localNow,
		linkStatus,
		linkStatus === "synced" ? 1 : 0,
		...params.whereArgs
	);
}

async function getDefaultTipoImobilizadoId() {
	if (!db) return null;

	const existing = await db.getFirstAsync<any>(
		`
      SELECT id_tipo_imobilizado
      FROM tipo_imobilizado
      WHERE deleted = 0
      ORDER BY id_tipo_imobilizado ASC
      LIMIT 1
    `
	);

	if (existing?.id_tipo_imobilizado) return existing.id_tipo_imobilizado as number;

	const inserted = await db.runAsync(
		`
      INSERT INTO tipo_imobilizado (
        nome,
        data_sync,
        sync_status,
        synced,
        deleted
      ) VALUES (?, ?, 'pending', 0, 0)
    `,
		"Geral",
		nowISO()
	);

	return Number(inserted.lastInsertRowId);
}

async function resolveVisibilityContext(params?: VisibilityParams) {
	if (params?.userId) {
		return {
			scope: params.visibilityScope ?? "all",
			userId: params.userId,
			familyId: params.familyId ?? null,
		};
	}

	const { data } = await supabase.auth.getSession();
	const user = data?.session?.user;
	const metadataFamilyId = Number(
		(user?.user_metadata?.family_id as number | string | undefined) ??
		(user?.app_metadata?.family_id as number | string | undefined) ??
		0
	);

	return {
		scope: params?.visibilityScope ?? "all",
		userId: user?.id || null,
		familyId: Number.isFinite(metadataFamilyId) && metadataFamilyId > 0 ? metadataFamilyId : null,
	};
}

function buildSqlVisibilityClause(prefix: string, visibility: { scope: VisibilityScope; userId: string | null; familyId: number | null }) {
	if (!visibility.userId) {
		return { where: "1=1", args: [] as Array<string | number> };
	}

	if (visibility.scope === "mine") {
		return {
			where: `${prefix}.user_id = ?`,
			args: [visibility.userId],
		};
	}

	if (visibility.scope === "family") {
		if (!visibility.familyId) {
			return {
				where: `${prefix}.user_id = ?`,
				args: [visibility.userId],
			};
		}

		return {
			where: `${prefix}.family_id = ?`,
			args: [visibility.familyId],
		};
	}

	if (!visibility.familyId) {
		return {
			where: `${prefix}.user_id = ?`,
			args: [visibility.userId],
		};
	}

	return {
		where: `(${prefix}.user_id = ? OR ${prefix}.family_id = ?)`,
		args: [visibility.userId, visibility.familyId],
	};
}

function applyWebVisibility(query: any, visibility: { scope: VisibilityScope; userId: string | null; familyId: number | null }) {
	if (!visibility.userId) return query;

	if (visibility.scope === "mine") {
		return query.eq("user_id", visibility.userId);
	}

	if (visibility.scope === "family") {
		if (!visibility.familyId) {
			return query.eq("user_id", visibility.userId);
		}
		return query.eq("family_id", visibility.familyId);
	}

	if (!visibility.familyId) {
		return query.eq("user_id", visibility.userId);
	}

	return query.or(`user_id.eq.${visibility.userId},family_id.eq.${visibility.familyId}`);
}

export function createManageRepository() {
	return {
		findPessoaByName: async (nome: string) => {
			const cleanName = String(nome || "").trim();
			if (!cleanName) return null;

			if (Platform.OS === "web") {
				const { data, error } = await supabase
					.from("pessoa")
					.select("id_pessoa,nome")
					.ilike("nome", cleanName)
					.limit(1)
					.maybeSingle();

				if (error) throw error.message;
				return data ?? null;
			}

			if (!db) return null;

			const row = await db.getFirstAsync<any>(
				`
          SELECT id_pessoa, nome, remote_id
          FROM pessoa
          WHERE deleted = 0
            AND LOWER(TRIM(nome)) = LOWER(TRIM(?))
          LIMIT 1
        `,
				cleanName
			);

			return row ?? null;
		},

		listPessoas: async (params?: VisibilityParams) => {
			const visibility = await resolveVisibilityContext(params);

			if (Platform.OS === "web") {
				let query = supabase
					.from("pessoa")
					.select("id_pessoa,nome,remote_id,user_id,family_id,is_family_shared")
					.order("nome", { ascending: true });

				query = applyWebVisibility(query, visibility);

				const { data, error } = await query;
				if (error) throw error.message;
				return (data ?? []) as PessoaRow[];
			}

			if (!db) return [] as PessoaRow[];

			const sqlVisibility = buildSqlVisibilityClause("p", visibility);

			const rows = await db.getAllAsync<PessoaRow>(
				`
          SELECT id_pessoa, nome, remote_id, user_id, family_id, is_family_shared
          FROM pessoa p
          WHERE p.deleted = 0
            AND ${sqlVisibility.where}
          ORDER BY nome ASC
        `,
				...sqlVisibility.args
			);

			return rows ?? [];
		},

		listPessoasWithPending: async (params?: VisibilityParams): Promise<PessoaWithPending[]> => {
			const visibility = await resolveVisibilityContext(params);

			if (Platform.OS === "web") {
				let query = supabase
					.from("pessoa")
					.select("id_pessoa,nome,remote_id,user_id,family_id,is_family_shared")
					.order("nome", { ascending: true });

				query = applyWebVisibility(query, visibility);

				const { data, error } = await query;
				if (error) throw error.message;
				return (data ?? []) as PessoaWithPending[];
			}

			if (!db) return [];

			const sqlVisibility = buildSqlVisibilityClause("p", visibility);
			const tVisibility = buildSqlVisibilityClause("transacoes", visibility);

			const cadastradas = await db.getAllAsync<PessoaWithPending>(
				`
          SELECT id_pessoa, nome, remote_id, user_id, family_id, is_family_shared, 0 as is_pending, 0 as pending_count
          FROM pessoa p
          WHERE p.deleted = 0
            AND ${sqlVisibility.where}
          ORDER BY nome ASC
        `,
				...sqlVisibility.args
			);

			const pendentes = await db.getAllAsync<any>(
				`
          SELECT
            MIN(-id_transacao) as id_pessoa,
            pessoa as nome,
            1 as is_pending,
            COUNT(*) as pending_count,
            GROUP_CONCAT(id_transacao) as pending_ids
          FROM transacoes
          WHERE deleted = 0
            AND id_pessoa IS NULL
            AND TRIM(COALESCE(pessoa, '')) <> ''
            AND ${tVisibility.where}
            AND LOWER(TRIM(pessoa)) NOT IN (
              SELECT LOWER(TRIM(nome))
              FROM pessoa
              WHERE deleted = 0
            )
          GROUP BY LOWER(TRIM(pessoa)), pessoa
          ORDER BY pessoa ASC
        `,
				...tVisibility.args
			);

			return [...(pendentes ?? []), ...(cadastradas ?? [])];
		},

		relinkTransacoesPessoaPendente: async (params: {
			pendingName: string;
			pendingTransactionIds?: string | number[] | null;
			targetPessoaId?: number | null;
			replacementName?: string | null;
		}) => {
			if (!db) throw new Error("Banco local indisponivel");

			const pendingName = String(params.pendingName || "").trim();
			if (!pendingName) throw new Error("Nome pendente inválido");
			const pendingIds = parsePendingTransactionIds(params.pendingTransactionIds);
			const { whereClause, whereArgs } = buildPendingTransacoesScope(pendingName, pendingIds);
			const scopedTransacoes = (await listScopedPendingTransacoes(whereClause, whereArgs)) ?? [];

			if (!scopedTransacoes.length) {
				throw new Error("Nenhum lançamento pendente foi encontrado para sincronizar");
			}

			const transacoesSemRemote = scopedTransacoes.filter((item) => !Number(item?.remote_id || 0));
			if (transacoesSemRemote.length > 0) {
				throw new Error("Há lançamentos pendentes sem vínculo remoto. Sincronize-os primeiro.");
			}

			if (params.targetPessoaId) {
				const localNow = nowISO();
				const pessoa = await db.getFirstAsync<any>(
					`
            SELECT id_pessoa, nome, remote_id
            FROM pessoa
            WHERE id_pessoa = ? AND deleted = 0
            LIMIT 1
          `,
					params.targetPessoaId
				);

				if (!pessoa?.id_pessoa) {
					throw new Error("Pessoa selecionada não foi encontrada");
				}

				for (const transacao of scopedTransacoes) {
					const { error } = await supabase
						.from("transacoes")
						.update({
							id_pessoa: pessoa.id_pessoa,
							pessoa: null,
							updated_at: localNow,
						})
						.eq("id_transacao", transacao.remote_id);

					if (error) {
						throw new Error(error.message || "Falha ao atualizar lançamento pendente no Supabase");
					}
				}

				await updateTransacoesPessoaLink({
					whereClause,
					whereArgs,
					idPessoa: pessoa.id_pessoa,
					linkStatus: "synced",
				});

				return { linked: true, nome: pessoa.nome };
			}

			const localNow = nowISO();
			const replacementName = String(params.replacementName || "").trim();
			if (!replacementName) throw new Error("Informe o nome para corrigir");

			for (const transacao of scopedTransacoes) {
				const { error } = await supabase
					.from("transacoes")
					.update({
						id_pessoa: null,
						pessoa: replacementName,
						updated_at: localNow,
					})
					.eq("id_transacao", transacao.remote_id);

				if (error) {
					throw new Error(error.message || "Falha ao atualizar lançamento pendente no Supabase");
				}
			}

			await db.runAsync(
				`
          UPDATE transacoes
          SET pessoa = ?,
              id_pessoa = NULL,
              updated_at = ?,
              data_sync = ?,
              sync_status = 'synced',
              synced = 1
          WHERE deleted = 0
            AND ${whereClause}
        `,
				replacementName,
				localNow,
				localNow,
				...whereArgs
			);

			return { linked: false, nome: replacementName };
		},

		syncPessoaPendente: async (
			pendingName: string,
			pendingTransactionIds?: string | number[] | null,
			targetPessoaId?: number | null,
			options?: { userId?: string | null; familyId?: number | null; isFamilyShared?: boolean }
		) => {
			if (!db) throw new Error("Banco local indisponivel");

			const cleanName = String(pendingName || "").trim();
			if (!cleanName) throw new Error("Nome pendente inválido");
			const pendingIds = parsePendingTransactionIds(pendingTransactionIds);
			const hasPendingIds = pendingIds.length > 0;
			const whereClause = hasPendingIds
				? `id_transacao IN (${pendingIds.join(",")})`
				: `id_pessoa IS NULL AND LOWER(TRIM(COALESCE(pessoa, ''))) = LOWER(TRIM(?))`;
			const whereArgs = hasPendingIds ? [] : [cleanName];

			let pessoa = targetPessoaId
				? await db.getFirstAsync<any>(
					`
          SELECT id_pessoa, nome, remote_id
          FROM pessoa
          WHERE deleted = 0
            AND id_pessoa = ?
          LIMIT 1
        `,
					targetPessoaId
				)
				: await db.getFirstAsync<any>(
					`
          SELECT id_pessoa, nome, remote_id
          FROM pessoa
          WHERE deleted = 0
            AND LOWER(TRIM(nome)) = LOWER(TRIM(?))
          LIMIT 1
        `,
					cleanName
				);

			if (!pessoa?.id_pessoa) {
				const visibility = await resolveVisibilityContext({
					userId: options?.userId ?? undefined,
					familyId: options?.familyId ?? undefined,
				});
				const resolvedUserId = options?.userId ?? visibility.userId ?? null;
				const resolvedFamilyId = options?.familyId ?? visibility.familyId ?? null;
				const isFamilyShared = Boolean(options?.isFamilyShared && resolvedFamilyId);

				const inserted = await db.runAsync(
					`
            INSERT INTO pessoa (
              nome,
				  user_id,
				  family_id,
				  is_family_shared,
              data_sync,
              sync_status,
              synced,
              deleted
				) VALUES (?, ?, ?, ?, ?, 'pending', 0, 0)
          `,
					cleanName,
					resolvedUserId,
					isFamilyShared ? resolvedFamilyId : null,
					isFamilyShared ? 1 : 0,
					nowISO()
				);

				pessoa = {
					id_pessoa: Number(inserted.lastInsertRowId),
					nome: cleanName,
					remote_id: null,
				};
			}

			await updateTransacoesPessoaLink({
				whereClause,
				whereArgs,
				idPessoa: pessoa.id_pessoa,
				linkStatus: "pending",
			});

			return pessoa;
		},

		createPessoa: async (
			nome: string,
			options?: { userId?: string | null; familyId?: number | null; isFamilyShared?: boolean }
		) => {
			const cleanName = nome.trim();
			if (!cleanName) throw new Error("Informe um nome");
			const visibility = await resolveVisibilityContext({
				userId: options?.userId ?? undefined,
				familyId: options?.familyId ?? undefined,
			});
			const resolvedUserId = options?.userId ?? visibility.userId ?? null;
			const resolvedFamilyId = options?.familyId ?? visibility.familyId ?? null;
			const isFamilyShared = Boolean(options?.isFamilyShared && resolvedFamilyId);

			if (Platform.OS === "web") {
				const { error } = await supabase.from("pessoa").insert({
					nome: cleanName,
					user_id: resolvedUserId,
					family_id: isFamilyShared ? resolvedFamilyId : null,
					is_family_shared: isFamilyShared ? 1 : 0,
				});
				if (error) throw error.message;
				return;
			}

			if (!db) throw new Error("Banco local indisponivel");

			await db.runAsync(
				`
          INSERT INTO pessoa (
            nome,
            user_id,
            family_id,
            is_family_shared,
            data_sync,
            sync_status,
            synced,
            deleted
          ) VALUES (?, ?, ?, ?, ?, 'pending', 0, 0)
        `,
				cleanName,
				resolvedUserId,
				isFamilyShared ? resolvedFamilyId : null,
				isFamilyShared ? 1 : 0,
				nowISO()
			);
		},

		updatePessoa: async (id_pessoa: number, nome: string) => {
			const cleanName = nome.trim();
			if (!cleanName) throw new Error("Informe um nome");

			if (Platform.OS === "web") {
				const { error } = await supabase.from("pessoa").update({ nome: cleanName }).eq("id_pessoa", id_pessoa);
				if (error) throw error.message;
				return;
			}

			if (!db) throw new Error("Banco local indisponivel");

			await db.runAsync(
				`
          UPDATE pessoa
          SET nome = ?,
              updated_at = ?,
              data_sync = ?,
              sync_status = 'pending',
              synced = 0
          WHERE id_pessoa = ?
        `,
				cleanName,
				nowISO(),
				nowISO(),
				id_pessoa
			);
		},

		updatePessoaAndRelinkTransacoes: async (id_pessoa: number, previousName: string, nextName: string) => {
			const cleanPreviousName = String(previousName || "").trim();
			const cleanNextName = String(nextName || "").trim();

			if (!cleanNextName) throw new Error("Informe um nome");
			if (!cleanPreviousName) throw new Error("Nome anterior inválido");

			const pendingTransacoes = await loadPendingTransacoesByPessoaNome(cleanPreviousName);
			const pendingIds = pendingTransacoes.map((item) => item.id_transacao);
			const localNow = nowISO();

			if (Platform.OS === "web") {
				const { error: pessoaError } = await supabase.from("pessoa").update({ nome: cleanNextName }).eq("id_pessoa", id_pessoa);
				if (pessoaError) throw new Error(pessoaError.message || "Falha ao atualizar pessoa");

				for (const transacao of pendingTransacoes) {
					const { error } = await supabase
						.from("transacoes")
						.update({
							id_pessoa,
							pessoa: null,
							updated_at: localNow,
							data_sync: localNow,
							sync_status: "pending",
							synced: 0,
						})
						.eq("id_transacao", transacao.remote_id);

					if (error) throw new Error(error.message || "Falha ao relinkar transações");
				}

				return { updated: true };
			}

			if (!db) throw new Error("Banco local indisponivel");

			await db.runAsync(
				`
          UPDATE pessoa
          SET nome = ?,
              updated_at = ?,
              data_sync = ?,
              sync_status = 'pending',
              synced = 0
          WHERE id_pessoa = ?
        `,
				cleanNextName,
				localNow,
				localNow,
				id_pessoa
			);

			if (pendingIds.length > 0) {
				await updateTransacoesPessoaLink({
					whereClause: `id_transacao IN (${pendingIds.join(",")})`,
					whereArgs: [],
					idPessoa: id_pessoa,
					linkStatus: "pending",
				});
			} else {
				await updateTransacoesPessoaLink({
					whereClause: "id_pessoa IS NULL AND LOWER(TRIM(COALESCE(pessoa, ''))) = LOWER(TRIM(?))",
					whereArgs: [cleanPreviousName],
					idPessoa: id_pessoa,
					linkStatus: "pending",
				});
			}

			return { updated: true };
		},

		deletePessoa: async (id_pessoa: number) => {
			const localNow = nowISO();

			if (Platform.OS === "web") {
				const { data: pessoaData, error: pessoaReadError } = await supabase
					.from("pessoa")
					.select("nome")
					.eq("id_pessoa", id_pessoa)
					.maybeSingle();

				if (pessoaReadError) throw pessoaReadError.message;

				const nomePessoa = String(pessoaData?.nome || "").trim() || null;

				const { error: transacoesError } = await supabase
					.from("transacoes")
					.update({
						id_pessoa: null,
						pessoa: nomePessoa,
						updated_at: localNow,
						data_sync: localNow,
						sync_status: "pending",
						synced: 0,
					})
					.eq("id_pessoa", id_pessoa);

				if (transacoesError) throw transacoesError.message;

				const { error } = await supabase
					.from("pessoa")
					.update({
						deleted: 1,
						data_sync: localNow,
						sync_status: "pending",
						synced: 0,
					})
					.eq("id_pessoa", id_pessoa);

				if (error) throw error.message;
				return;
			}

			if (!db) throw new Error("Banco local indisponivel");

			const pessoaLocal = await db.getFirstAsync<any>(
				`
          SELECT nome
          FROM pessoa
          WHERE id_pessoa = ?
          LIMIT 1
        `,
				id_pessoa
			);

			const nomePessoa = String(pessoaLocal?.nome || "").trim() || null;

			await db.runAsync(
				`
          UPDATE transacoes
          SET id_pessoa = NULL,
              pessoa = COALESCE(?, pessoa),
              updated_at = ?,
              data_sync = ?,
              sync_status = 'pending',
              synced = 0
          WHERE id_pessoa = ?
            AND deleted = 0
        `,
				nomePessoa,
				localNow,
				localNow,
				id_pessoa
			);

			await db.runAsync(
				`
          UPDATE pessoa
          SET deleted = 1,
              updated_at = ?,
              data_sync = ?,
              sync_status = 'pending',
              synced = 0
          WHERE id_pessoa = ?
        `,
				localNow,
				localNow,
				id_pessoa
			);
		},

		listImobilizados: async (params?: VisibilityParams) => {
			const visibility = await resolveVisibilityContext(params);

			if (Platform.OS === "web") {
				let query = supabase
					.from("imobilizado")
					.select("id_imobilizado,codigo,descricao,remote_id,user_id,family_id,is_family_shared")
					.order("descricao", { ascending: true });

				query = applyWebVisibility(query, visibility);

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

		createImobilizado: async (
			nome: string,
			options?: { userId?: string | null; familyId?: number | null; isFamilyShared?: boolean }
		) => {
			const cleanName = nome.trim();
			if (!cleanName) throw new Error("Informe um nome");
			const visibility = await resolveVisibilityContext({
				userId: options?.userId ?? undefined,
				familyId: options?.familyId ?? undefined,
			});
			const resolvedUserId = options?.userId ?? visibility.userId ?? null;
			const resolvedFamilyId = options?.familyId ?? visibility.familyId ?? null;
			const isFamilyShared = Boolean(options?.isFamilyShared && resolvedFamilyId);

			if (Platform.OS === "web") {
				const { data: tipos, error: tipoError } = await supabase
					.from("tipo_imobilizado")
					.select("id_tipo_imobilizado")
					.limit(1);

				if (tipoError) throw tipoError.message;

				let tipoId = tipos?.[0]?.id_tipo_imobilizado ?? null;
				if (!tipoId) {
					const { data: insertedTipo, error: insertedTipoError } = await supabase
						.from("tipo_imobilizado")
						.insert({ nome: "Geral" })
						.select("id_tipo_imobilizado")
						.single();

					if (insertedTipoError) throw insertedTipoError.message;
					tipoId = insertedTipo?.id_tipo_imobilizado ?? null;
				}

				const { error } = await supabase.from("imobilizado").insert({
					id_tipo_imobilizado: tipoId,
					codigo: cleanName,
					descricao: cleanName,
					user_id: resolvedUserId,
					family_id: isFamilyShared ? resolvedFamilyId : null,
					is_family_shared: isFamilyShared ? 1 : 0,
					status: 1,
				});

				if (error) throw error.message;
				return;
			}

			if (!db) throw new Error("Banco local indisponivel");

			const tipoId = await getDefaultTipoImobilizadoId();

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
				resolvedUserId,
				isFamilyShared ? resolvedFamilyId : null,
				isFamilyShared ? 1 : 0,
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
