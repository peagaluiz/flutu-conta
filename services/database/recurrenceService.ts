import { Platform } from "react-native";
import { supabase } from "@/services/supabase/client";
import { db, nowISO } from "@/services/database/db";
import { RecurrenceDatabase, RecurrenceFrequency, TransacaoDatabase } from "@/services/database/types";

type VisibilityScope = "mine" | "family" | "all";

type RecurrenceVisibilityParams = {
	visibilityScope?: VisibilityScope;
	userId?: string | null;
	familyId?: number | null;
};

export type RecurrenceCreateConfig = {
	frequency: RecurrenceFrequency;
	intervalDays?: number | null;
	endDate?: string | null;
};

type SeedTransacaoPayload = Omit<TransacaoDatabase, "id_transacao" | "created_at" | "updated_at">;

function toISODate(dateObj: Date) {
	const yyyy = dateObj.getFullYear();
	const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
	const dd = String(dateObj.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

function parseISODate(value?: string | null) {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return null;
	const [yyyy, mm, dd] = String(value).split("-").map(Number);
	return new Date(yyyy, mm - 1, dd);
}

function atNoonISO(isoDate: string) {
	const date = parseISODate(isoDate) ?? new Date();
	date.setHours(12, 0, 0, 0);
	return date.toISOString();
}

function addDays(base: Date, days: number) {
	const next = new Date(base);
	next.setDate(next.getDate() + days);
	return next;
}

function addMonthsClamped(base: Date, monthsToAdd: number) {
	const sourceDay = base.getDate();
	const year = base.getFullYear();
	const month = base.getMonth() + monthsToAdd;
	const candidate = new Date(year, month, 1);
	const maxDay = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate();
	return new Date(candidate.getFullYear(), candidate.getMonth(), Math.min(sourceDay, maxDay));
}

function addYearsClamped(base: Date, yearsToAdd: number) {
	return addMonthsClamped(base, yearsToAdd * 12);
}

function getNextDueDate(currentDueDate: string, frequency: RecurrenceFrequency, intervalDays: number | null) {
	const base = parseISODate(currentDueDate) ?? new Date();
	if (frequency === "semanal") {
		return toISODate(addDays(base, 7));
	}
	if (frequency === "anual") {
		return toISODate(addYearsClamped(base, 1));
	}
	if (frequency === "dias") {
		const safeInterval = Math.max(1, Number(intervalDays || 1));
		return toISODate(addDays(base, safeInterval));
	}
	return toISODate(addMonthsClamped(base, 1));
}

function maxISODate(a: string, b: string) {
	return a > b ? a : b;
}

function minISODate(a: string, b: string) {
	return a < b ? a : b;
}

async function resolveVisibilityContext(params?: RecurrenceVisibilityParams) {
	if (params?.userId) {
		return {
			scope: params.visibilityScope ?? "all",
			userId: params.userId,
			familyId: params.familyId ?? null,
		};
	}

	const { data } = await supabase.auth.getUser();
	const user = data?.user;
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

function buildSqlVisibilityClause(
	prefix: string,
	visibility: { scope: VisibilityScope; userId: string | null; familyId: number | null }
) {
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

function generateRecurrenceUuid() {
	return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildTemplatePayload(data: SeedTransacaoPayload) {
	return {
		tipo: data.tipo,
		valor: data.valor,
		categoria: data.categoria,
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

async function insertGeneratedTransacaoLocal(payload: SeedTransacaoPayload, dueDate: string) {
	if (!db) throw new Error("Banco local indisponivel");

	const template = buildTemplatePayload(payload);
	const insertResult = await db.runAsync(
		`
      INSERT INTO transacoes (
        remote_id,
        tipo,
        valor,
        categoria,
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
		template.categoria,
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
		null,
		null,
		"pending",
		0,
		0
	);

	return Number(insertResult.lastInsertRowId);
}

async function loadRecurrenceByUuid(uuid: string) {
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

export async function createRecurrenceFromNewTransaction(params: {
	seedTransacaoId: number;
	data: SeedTransacaoPayload;
	recurrence: RecurrenceCreateConfig;
}) {
	if (!db || Platform.OS === "web") {
		throw new Error("Recorrencia disponivel somente no banco local no app movel");
	}

	const visibility = await resolveVisibilityContext({
		userId: params.data.user_id ?? null,
		familyId: params.data.family_id ?? null,
		visibilityScope: "all",
	});
	const todayISO = toISODate(new Date());
	const dueDate = params.data.data_vencimento ?? todayISO;
	const frequency = params.recurrence.frequency;
	const intervalDays = frequency === "dias" ? Math.max(1, Number(params.recurrence.intervalDays || 1)) : null;
	const uuid = generateRecurrenceUuid();
	const templateJson = JSON.stringify(buildTemplatePayload({
		...params.data,
		user_id: params.data.user_id ?? visibility.userId ?? null,
	}));
	const nextDueDate = getNextDueDate(dueDate, frequency, intervalDays);

	await db.runAsync(
		`
      INSERT INTO recorrencias (
        uuid,
        status,
        frequency,
        interval_days,
        base_due_date,
        next_due_date,
        end_date,
        template_json,
        occurrences_count,
        last_generated_at,
        user_id,
        family_id,
        is_family_shared,
        created_at,
        updated_at,
        deleted
      ) VALUES (?, 'ativa', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `,
		uuid,
		frequency,
		intervalDays,
		dueDate,
		nextDueDate,
		params.recurrence.endDate ?? null,
		templateJson,
		1,
		nowISO(),
		params.data.user_id ?? visibility.userId ?? null,
		params.data.family_id ?? visibility.familyId ?? null,
		Number(params.data.is_family_shared ?? 0),
		nowISO(),
		null
	);

	const recurrenceRow = await loadRecurrenceByUuid(uuid);
	if (!recurrenceRow) {
		throw new Error("Falha ao criar recorrencia");
	}

	await db.runAsync(
		`
      INSERT OR IGNORE INTO recorrencia_transacoes (
        id_recurrencia,
        id_transacao,
        due_date,
        sequence,
        created_at
      ) VALUES (?, ?, ?, ?, ?)
    `,
		recurrenceRow.id_recurrencia,
		params.seedTransacaoId,
		dueDate,
		1,
		nowISO()
	);

	return { uuid, recurrenceId: recurrenceRow.id_recurrencia };
}

function getValidationHorizon(referenceDateISO: string, frequency: RecurrenceFrequency) {
	const todayISO = toISODate(new Date());
	const baseTarget = maxISODate(referenceDateISO, todayISO);

	if (frequency === "mensal" || frequency === "dias") {
		const plus30 = toISODate(addDays(parseISODate(todayISO) ?? new Date(), 30));
		return minISODate(baseTarget, plus30);
	}

	return baseTarget;
}

export async function validateAndGeneratePendingRecurrences(options?: {
	referenceDate?: string | null;
	visibilityScope?: VisibilityScope;
	userId?: string | null;
	familyId?: number | null;
}) {
	if (!db || Platform.OS === "web") {
		return { generated: 0, validated: 0 };
	}

	const visibility = await resolveVisibilityContext(options);
	const sqlVisibility = buildSqlVisibilityClause("r", visibility);
	const referenceISO =
		(options?.referenceDate && /^\d{4}-\d{2}-\d{2}$/.test(String(options.referenceDate))
			? String(options.referenceDate)
			: toISODate(new Date()));
	const todayISO = toISODate(new Date());

	const recurrenceRows = await db.getAllAsync<RecurrenceDatabase>(
		`
      SELECT *
      FROM recorrencias r
      WHERE r.deleted = 0
        AND r.status = 'ativa'
        AND ${sqlVisibility.where}
      ORDER BY r.id_recurrencia ASC
    `,
		...sqlVisibility.args
	);

	let generated = 0;
	let validated = 0;

	for (const recurrence of recurrenceRows ?? []) {
		validated += 1;

		const endDate = recurrence.end_date ?? null;
		const horizon = getValidationHorizon(referenceISO, recurrence.frequency as RecurrenceFrequency);
		let cursor = maxISODate(recurrence.next_due_date || recurrence.base_due_date, todayISO);
		let occurrenceSequence = Number(recurrence.occurrences_count || 0);

		while (cursor <= horizon) {
			if (endDate && cursor > endDate) {
				cursor = getNextDueDate(cursor, recurrence.frequency as RecurrenceFrequency, recurrence.interval_days);
				break;
			}

			const exists = await db.getFirstAsync<{ id_recurrencia_transacao: number }>(
				`
          SELECT id_recurrencia_transacao
          FROM recorrencia_transacoes
          WHERE id_recurrencia = ?
            AND due_date = ?
          LIMIT 1
        `,
				recurrence.id_recurrencia,
				cursor
			);

			if (!exists) {
				let template: any = {};
				try {
					template = recurrence.template_json ? JSON.parse(recurrence.template_json) : {};
				} catch {
					template = {};
				}

				const insertedId = await insertGeneratedTransacaoLocal(
					{
						remote_id: null,
						tipo: template.tipo ?? "pagar",
						valor: Number(template.valor || 0),
						categoria: template.categoria ?? "Outros",
						id_pessoa: template.id_pessoa ?? null,
						pessoa: template.pessoa ?? null,
						id_imobilizado: template.id_imobilizado ?? null,
						family_id: template.family_id ?? recurrence.family_id ?? null,
						is_family_shared: Number(template.is_family_shared ?? recurrence.is_family_shared ?? 0),
						user_id: template.user_id ?? recurrence.user_id ?? null,
						data_transacao: atNoonISO(cursor),
						data_vencimento: cursor,
						status: template.status ?? "pendente",
						observacao: template.observacao ?? null,
						json: template.json ?? null,
					},
					cursor
				);

				occurrenceSequence += 1;
				await db.runAsync(
					`
            INSERT INTO recorrencia_transacoes (
              id_recurrencia,
              id_transacao,
              due_date,
              sequence,
              created_at
            ) VALUES (?, ?, ?, ?, ?)
          `,
					recurrence.id_recurrencia,
					insertedId,
					cursor,
					occurrenceSequence,
					nowISO()
				);

				generated += 1;
			}

			cursor = getNextDueDate(cursor, recurrence.frequency as RecurrenceFrequency, recurrence.interval_days);
		}

		await db.runAsync(
			`
        UPDATE recorrencias
        SET next_due_date = ?,
            occurrences_count = ?,
            last_generated_at = ?,
            updated_at = ?
        WHERE id_recurrencia = ?
      `,
			cursor,
			occurrenceSequence,
			nowISO(),
			nowISO(),
			recurrence.id_recurrencia
		);
	}

	return { generated, validated };
}

export async function listRecorrencias(params?: RecurrenceVisibilityParams) {
	if (!db || Platform.OS === "web") {
		return [] as RecurrenceDatabase[];
	}

	const visibility = await resolveVisibilityContext(params);
	const sqlVisibility = buildSqlVisibilityClause("r", visibility);
	const rows = await db.getAllAsync<RecurrenceDatabase>(
		`
      SELECT
        r.*,
        COUNT(CASE WHEN t.deleted = 0 THEN rt.id_transacao END) AS active_transactions_count
      FROM recorrencias r
      LEFT JOIN recorrencia_transacoes rt
        ON rt.id_recurrencia = r.id_recurrencia
      LEFT JOIN transacoes t
        ON t.id_transacao = rt.id_transacao
      WHERE r.deleted = 0
        AND ${sqlVisibility.where}
      GROUP BY r.id_recurrencia
      ORDER BY r.id_recurrencia DESC
    `,
		...sqlVisibility.args
	);

	return rows ?? [];
}

export async function pauseRecorrencia(uuid: string) {
	if (!db || Platform.OS === "web") return { updated: false };
	await db.runAsync(
		`
      UPDATE recorrencias
      SET status = 'pausada',
          updated_at = ?
      WHERE uuid = ?
        AND deleted = 0
    `,
		nowISO(),
		uuid
	);
	return { updated: true };
}

export async function activateRecorrencia(uuid: string) {
	if (!db || Platform.OS === "web") return { updated: false };
	await db.runAsync(
		`
      UPDATE recorrencias
      SET status = 'ativa',
          updated_at = ?
      WHERE uuid = ?
        AND deleted = 0
    `,
		nowISO(),
		uuid
	);
	return { updated: true };
}

export async function deleteRecorrencia(uuid: string) {
	if (!db || Platform.OS === "web") return { deleted: false };
	await db.runAsync(
		`
      UPDATE recorrencias
      SET deleted = 1,
          updated_at = ?
      WHERE uuid = ?
        AND deleted = 0
    `,
		nowISO(),
		uuid
	);
	return { deleted: true };
}
