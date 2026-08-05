// Descrição de uma transação: vem no campo json ({ descricao }), com fallback
// para observacao.
export function getDescricao(item) {
	try {
		const parsed = JSON.parse(item?.json || "{}");
		if (parsed?.descricao) return parsed.descricao;
	} catch {}
	return item?.observacao || "";
}

// Descrição e observação como campos independentes, para telas que exibem os dois
// separadamente (getDescricao mistura os dois via fallback).
export function getDetalhes(item) {
	let descricao = "";
	try {
		const parsed = JSON.parse(item?.json || "{}");
		if (parsed?.descricao) descricao = String(parsed.descricao).trim();
	} catch {}
	const observacao = String(item?.observacao || "").trim();
	return { descricao, observacao: observacao === descricao ? "" : observacao };
}
