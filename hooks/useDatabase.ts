import { createTransacoesRepository } from "@/services/database/transacoesRepository";
import { createManageRepository } from "@/services/database/manageRepository";
import { createBancoRepository } from "@/services/database/bancoRepository";
import { createBancoCatalogoRepository } from "@/services/database/bancoCatalogoRepository";
import { createCategoriaCatalogoRepository } from "@/services/database/categoriaCatalogoRepository";
import { useMemo } from "react";

export { TransacaoDatabase } from "@/services/database/types";

export function useDatabase() {
	return useMemo(
		() => ({
			...createTransacoesRepository(),
			...createManageRepository(),
			...createBancoRepository(),
			...createBancoCatalogoRepository(),
			...createCategoriaCatalogoRepository(),
		}),
		[]
	);
}

export default useDatabase;
