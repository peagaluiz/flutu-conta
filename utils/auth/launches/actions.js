import { getItemType } from "./sections";

const DELETE_ACTIONS = {
    transacoes: (database) => async (item) => database.deleteTransacao(item.id_transacao),
    pessoas: (database) => async (item) => database.deletePessoa(item.id_pessoa),
    imobilizados: (database) => async (item) => database.deleteImobilizado(item.id_imobilizado),
    recorrencias: (database) => async (item) => database.deleteRecorrencia(item.uuid),
};

const ITEM_CHECKS = {
    transacoes: (item) => item?.id_transacao != null,
    pessoas: (item) => item?.id_pessoa != null,
    imobilizados: (item) => item?.id_imobilizado != null,
    recorrencias: (item) => item?.id_recurrencia != null,
};

export function getDeleteAction(database, section) {
    return DELETE_ACTIONS[section]?.(database) ?? null;
}

export function getItemActionType(item) {
    return getItemType(item);
}

export function getItemKey(item, index = 0) {
    if (!item) return `tmp_${index}`;
    return item.id_transacao ?? item.id_pessoa ?? item.id_imobilizado ?? item.id_recurrencia ?? index;
}

export function filterValidItems(items, section) {
    return (Array.isArray(items) ? items : []).filter(ITEM_CHECKS[section] ?? ITEM_CHECKS.transacoes);
}