import { Platform } from "react-native";
import { supabase } from "@/services/supabase/client";
import {
	SYNC_MODELS,
	bancoModel,
	cartaoFaturaModel,
	imobilizadoModel,
	pessoaModel,
	tipoImobilizadoModel,
	transacaoModel,
} from "@/services/database/models";
import { pullModel, pushModel } from "@/services/database/sync/engine";
import { backfillLocalOwnershipIfMissing } from "@/services/database/sync/ownershipBackfill";
import {
	syncPendingRecorrencias,
	syncPendingRecorrenciaTransacoes,
} from "@/services/database/sync/recorrencias";
import { createEmptySummary, mergeSummary, type SyncSummary } from "@/services/database/sync/summary";

export type { SyncSummary };
export { upsertRemoteTransacaoLocally } from "@/services/database/models";

const SYNC_COOLDOWN_MS = 60_000;

let lastSyncAttemptAt = 0;
let syncInFlight: Promise<SyncSummary> | null = null;

const PUSH_STEP_LABEL: Record<string, string> = {
	pessoa: "Enviando pessoas...",
	tipo_imobilizado: "Enviando tipos...",
	imobilizado: "Enviando bens...",
	// Banco e faturas sobem antes das transações para que id_banco/id_fatura resolvam para remote_id
	banco: "Enviando bancos...",
	cartao_faturas: "Enviando faturas...",
	transacoes: "Enviando lançamentos...",
};

async function syncAllPendingInternal(onProgress?: (step: string) => void) {
	onProgress?.("Verificando dados locais...");
	await backfillLocalOwnershipIfMissing();

	const full = createEmptySummary();

	for (const model of SYNC_MODELS) {
		onProgress?.(PUSH_STEP_LABEL[model.table]);
		mergeSummary(full, await pushModel(model));
	}

	// A descida segue a mesma ordem: bancos/faturas antes de transações para que
	// as FKs remotas encontrem o id local correspondente.
	onProgress?.("Baixando dados do servidor...");
	for (const model of SYNC_MODELS) {
		if (model.table === "banco") onProgress?.("Atualizando bancos...");
		mergeSummary(full, await pullModel(model));
	}

	onProgress?.("Enviando recorrências...");
	await syncPendingRecorrencias(full);

	onProgress?.("Enviando vínculos de recorrência...");
	await syncPendingRecorrenciaTransacoes(full);

	return full;
}

export async function syncAllPendingData(options?: {
	force?: boolean;
	throwOnError?: boolean;
	onProgress?: (step: string) => void;
}) {
	if (Platform.OS === "web") return;

	const force = !!options?.force;
	const throwOnError = !!options?.throwOnError;
	const now = Date.now();

	if (!force && now - lastSyncAttemptAt < SYNC_COOLDOWN_MS) {
		return createEmptySummary();
	}

	if (syncInFlight) {
		return syncInFlight;
	}

	lastSyncAttemptAt = now;
	syncInFlight = (async () => {
		let summary = createEmptySummary();
		try {
			summary = await syncAllPendingInternal(options?.onProgress);

			if (throwOnError && summary.errors > 0) {
				throw new Error("Falha ao sincronizar alguns registros com o Supabase");
			}

			return summary;
		} finally {
			syncInFlight = null;
		}
	})();

	return syncInFlight;
}

export async function syncPendingTransacoes(options?: { force?: boolean }) {
	return syncAllPendingData({ force: options?.force });
}

export async function fetchRemoteTransacaoById(id: number) {
	const { data, error } = await supabase
		.from("transacoes")
		.select("*")
		.eq("id_transacao", id)
		.maybeSingle();

	if (error) throw error.message;
	return data ?? null;
}

export {
	bancoModel,
	cartaoFaturaModel,
	imobilizadoModel,
	pessoaModel,
	tipoImobilizadoModel,
	transacaoModel,
};
