import { normalizeTransacoes } from "./sections";

export const launchLoaders = {
    transacoes: async (database, options = {}) => {
        const rows = await database.getTransacao(undefined, {
            page: options.page ?? 1,
            limit: options.limit ?? 50,
            visibilityScope: options.visibilityScope,
            userId: options.userId ?? null,
            familyId: options.familyId ?? null,
        });
        return normalizeTransacoes(rows);
    },
    pessoas: (database) => database.listPessoasWithPending(),
    imobilizados: (database) => database.listImobilizados(),
    recorrencias: (database, options = {}) =>
        database.listRecorrencias({
            visibilityScope: options.visibilityScope,
            userId: options.userId ?? null,
            familyId: options.familyId ?? null,
        }),
    bancos: async (database, options = {}) => {
        const rows = await database.listBancos({
            visibilityScope: options.visibilityScope,
            userId: options.userId ?? null,
            familyId: options.familyId ?? null,
        });
        return (Array.isArray(rows) ? rows : []).map((r) => ({ ...r, _type: "banco" }));
    },
};

export async function loadSectionData(database, section, options = {}) {
    const loader = launchLoaders[section] ?? launchLoaders.transacoes;
    return loader(database, options);
}
