import { bancoModel } from "./banco";
import { cartaoFaturaModel } from "./cartaoFatura";
import { imobilizadoModel } from "./imobilizado";
import { pessoaModel } from "./pessoa";
import { tipoImobilizadoModel } from "./tipoImobilizado";
import { transacaoModel } from "./transacao";

export { bancoModel, cartaoFaturaModel, imobilizadoModel, pessoaModel, tipoImobilizadoModel, transacaoModel };
export { upsertRemoteTransacaoLocally } from "./transacao";
export type { SyncModel } from "./types";

// Ordem de subida/descida: dependências primeiro, para que as FKs resolvam
// para ids já sincronizados (banco/fatura antes de transações).
export const SYNC_MODELS = [
	pessoaModel,
	tipoImobilizadoModel,
	imobilizadoModel,
	bancoModel,
	cartaoFaturaModel,
	transacaoModel,
];
