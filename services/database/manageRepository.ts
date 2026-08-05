import { createImobilizadoRepository } from "@/services/database/imobilizadoRepository";
import { createPessoaRepository } from "@/services/database/pessoaRepository";

// Agregador dos cadastros auxiliares. A implementação vive em pessoaRepository,
// imobilizadoRepository e tipoImobilizadoRepository — este arquivo só mantém a
// superfície única que os chamadores já usavam.
export function createManageRepository() {
	return {
		...createPessoaRepository(),
		...createImobilizadoRepository(),
	};
}
