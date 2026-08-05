// Contadores agregados de uma rodada de sincronização.

export const SYNC_TABLES = [
	"pessoa",
	"tipo_imobilizado",
	"imobilizado",
	"transacoes",
	"banco",
	"cartao_faturas",
	"recorrencias",
	"recorrencia_transacoes",
] as const;

export type SyncTableName = (typeof SYNC_TABLES)[number];

export type TableSummary = { processed: number; synced: number; errors: number };

export type SyncSummary = {
	processed: number;
	synced: number;
	errors: number;
	tables: Record<SyncTableName, TableSummary>;
};

export function createEmptySummary(): SyncSummary {
	const tables = {} as Record<SyncTableName, TableSummary>;
	for (const table of SYNC_TABLES) {
		tables[table] = { processed: 0, synced: 0, errors: 0 };
	}
	return { processed: 0, synced: 0, errors: 0, tables };
}

export function mergeSummary(target: SyncSummary, source: SyncSummary) {
	target.processed += source.processed;
	target.synced += source.synced;
	target.errors += source.errors;

	for (const table of SYNC_TABLES) {
		target.tables[table].processed += source.tables[table].processed;
		target.tables[table].synced += source.tables[table].synced;
		target.tables[table].errors += source.tables[table].errors;
	}
}

export function countProcessed(summary: SyncSummary, table: SyncTableName) {
	summary.processed += 1;
	summary.tables[table].processed += 1;
}

export function countSynced(summary: SyncSummary, table: SyncTableName) {
	summary.synced += 1;
	summary.tables[table].synced += 1;
}

export function countError(summary: SyncSummary, table: SyncTableName) {
	summary.errors += 1;
	summary.tables[table].errors += 1;
}
