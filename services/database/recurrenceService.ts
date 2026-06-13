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
	endDate?: string | null;
	skipNonWorking?: boolean;
	skipDirection?: "before" | "after" | null;
};

type SeedTransacaoPayload = Omit<TransacaoDatabase, "id_transacao" | "created_at" | "updated_at">;

export function toISODate(dateObj: Date) {
	const yyyy = dateObj.getFullYear();
	const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
	const dd = String(dateObj.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

export function parseISODate(value?: string | null) {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return null;
	const [yyyy, mm, dd] = String(value).split("-").map(Number);
	return new Date(yyyy, mm - 1, dd);
}

export function atNoonISO(isoDate: string) {
	const date = parseISODate(isoDate) ?? new Date();
	date.setHours(12, 0, 0, 0);
	return date.toISOString();
}

function addDays(base: Date, days: number) {
	const next = new Date(base);
	next.setDate(next.getDate() + days);
	return next;
}

export function addMonthsClamped(base: Date, monthsToAdd: number) {
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

export function getNextDueDate(currentDueDate: string, frequency: RecurrenceFrequency) {
	const base = parseISODate(currentDueDate) ?? new Date();
	if (frequency === "semanal") return toISODate(addDays(base, 7));
	if (frequency === "anual") return toISODate(addYearsClamped(base, 1));
	return toISODate(addMonthsClamped(base, 1));
}

const BR_FIXED_HOLIDAYS: Array<[number, number]> = [
	[1, 1], [4, 21], [5, 1], [9, 7], [10, 12], [11, 2], [11, 15], [12, 25],
];

function getEasterDate(year: number): Date {
	const a = year % 19;
	const b = Math.floor(year / 100);
	const c = year % 100;
	const d = Math.floor(b / 4);
	const e = b % 4;
	const f = Math.floor((b + 8) / 25);
	const g = Math.floor((b - f + 1) / 3);
	const h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4);
	const k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = Math.floor((a + 11 * h + 22 * l) / 451);
	const month = Math.floor((h + l - 7 * m + 114) / 31);
	const day = ((h + l - 7 * m + 114) % 31) + 1;
	return new Date(year, month - 1, day);
}

function isNonWorkingDay(isoDate: string): boolean {
	const d = parseISODate(isoDate);
	if (!d) return false;
	if (d.getDay() === 0) return true;
	const month = d.getMonth() + 1;
	const day = d.getDate();
	if (BR_FIXED_HOLIDAYS.some(([m, dd]) => m === month && dd === day)) return true;
	const goodFriday = addDays(getEasterDate(d.getFullYear()), -2);
	if (toISODate(goodFriday) === isoDate) return true;
	return false;
}

export function adjustForNonWorking(isoDate: string, direction: "before" | "after"): string {
	let current = isoDate;
	const step = direction === "before" ? -1 : 1;
	let safety = 0;
	while (isNonWorkingDay(current) && safety < 14) {
		current = toISODate(addDays(parseISODate(current)!, step));
		safety++;
	}
	return current;
}


async function resolveVisibilityContext(params?: RecurrenceVisibilityParams) {
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

export function buildSqlVisibilityClause(
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

async function insertGeneratedTransacaoLocal(payload: SeedTransacaoPayload, dueDate: string) {
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
	const skipNonWorking = params.recurrence.skipNonWorking ? 1 : 0;
	const skipDirection = params.recurrence.skipDirection ?? null;
	const uuid = generateRecurrenceUuid();
	const templateJson = JSON.stringify(buildTemplatePayload({
		...params.data,
		user_id: params.data.user_id ?? visibility.userId ?? null,
	}));
	const nextDueDate = getNextDueDate(dueDate, frequency);

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
        skip_non_working,
        skip_direction,
        user_id,
        family_id,
        is_family_shared,
        created_at,
        updated_at,
        deleted
      ) VALUES (?, 'ativa', ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `,
		uuid,
		frequency,
		dueDate,
		nextDueDate,
		params.recurrence.endDate ?? null,
		templateJson,
		1,
		nowISO(),
		skipNonWorking,
		skipDirection,
		params.data.user_id ?? visibility.userId ?? null,
		params.data.family_id ?? visibility.familyId ?? null,
		Number(params.data.is_family_shared ?? 0),
		nowISO(),
		nowISO()
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

function getValidationHorizon(todayISO: string, frequency: RecurrenceFrequency) {
	const today = parseISODate(todayISO) ?? new Date();
	if (frequency === "semanal") return toISODate(addDays(today, 7));
	if (frequency === "anual") return toISODate(addYearsClamped(today, 1));
	return toISODate(addMonthsClamped(today, 1));
}

let recurrenceGenerationInFlight: Promise<{ generated: number; validated: number }> | null = null;

export async function validateAndGeneratePendingRecurrences(options?: {
	referenceDate?: string | null;
	visibilityScope?: VisibilityScope;
	userId?: string | null;
	familyId?: number | null;
}) {
	if (!db || Platform.OS === "web") {
		return { generated: 0, validated: 0 };
	}

	if (recurrenceGenerationInFlight) {
		return recurrenceGenerationInFlight;
	}

	recurrenceGenerationInFlight = _validateAndGeneratePendingRecurrences(options);
	try {
		return await recurrenceGenerationInFlight;
	} finally {
		recurrenceGenerationInFlight = null;
	}
}

async function _validateAndGeneratePendingRecurrences(options?: {
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
		const horizon = getValidationHorizon(todayISO, recurrence.frequency as RecurrenceFrequency);
		let cursor = recurrence.next_due_date || recurrence.base_due_date;
		let occurrenceSequence = Number(recurrence.occurrences_count || 0);
		const shouldSkip = Number(recurrence.skip_non_working ?? 0) === 1;
		const skipDir = (recurrence.skip_direction ?? "after") as "before" | "after";

		while (cursor <= horizon) {
			if (endDate && cursor > endDate) {
				cursor = getNextDueDate(cursor, recurrence.frequency as RecurrenceFrequency);
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

				const actualDueDate = shouldSkip ? adjustForNonWorking(cursor, skipDir) : cursor;

				const insertedId = await insertGeneratedTransacaoLocal(
					{
						remote_id: null,
						tipo: template.tipo ?? "pagar",
						valor: Number(template.valor || 0),
						id_categoria: template.id_categoria ?? null,
						id_pessoa: template.id_pessoa ?? null,
						pessoa: template.pessoa ?? null,
						id_imobilizado: template.id_imobilizado ?? null,
						family_id: template.family_id ?? recurrence.family_id ?? null,
						is_family_shared: Number(template.is_family_shared ?? recurrence.is_family_shared ?? 0),
						user_id: template.user_id ?? recurrence.user_id ?? null,
						data_transacao: atNoonISO(actualDueDate),
						data_vencimento: actualDueDate,
						status: template.status ?? "pendente",
						observacao: template.observacao ?? null,
						json: template.json ?? null,
					},
					actualDueDate
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

			cursor = getNextDueDate(cursor, recurrence.frequency as RecurrenceFrequency);
		}

		await db.runAsync(
			`
        UPDATE recorrencias
        SET next_due_date = ?,
            occurrences_count = ?,
            last_generated_at = ?,
            updated_at = ?,
            sync_status = 'pending',
            synced = 0
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

export async function applyEditToRecurrenceTransacoes(params: {
	recurrenceUuid: string;
	currentTransacaoId: number;
	scope: "this_and_future" | "all";
	templatePayload: {
		tipo?: string | null;
		valor?: number | null;
		id_categoria?: number | null;
		id_pessoa?: number | null;
		pessoa?: string | null;
		id_imobilizado?: number | null;
		id_banco?: number | null;
		family_id?: number | null;
		is_family_shared?: number | null;
		observacao?: string | null;
		json?: string | null;
		user_id?: string | null;
	};
}) {
	if (!db || Platform.OS === "web") return;

	const recurrence = await db.getFirstAsync<any>(
		`SELECT * FROM recorrencias WHERE uuid = ? AND deleted = 0 LIMIT 1`,
		params.recurrenceUuid
	);
	if (!recurrence) return;

	const currentLink = await db.getFirstAsync<any>(
		`SELECT sequence FROM recorrencia_transacoes WHERE id_transacao = ? LIMIT 1`,
		params.currentTransacaoId
	);
	const currentSequence = currentLink?.sequence ?? 0;

	let linkedRows: Array<{ id_transacao: number }>;
	if (params.scope === "this_and_future") {
		linkedRows = await db.getAllAsync<any>(
			`SELECT id_transacao FROM recorrencia_transacoes
			 WHERE id_recurrencia = ? AND sequence > ?
			 ORDER BY sequence ASC`,
			recurrence.id_recurrencia,
			currentSequence
		);
	} else {
		linkedRows = await db.getAllAsync<any>(
			`SELECT id_transacao FROM recorrencia_transacoes
			 WHERE id_recurrencia = ?
			 ORDER BY sequence ASC`,
			recurrence.id_recurrencia
		);
	}

	const p = params.templatePayload;
	for (const link of linkedRows) {
		if (link.id_transacao === params.currentTransacaoId) continue;
		await db.runAsync(
			`UPDATE transacoes
			 SET tipo = COALESCE(?, tipo),
			     valor = COALESCE(?, valor),
			     id_categoria = ?,
			     id_pessoa = ?,
			     pessoa = ?,
			     id_imobilizado = ?,
			     id_banco = ?,
			     family_id = ?,
			     is_family_shared = ?,
			     observacao = ?,
			     json = ?,
			     updated_at = ?,
			     sync_status = 'pending',
			     synced = 0
			 WHERE id_transacao = ? AND deleted = 0`,
			p.tipo ?? null,
			p.valor ?? null,
			p.id_categoria ?? null,
			p.id_pessoa ?? null,
			p.pessoa ?? null,
			p.id_imobilizado ?? null,
			p.id_banco ?? null,
			p.family_id ?? null,
			Number(p.is_family_shared ?? 0),
			p.observacao ?? null,
			p.json ?? null,
			nowISO(),
			link.id_transacao
		);
	}

	let existingTemplate: any = {};
	try {
		existingTemplate = recurrence.template_json ? JSON.parse(recurrence.template_json) : {};
	} catch {}

	const newTemplateJson = JSON.stringify({
		...existingTemplate,
		tipo: p.tipo ?? existingTemplate.tipo,
		valor: p.valor ?? existingTemplate.valor,
		id_categoria: p.id_categoria ?? null,
		id_pessoa: p.id_pessoa ?? null,
		pessoa: p.pessoa ?? null,
		id_imobilizado: p.id_imobilizado ?? null,
		family_id: p.family_id ?? null,
		is_family_shared: Number(p.is_family_shared ?? 0),
		observacao: p.observacao ?? null,
		json: p.json ?? null,
		user_id: p.user_id ?? existingTemplate.user_id ?? null,
	});

	await db.runAsync(
		`UPDATE recorrencias
		 SET template_json = ?,
		     updated_at = ?,
		     sync_status = 'pending',
		     synced = 0
		 WHERE id_recurrencia = ?`,
		newTemplateJson,
		nowISO(),
		recurrence.id_recurrencia
	);
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
        COUNT(CASE WHEN t.deleted = 0 THEN rt.id_transacao END) AS active_transactions_count,
        json_extract(r.template_json, '$.valor')       AS valor,
        json_extract(r.template_json, '$.pessoa')      AS pessoa,
        json_extract(r.template_json, '$.observacao')  AS observacao,
        json_extract(r.template_json, '$.json')        AS json,
        cc.nome                                         AS categoria
      FROM recorrencias r
      LEFT JOIN recorrencia_transacoes rt
        ON rt.id_recurrencia = r.id_recurrencia
      LEFT JOIN transacoes t
        ON t.id_transacao = rt.id_transacao
      LEFT JOIN categoria_catalogo cc
        ON cc.id = json_extract(r.template_json, '$.id_categoria')
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
          updated_at = ?,
          sync_status = 'pending',
          synced = 0
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
          updated_at = ?,
          sync_status = 'pending',
          synced = 0
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
          updated_at = ?,
          sync_status = 'pending',
          synced = 0
      WHERE uuid = ?
        AND deleted = 0
    `,
		nowISO(),
		uuid
	);
	return { deleted: true };
}

export async function getRecorrenciaByUuid(uuid: string) {
	if (!db || Platform.OS === "web") return null;

	const row = await db.getFirstAsync<any>(
		`
      SELECT
        r.*,
        cc.nome AS categoria
      FROM recorrencias r
      LEFT JOIN categoria_catalogo cc
        ON cc.id = json_extract(r.template_json, '$.id_categoria')
      WHERE r.uuid = ?
        AND r.deleted = 0
      LIMIT 1
    `,
		uuid
	);
	if (!row) return null;

	let template: any = {};
	try {
		template = row.template_json ? JSON.parse(row.template_json) : {};
	} catch {}

	return { ...row, template };
}

export async function materializeRecurrenceOccurrence(params: {
	recurrenceUuid: string;
	dueDate: string;
	overrides?: Record<string, any> | null;
	status?: "pendente" | "pago";
	dataBaixa?: string | null;
	deleted?: boolean;
}) {
	if (!db || Platform.OS === "web") {
		throw new Error("Recorrencia disponivel somente no banco local no app movel");
	}

	const recurrence = await loadRecurrenceByUuid(params.recurrenceUuid);
	if (!recurrence) throw new Error("Recorrencia nao encontrada");

	const existing = await db.getFirstAsync<{ id_transacao: number }>(
		`
      SELECT id_transacao
      FROM recorrencia_transacoes
      WHERE id_recurrencia = ?
        AND due_date = ?
      LIMIT 1
    `,
		recurrence.id_recurrencia,
		params.dueDate
	);
	if (existing) {
		return { id_transacao: Number(existing.id_transacao), alreadyExisted: true };
	}

	let template: any = {};
	try {
		template = recurrence.template_json ? JSON.parse(recurrence.template_json) : {};
	} catch {}

	const shouldSkip = Number(recurrence.skip_non_working ?? 0) === 1;
	const skipDir = (recurrence.skip_direction ?? "after") as "before" | "after";
	const defaultDueDate = shouldSkip ? adjustForNonWorking(params.dueDate, skipDir) : params.dueDate;

	const o = params.overrides ?? {};
	const pick = (key: string, fallback: any = null) =>
		o[key] !== undefined ? o[key] : template[key] ?? fallback;

	const dataVencimento = o.data_vencimento ?? defaultDueDate;
	const status = params.status ?? "pendente";
	const dataBaixa = status === "pago" ? params.dataBaixa ?? toISODate(new Date()) : null;

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
        created_at,
        updated_at,
        data_sync,
        sync_status,
        synced,
        deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
		null,
		pick("tipo", "pagar"),
		Number(pick("valor", 0) || 0),
		pick("id_categoria"),
		pick("id_pessoa"),
		pick("pessoa"),
		pick("id_imobilizado"),
		o.id_banco ?? null,
		o.family_id !== undefined ? o.family_id : template.family_id ?? recurrence.family_id ?? null,
		Number(
			o.is_family_shared !== undefined
				? o.is_family_shared
				: template.is_family_shared ?? recurrence.is_family_shared ?? 0
		),
		template.user_id ?? recurrence.user_id ?? null,
		atNoonISO(dataVencimento),
		dataVencimento,
		dataBaixa,
		status,
		pick("observacao"),
		pick("json"),
		nowISO(),
		nowISO(),
		null,
		"pending",
		0,
		params.deleted ? 1 : 0
	);
	const transacaoId = Number(insertResult.lastInsertRowId);

	const seqRow = await db.getFirstAsync<{ seq: number }>(
		`SELECT COALESCE(MAX(sequence), 0) + 1 AS seq FROM recorrencia_transacoes WHERE id_recurrencia = ?`,
		recurrence.id_recurrencia
	);
	const sequence = Number(seqRow?.seq ?? 1);

	const linkResult = await db.runAsync(
		`
      INSERT OR IGNORE INTO recorrencia_transacoes (
        id_recurrencia,
        id_transacao,
        due_date,
        sequence,
        created_at
      ) VALUES (?, ?, ?, ?, ?)
    `,
		recurrence.id_recurrencia,
		transacaoId,
		params.dueDate,
		sequence,
		nowISO()
	);

	if (Number(linkResult.changes ?? 0) === 0) {
		await db.runAsync(`DELETE FROM transacoes WHERE id_transacao = ?`, transacaoId);
		const winner = await db.getFirstAsync<{ id_transacao: number }>(
			`
        SELECT id_transacao
        FROM recorrencia_transacoes
        WHERE id_recurrencia = ?
          AND due_date = ?
        LIMIT 1
      `,
			recurrence.id_recurrencia,
			params.dueDate
		);
		return { id_transacao: Number(winner?.id_transacao ?? 0) || null, alreadyExisted: true };
	}

	await db.runAsync(
		`
      UPDATE recorrencias
      SET occurrences_count = MAX(occurrences_count, ?),
          updated_at = ?,
          sync_status = 'pending',
          synced = 0
      WHERE id_recurrencia = ?
    `,
		sequence,
		nowISO(),
		recurrence.id_recurrencia
	);

	return { id_transacao: transacaoId, alreadyExisted: false };
}

export async function deleteRecorrenciaWithTransacoes(uuid: string) {
	if (!db || Platform.OS === "web") return { deleted: false };
	await db.runAsync(
		`
      UPDATE transacoes
      SET deleted = 1,
          updated_at = ?,
          sync_status = 'pending',
          synced = 0
      WHERE id_transacao IN (
        SELECT rt.id_transacao
        FROM recorrencia_transacoes rt
        JOIN recorrencias r ON r.id_recurrencia = rt.id_recurrencia
        WHERE r.uuid = ? AND r.deleted = 0
      ) AND deleted = 0
    `,
		nowISO(),
		uuid
	);
	return deleteRecorrencia(uuid);
}
