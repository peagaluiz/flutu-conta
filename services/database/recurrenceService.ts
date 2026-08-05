// Fachada das recorrências. A implementação vive em:
//   recurrenceDates      — matemática de datas (pura)
//   recurrenceInternals  — template e inserção da transação gerada
//   recurrenceGeneration — criar, gerar pendentes, materializar, propagar edição
//   recurrenceCrud       — listar, pausar, ativar, excluir
export { adjustForNonWorking, atNoonISO, getNextDueDate } from "./recurrenceDates";
export type { RecurrenceCreateConfig } from "./recurrenceInternals";
export {
	applyEditToRecurrenceTransacoes,
	createRecurrenceFromNewTransaction,
	materializeRecurrenceOccurrence,
	validateAndGeneratePendingRecurrences,
} from "./recurrenceGeneration";
export {
	activateRecorrencia,
	deleteRecorrencia,
	deleteRecorrenciaWithTransacoes,
	getRecorrenciaByUuid,
	listRecorrencias,
	pauseRecorrencia,
} from "./recurrenceCrud";
