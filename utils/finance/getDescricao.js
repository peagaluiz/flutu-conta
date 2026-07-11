// Descrição de uma transação: vem no campo json ({ descricao }), com fallback
// para observacao.
export function getDescricao(item) {
	try {
		const parsed = JSON.parse(item?.json || "{}");
		if (parsed?.descricao) return parsed.descricao;
	} catch {}
	return item?.observacao || "";
}
