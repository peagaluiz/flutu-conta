import { supabase } from "@/services/supabase/client";
import { expandGhostsFromRules } from "@/services/database/recurrenceProjection";
import {
	buildReadKey,
	invalidateReadCache,
	readThrough,
} from "@/services/database/readCache";
import { loadRemoteCategoryCatalog } from "@/services/database/categoryCatalogRead";

let canUseReadModelView = true;

function applyVisibility(query, visibility) {
	if (!visibility?.userId) return query;
	const { scope, userId, familyId } = visibility;
	if (scope === "mine") return query.eq("user_id", userId);
	if (scope === "family") {
		if (!familyId) return query.eq("user_id", userId);
		return query.eq("family_id", familyId);
	}
	if (!familyId) return query.eq("user_id", userId);
	return query.or(`user_id.eq.${userId},family_id.eq.${familyId}`);
}

function dateOnly(value) {
	return value ? String(value).slice(0, 10) : null;
}

function parseTemplate(template) {
	if (!template) return {};
	if (typeof template === "string") {
		try {
			return JSON.parse(template);
		} catch {
			return {};
		}
	}
	return template;
}

async function fetchCategoryMap() {
	const data = await loadRemoteCategoryCatalog();
	return new Map(data.map((cat) => [Number(cat.id), cat.nome]));
}

function normalizeReadModelRow(row, categoryMap = null) {
	const template = parseTemplate(row.template_json);
	const categoryId = template.id_categoria ?? null;
	const links = Array.isArray(row.recurrence_links) ? row.recurrence_links : [];
	const dueDates = Array.isArray(row.due_dates)
		? row.due_dates
		: links.map((link) => link.due_date);

	return {
		...row,
		base_due_date: dateOnly(row.base_due_date),
		next_due_date: dateOnly(row.next_due_date),
		end_date: dateOnly(row.end_date),
		categoria:
			row.categoria ??
			(categoryId != null ? categoryMap?.get(Number(categoryId)) ?? null : null),
		template,
		due_dates: dueDates.map(dateOnly).filter(Boolean),
		active_transactions_count: Number(
			row.active_transactions_count ?? links.length ?? 0
		),
	};
}

async function fetchFromView(visibility) {
	let query = supabase
		.from("finance_recurrence_read_model")
		.select("*")
		.eq("deleted", 0)
		.order("id_recurrencia", { ascending: false });
	query = applyVisibility(query, visibility);
	const { data, error } = await query;
	if (error) throw error;
	return (data ?? []).map((row) => normalizeReadModelRow(row));
}

async function fetchFallback(visibility) {
	const [categoryMap, recurrenceResult] = await Promise.all([
		fetchCategoryMap(),
		(async () => {
			let query = supabase
				.from("recorrencias")
				.select("*, recurrence_links:recorrencia_transacoes(due_date,id_transacao)")
				.eq("deleted", 0)
				.order("id_recurrencia", { ascending: false });
			query = applyVisibility(query, visibility);
			return query;
		})(),
	]);
	if (recurrenceResult.error) throw recurrenceResult.error.message ?? recurrenceResult.error;
	return (recurrenceResult.data ?? []).map((row) => normalizeReadModelRow(row, categoryMap));
}

export function invalidateRecurrenceReadModel() {
	invalidateReadCache("recurrence-read-model");
}

export async function getRecurrenceReadModel(params = {}) {
	const visibility = {
		scope: params.visibilityScope ?? "all",
		userId: params.userId ?? null,
		familyId: params.familyId ?? null,
	};
	const key = buildReadKey("recurrence-read-model", visibility);

	return readThrough(key, async () => {
		if (canUseReadModelView) {
			try {
				return await fetchFromView(visibility);
			} catch (error) {
				const code = error?.code;
				if (code !== "42P01" && code !== "PGRST205") throw error;
				canUseReadModelView = false;
			}
		}
		return fetchFallback(visibility);
	});
}

export async function projectGhostOccurrencesWeb({ dateFrom, dateTo, visibility }) {
	if (!dateTo) return [];
	const rows = await getRecurrenceReadModel({
		visibilityScope: visibility?.scope,
		userId: visibility?.userId,
		familyId: visibility?.familyId,
	});
	const active = rows.filter((row) => row.status === "ativa");
	const existingDatesByRecurrence = new Map(
		active.map((row) => [row.uuid, new Set(row.due_dates)])
	);
	return expandGhostsFromRules({
		dateFrom,
		dateTo,
		recurrences: active,
		existingDatesByRecurrence,
	});
}

export async function listRecorrenciasWeb(params) {
	const rows = await getRecurrenceReadModel(params);
	return rows.map((row) => ({
		...row,
		valor: Number(row.template.valor || 0),
		pessoa: row.template.pessoa ?? null,
		observacao: row.template.observacao ?? null,
		json: row.template.json ?? null,
	}));
}
