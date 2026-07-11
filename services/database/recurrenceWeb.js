import { supabase } from "@/services/supabase/client";
import { expandGhostsFromRules } from "@/services/database/recurrenceProjection";

// Leitura de recorrências no web (Supabase). O nativo usa SQLite; aqui reaproveitamos
// o mesmo algoritmo puro de projeção (expandGhostsFromRules), só trocando a fonte de dados.
// No Supabase as datas são TIMESTAMPTZ e template_json é JSONB (objeto), então normalizamos
// datas para YYYY-MM-DD e aceitamos o template já como objeto.

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
	const { data } = await supabase.from("categoria_catalogo").select("id,nome");
	const map = new Map();
	(data ?? []).forEach((cat) => map.set(Number(cat.id), cat.nome));
	return map;
}

// Conjunto de datas já materializadas por recorrência (Map<uuid, Set<YYYY-MM-DD>>) numa
// única query, chaveado pelo uuid via mapa id_recurrencia(remoto) → uuid.
async function fetchExistingDueDates(recurrences) {
	const idToUuid = new Map();
	const map = new Map();
	recurrences.forEach((rec) => {
		idToUuid.set(Number(rec.id_recurrencia), rec.uuid);
		map.set(rec.uuid, new Set());
	});
	const ids = [...idToUuid.keys()];
	if (!ids.length) return map;

	const { data, error } = await supabase
		.from("recorrencia_transacoes")
		.select("id_recurrencia,due_date")
		.in("id_recurrencia", ids);
	if (error) throw error.message ?? error;

	(data ?? []).forEach((row) => {
		const uuid = idToUuid.get(Number(row.id_recurrencia));
		if (uuid) map.get(uuid).add(dateOnly(row.due_date));
	});
	return map;
}

async function fetchActiveRecurrences(visibility, categoryMap) {
	let query = supabase
		.from("recorrencias")
		.select("*")
		.eq("deleted", 0)
		.eq("status", "ativa");
	query = applyVisibility(query, visibility);

	const { data, error } = await query;
	if (error) throw error.message ?? error;

	return (data ?? []).map((row) => {
		const template = parseTemplate(row.template_json);
		const idCategoria = template.id_categoria ?? null;
		return {
			id_recurrencia: row.id_recurrencia,
			uuid: row.uuid,
			frequency: row.frequency,
			base_due_date: dateOnly(row.base_due_date),
			next_due_date: dateOnly(row.next_due_date),
			end_date: dateOnly(row.end_date),
			skip_non_working: row.skip_non_working,
			skip_direction: row.skip_direction,
			categoria: idCategoria != null ? categoryMap.get(Number(idCategoria)) ?? null : null,
			family_id: row.family_id ?? null,
			user_id: row.user_id ?? null,
			is_family_shared: row.is_family_shared ?? 0,
			template,
		};
	});
}

export async function projectGhostOccurrencesWeb({ dateFrom, dateTo, visibility }) {
	if (!dateTo) return [];
	const categoryMap = await fetchCategoryMap();
	const recurrences = await fetchActiveRecurrences(visibility, categoryMap);
	if (!recurrences.length) return [];
	const existingDatesByRecurrence = await fetchExistingDueDates(recurrences);
	return expandGhostsFromRules({ dateFrom, dateTo, recurrences, existingDatesByRecurrence });
}

// Listagem para a tabela "Recorrentes" (view-only). Mesmo shape consumido pelo card mobile:
// valor/pessoa/observacao/categoria extraídos do template, active_transactions_count agregado.
export async function listRecorrenciasWeb(params) {
	const visibility = {
		scope: params?.visibilityScope ?? "all",
		userId: params?.userId ?? null,
		familyId: params?.familyId ?? null,
	};
	const categoryMap = await fetchCategoryMap();

	let query = supabase.from("recorrencias").select("*").eq("deleted", 0);
	query = applyVisibility(query, visibility);
	query = query.order("id_recurrencia", { ascending: false });

	const { data, error } = await query;
	if (error) throw error.message ?? error;
	const rules = data ?? [];

	const ids = rules.map((row) => Number(row.id_recurrencia));
	const countByRecurrence = new Map();
	if (ids.length) {
		const { data: links } = await supabase
			.from("recorrencia_transacoes")
			.select("id_recurrencia")
			.in("id_recurrencia", ids);
		(links ?? []).forEach((link) => {
			const key = Number(link.id_recurrencia);
			countByRecurrence.set(key, (countByRecurrence.get(key) || 0) + 1);
		});
	}

	return rules.map((row) => {
		const template = parseTemplate(row.template_json);
		const idCategoria = template.id_categoria ?? null;
		return {
			...row,
			base_due_date: dateOnly(row.base_due_date),
			next_due_date: dateOnly(row.next_due_date),
			end_date: dateOnly(row.end_date),
			valor: Number(template.valor || 0),
			pessoa: template.pessoa ?? null,
			observacao: template.observacao ?? null,
			json: template.json ?? null,
			categoria: idCategoria != null ? categoryMap.get(Number(idCategoria)) ?? null : null,
			active_transactions_count: countByRecurrence.get(Number(row.id_recurrencia)) || 0,
		};
	});
}
