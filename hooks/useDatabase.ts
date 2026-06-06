import { createTransacoesRepository } from "@/services/database/transacoesRepository";
import { createManageRepository } from "@/services/database/manageRepository";
import { createBancoRepository } from "@/services/database/bancoRepository";
import { createBancoCatalogoRepository } from "@/services/database/bancoCatalogoRepository";
import { useMemo } from "react";

export { TransacaoDatabase } from "@/services/database/types";

export function useDatabase() {
	return useMemo(
		() => ({
			...createTransacoesRepository(),
			...createManageRepository(),
			...createBancoRepository(),
			...createBancoCatalogoRepository(),
		}),
		[]
	);
}

export default useDatabase;
