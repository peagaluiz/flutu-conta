import { Platform } from "react-native";
import { db } from "@/services/database/db";
import {
	adjustForNonWorking,
	atNoonISO,
	getNextDueDate,
} from "@/services/database/recurrenceService";
import { buildSqlVisibilityClause } from "@/services/database/visibility";
import { addMonthsClamped, toISODate } from "@/utils/date";

const MAX_PROJECTION_MONTHS = 24;
const MAX_OCCURRENCES_PER_RECURRENCE = 120;

export function buildGhostId(recurrenceUuid, dueDate) {
	return `ghost:${recurrenceUuid}:${dueDate}`;
}

export function isGhostId(id) {
	return typeof id === "string" && id.startsWith("ghost:");
}

export function parseGhostId(id) {
	if (!isGhostId(id)) return null;
	const rest = id.slice("ghost:".length);
	const separator = rest.lastIndexOf(":");
	if (separator < 0) return null;
	return {
		recurrenceUuid: rest.slice(0, separator),
		dueDate: rest.slice(separator + 1),
	};
}

function sortDate(row) {
	return String(row?.data_vencimento || row?.data_transacao || "");
}

export function compareTransacaoRows(a, b) {
	const aBaixada = a?.data_baixa ? 1 : 0;
	const bBaixada = b?.data_baixa ? 1 : 0;
	if (aBaixada !== bBaixada) return aBaixada - bBaixada;

	const aDate = sortDate(a);
	const bDate = sortDate(b);
	if (aDate !== bDate) return aDate < bDate ? -1 : 1;

	const aId = Number(a?.id_transacao);
	const bId = Number(b?.id_transacao);
	const aReal = Number.isFinite(aId);
	const bReal = Number.isFinite(bId);
	if (aReal && bReal) return bId - aId;
	if (aReal !== bReal) return aReal ? -1 : 1;
	return String(a?.id_transacao || "") < String(b?.id_transacao || "") ? -1 : 1;
}

// Expansão pura (sem I/O): recebe as regras já normalizadas e o conjunto de datas
// já materializadas por recorrência, e devolve os fantasmas do período. Compartilhado
// entre nativo (dados do SQLite) e web (dados do Supabase). Cada `recurrence` tem:
// { uuid, frequency, base_due_date, next_due_date, end_date, skip_non_working,
//   skip_direction, categoria, template (objeto), family_id, user_id, is_family_shared }
// com datas em YYYY-MM-DD. `existingDatesByRecurrence` é um Map<uuid, Set<YYYY-MM-DD>>.
export function expandGhostsFromRules({ dateFrom, dateTo, recurrences, existingDatesByRecurrence }) {
	if (!dateTo) return [];

	const to = String(dateTo).slice(0, 10);
	const from = dateFrom ? String(dateFrom).slice(0, 10) : null;
	const maxDateTo = toISODate(addMonthsClamped(new Date(), MAX_PROJECTION_MONTHS));
	const effectiveDateTo = to < maxDateTo ? to : maxDateTo;

	const ghosts = [];

	for (const recurrence of recurrences ?? []) {
		const start = recurrence.next_due_date || recurrence.base_due_date;
		if (!start || start > effectiveDateTo) continue;

		const existingDueDates =
			existingDatesByRecurrence?.get(recurrence.uuid) ?? new Set();
		const template = recurrence.template ?? {};

		const shouldSkip = Number(recurrence.skip_non_working ?? 0) === 1;
		const skipDir = recurrence.skip_direction ?? "after";
		const endDate = recurrence.end_date ?? null;

		let cursor = start;
		let count = 0;
		while (cursor <= effectiveDateTo && count < MAX_OCCURRENCES_PER_RECURRENCE) {
			count += 1;
			if (endDate && cursor > endDate) break;

			if (!existingDueDates.has(cursor)) {
				const actualDueDate = shouldSkip ? adjustForNonWorking(cursor, skipDir) : cursor;
				const inRange = actualDueDate <= to && (!from || actualDueDate >= from);

				if (inRange) {
					ghosts.push({
						id_transacao: buildGhostId(recurrence.uuid, cursor),
						is_ghost: 1,
						ghost_due_date: cursor,
						remote_id: null,
						tipo: template.tipo ?? "pagar",
						valor: Number(template.valor || 0),
						id_categoria: template.id_categoria ?? null,
						categoria: recurrence.categoria ?? null,
						id_pessoa: template.id_pessoa ?? null,
						pessoa: template.pessoa ?? null,
						id_imobilizado: template.id_imobilizado ?? null,
						id_banco: null,
						family_id: template.family_id ?? recurrence.family_id ?? null,
						is_family_shared: Number(
							template.is_family_shared ?? recurrence.is_family_shared ?? 0
						),
						user_id: template.user_id ?? recurrence.user_id ?? null,
						data_transacao: atNoonISO(actualDueDate),
						data_vencimento: actualDueDate,
						data_baixa: null,
						status: "pendente",
						observacao: template.observacao ?? null,
						json: template.json ?? null,
						deleted: 0,
						sync_status: null,
						synced: 0,
						is_from_recurrence: 1,
						recurrence_uuid: recurrence.uuid,
						recurrence_frequency: recurrence.frequency,
						recurrence_sequence: null,
					});
				}
			}

			cursor = getNextDueDate(cursor, recurrence.frequency);
		}
	}

	return ghosts;
}

export async function projectGhostOccurrences({ dateFrom, dateTo, visibility }) {
	if (!db || Platform.OS === "web" || !dateTo) return [];

	const sqlVisibility = buildSqlVisibilityClause("r", visibility);
	const rows = await db.getAllAsync(
		`
      SELECT
        r.*,
        cc.nome AS categoria
      FROM recorrencias r
      LEFT JOIN categoria_catalogo cc
        ON cc.id = json_extract(r.template_json, '$.id_categoria')
      WHERE r.deleted = 0
        AND r.status = 'ativa'
        AND ${sqlVisibility.where}
      ORDER BY r.id_recurrencia ASC
    `,
		...sqlVisibility.args
	);

	const existingDatesByRecurrence = new Map();
	const recurrences = [];
	for (const row of rows ?? []) {
		let template = {};
		try {
			template = row.template_json ? JSON.parse(row.template_json) : {};
		} catch {}
		recurrences.push({
			uuid: row.uuid,
			frequency: row.frequency,
			base_due_date: row.base_due_date,
			next_due_date: row.next_due_date,
			end_date: row.end_date ?? null,
			skip_non_working: row.skip_non_working,
			skip_direction: row.skip_direction,
			categoria: row.categoria ?? null,
			family_id: row.family_id ?? null,
			user_id: row.user_id ?? null,
			is_family_shared: row.is_family_shared ?? 0,
			template,
		});

		const linkRows = await db.getAllAsync(
			`SELECT due_date FROM recorrencia_transacoes WHERE id_recurrencia = ?`,
			row.id_recurrencia
		);
		existingDatesByRecurrence.set(
			row.uuid,
			new Set((linkRows ?? []).map((link) => String(link.due_date)))
		);
	}

	return expandGhostsFromRules({ dateFrom, dateTo, recurrences, existingDatesByRecurrence });
}
