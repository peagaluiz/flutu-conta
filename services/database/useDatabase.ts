import { createTransacoesRepository } from "@/services/database/transacoesRepository";
import { createManageRepository } from "@/services/database/manageRepository";
import { useMemo } from "react";

export { TransacaoDatabase } from "@/services/database/types";

export function useDatabase() {
	return useMemo(
		() => ({
			...createTransacoesRepository(),
			...createManageRepository(),
		}),
		[]
	);
}

export default useDatabase;
