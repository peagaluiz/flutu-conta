// Agrupa transações de cartão (com id_fatura) numa única linha-resumo por fatura.
// Mantém a ordem original: a linha da fatura entra na posição do primeiro item dela.
// Transações sem id_fatura passam direto.

export function groupCardTransactions(lancamentos, { faturas = [], banks = [], groupCards = true } = {}) {
	if (!groupCards || !Array.isArray(lancamentos) || !lancamentos.length) {
		return lancamentos ?? [];
	}

	const faturaById = new Map(faturas.map((f) => [Number(f.id_fatura), f]));
	const bankById = new Map(banks.map((b) => [Number(b.id_banco), b]));

	const groups = new Map();
	const result = [];

	for (const item of lancamentos) {
		const idFatura = item.id_fatura ? Number(item.id_fatura) : null;
		if (!idFatura || item.is_ghost) {
			result.push(item);
			continue;
		}

		let group = groups.get(idFatura);
		if (!group) {
			const fatura = faturaById.get(idFatura);
			const banco = bankById.get(Number(item.id_banco));
			group = {
				is_fatura_group: true,
				id_fatura: idFatura,
				id_transacao: `fatura-${idFatura}`,
				id_banco: item.id_banco ?? null,
				banco_nome: banco?.nome ?? "Cartão",
				cor_hex: banco?.cor_hex ?? "#F59E0B",
				status: fatura?.status ?? "aberta",
				data_vencimento: fatura?.data_vencimento ?? item.data_vencimento ?? null,
				tipo: "pagar",
				valor: 0,
				_faturaTotal: fatura ? Number(fatura.valor_total || 0) : null,
				items: [],
			};
			groups.set(idFatura, group);
			result.push(group);
		}
		group.items.push(item);
	}

	// Finaliza o valor: usa o total da fatura quando disponível, senão soma os itens.
	for (const group of groups.values()) {
		const soma = group.items.reduce(
			(s, t) => s + (t.tipo === "receber" ? -Number(t.valor || 0) : Number(t.valor || 0)),
			0
		);
		group.valor = group._faturaTotal != null ? group._faturaTotal : soma;
		delete group._faturaTotal;
	}

	return result;
}
