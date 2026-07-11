import {
	buildReadKey,
	invalidateReadCache,
	readThrough,
} from "@/services/database/readCache";

export function invalidateFinanceTransactions() {
	invalidateReadCache("finance-transactions");
}

export function loadTransactionHistory(database, params) {
	const key = buildReadKey("finance-transactions", params);
	return readThrough(key, () => database.getTransacao(undefined, params));
}
