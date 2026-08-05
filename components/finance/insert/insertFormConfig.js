import * as yup from "yup";
import { createNumberMask } from "react-native-mask-input";
import { brNumber } from "@/utils/validators/yupCustom";
import { toISODate } from "@/utils/date";

export const decimalMask = createNumberMask({
	delimiter: ".",
	separator: ",",
	precision: 2,
});


export const insertSchema = yup.object().shape({
	tipo: yup.string().required("Selecione o tipo").oneOf(["pagar", "receber"]),
	valor: brNumber("Valor").required("O campo Valor é obrigatório"),
	categoria: yup.string().required("O campo Categoria é obrigatório"),
	descricao: yup.string().nullable(),
	recurrence_mode: yup
		.string()
		.required("Selecione o tipo de recorrência")
		.oneOf(["unica", "recorrente"]),
	recurrence_frequency: yup.string().when("recurrence_mode", {
		is: "recorrente",
		then: (schemaRef) =>
			schemaRef
				.required("Selecione a frequência")
				.oneOf(["semanal", "mensal", "anual"]),
		otherwise: (schemaRef) => schemaRef.nullable().notRequired(),
	}),
	recurrence_end_date: yup.string().nullable(),
	recurrence_skip_non_working: yup.boolean().default(false),
	recurrence_skip_direction: yup.string().nullable().when("recurrence_skip_non_working", {
		is: true,
		then: (schemaRef) =>
			schemaRef.required("Selecione antes ou depois").oneOf(["before", "after"]),
		otherwise: (schemaRef) => schemaRef.nullable().notRequired(),
	}),
	pessoa: yup.string().nullable(),
	data_vencimento: yup.string().nullable(),
	status: yup
		.string()
		.required("Selecione o status")
		.oneOf(["pendente", "pago"]),
	data_baixa: yup.string().nullable().when("status", {
		is: "pago",
		then: (schemaRef) => schemaRef.required("Informe a data de baixa"),
		otherwise: (schemaRef) => schemaRef.nullable().notRequired(),
	}),
	share_with_family: yup.boolean().default(false),
	observacao: yup.string().nullable(),
	id_banco: yup.number().nullable().optional(),
	parcelas: yup.number().nullable().optional().default(1),
});

export function parseBrNumber(value) {
	if (typeof value !== "string") return Number(value || 0);
	const normalized = value.replace(/\./g, "").replace(",", ".");
	const n = Number(normalized);
	return Number.isNaN(n) ? 0 : n;
}

export function normalizeDate(value) {
	if (!value) return null;

	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return value;
	}

	// ISO timestamp: "2026-06-06T00:00:00Z", "2026-06-06T03:00:00+00:00", etc.
	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
		return value.slice(0, 10);
	}

	if (typeof value === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
		const [dd, mm, yyyy] = value.split("/");
		return `${yyyy}-${mm}-${dd}`;
	}

	const onlyDigits = String(value).replace(/\D/g, "");
	if (onlyDigits.length === 8) {
		const dd = onlyDigits.slice(0, 2);
		const mm = onlyDigits.slice(2, 4);
		const yyyy = onlyDigits.slice(4, 8);
		return `${yyyy}-${mm}-${dd}`;
	}

	return null;
}

export { toISODate };

export function formatDateDisplay(value) {
	if (!value) return "Selecionar data";
	const normalized = normalizeDate(value);
	if (!normalized) return "Selecionar data";

	const [yyyy, mm, dd] = normalized.split("-");
	return `${dd}/${mm}/${yyyy}`;
}

export function parseDateValue(value) {
	const normalized = normalizeDate(value);
	if (!normalized) return new Date();
	const [yyyy, mm, dd] = normalized.split("-");
	return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

export function formatValueForInput(value) {
	const parsed = Number(value || 0);
	return parsed.toLocaleString("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}
