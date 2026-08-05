import { useMemo } from "react";
import { normalizeDate } from "@/components/finance/insert/insertFormConfig";

function firstValue(value) {
	return Array.isArray(value) ? value[0] : value;
}

function textParam(value) {
	const v = firstValue(value);
	return typeof v === "string" && v.trim() ? v.trim() : null;
}

function enumParam(value, allowed) {
	const v = firstValue(value);
	return allowed.includes(v) ? v : null;
}

// Leitura dos parâmetros de rota do formulário de inserção.
// "ghost" = ocorrência prevista de recorrência ainda não materializada.
export function useInsertParams(params) {
	const editId = useMemo(() => {
		const raw = firstValue(params?.id_transacao);
		const n = Number(raw);
		return raw && !Number.isNaN(n) ? n : null;
	}, [params?.id_transacao]);

	const fromParam = useMemo(
		() => enumParam(params?.from, ["launches"]),
		[params?.from]
	);

	const ghostRecurrenceUuid = useMemo(
		() => textParam(params?.ghost_recurrence_uuid),
		[params?.ghost_recurrence_uuid]
	);

	const ghostDueDate = useMemo(
		() => normalizeDate(firstValue(params?.ghost_due_date)),
		[params?.ghost_due_date]
	);

	const ghostDataVencimento = useMemo(
		() => normalizeDate(firstValue(params?.ghost_data_vencimento)),
		[params?.ghost_data_vencimento]
	);

	const tipoParam = useMemo(
		() => enumParam(params?.tipo, ["receber", "pagar"]),
		[params?.tipo]
	);

	const categoriaParam = useMemo(() => textParam(params?.categoria), [params?.categoria]);

	const dataVencimentoParam = useMemo(
		() => normalizeDate(firstValue(params?.data_vencimento)),
		[params?.data_vencimento]
	);

	const recurrenceModeParam = useMemo(
		() => enumParam(params?.recurrence_mode, ["recorrente"]),
		[params?.recurrence_mode]
	);

	return {
		editId,
		fromParam,
		ghostRecurrenceUuid,
		ghostDueDate,
		ghostDataVencimento,
		ghostMode: Boolean(ghostRecurrenceUuid && ghostDueDate && !editId),
		tipoParam,
		categoriaParam,
		dataVencimentoParam,
		recurrenceModeParam,
	};
}
