import { normalizeDate, parseBrNumber } from "@/components/finance/insert/insertFormConfig";
import { buildInstallmentPlan } from "@/services/database/cartaoCalc";

// Monta o payload da transação a partir dos valores do formulário.
export function buildTransacaoPayload({
	data,
	idCategoria,
	pessoa,
	idPessoa,
	idBanco,
	familyId,
	userId,
	isEdit,
}) {
	const shareWithFamily = Boolean(data.share_with_family && familyId);

	return {
		tipo: data.tipo,
		valor: parseBrNumber(data.valor),
		id_categoria: idCategoria,
		id_pessoa: idPessoa ?? null,
		pessoa: pessoa || null,
		id_imobilizado: null,
		id_banco: idBanco,
		family_id: shareWithFamily ? Number(familyId) : null,
		is_family_shared: shareWithFamily ? 1 : 0,
		// Em edição o dono não é reescrito — quem criou continua dono.
		user_id: isEdit ? null : userId ?? null,
		data_transacao: new Date().toISOString(),
		data_vencimento: normalizeDate(data.data_vencimento),
		data_baixa: data.status === "pago" ? normalizeDate(data.data_baixa) : null,
		status: data.status,
		observacao: data.observacao || null,
		json: JSON.stringify({ descricao: data.descricao || null }),
	};
}

// Resolve o banco: usa o existente; se for novo do catálogo, cria (ou reaproveita
// pelo nome) só agora, ao salvar.
export async function resolveBancoId({ selectedCatalogBanco, data, userId, listBancos, createBanco }) {
	const existingId = selectedCatalogBanco?.id_banco ?? data.id_banco ?? null;
	if (existingId) return existingId;

	if (!selectedCatalogBanco?.isNewFromCatalog || !selectedCatalogBanco?.nome) return null;

	const userBancos = await listBancos({
		visibilityScope: "mine",
		userId: userId ?? undefined,
	}).catch(() => []);

	const target = selectedCatalogBanco.nome.trim().toLowerCase();
	const existing = userBancos.find((b) => b.nome.trim().toLowerCase() === target);
	if (existing) return existing.id_banco;

	const created = await createBanco(
		selectedCatalogBanco.nome,
		selectedCatalogBanco.cor_hex ?? "#6B7280",
		{ userId: userId ?? null }
	).catch(() => null);

	return created?.id_banco ?? null;
}

async function saveParcelado({ payload, data, selectedCatalogBanco, createTransacoesParceladas }) {
	const parcelas = Math.max(1, Math.min(12, Number(data.parcelas) || 1));
	const plano = buildInstallmentPlan({
		purchaseDate: payload.data_vencimento,
		parcelas,
		valorTotal: payload.valor,
		diaFechamento: selectedCatalogBanco.dia_fechamento,
		diaVencimento: selectedCatalogBanco.dia_vencimento,
	});
	const result = await createTransacoesParceladas(payload, plano, {
		isFamilyShared: payload.is_family_shared === 1,
	});

	return {
		savedId: result?.ids?.[0] ?? null,
		successMessage: parcelas > 1 ? `Compra em ${parcelas}x lançada!` : "Lançamento salvo!",
	};
}

async function saveEdit({
	payload,
	editId,
	recurringScope,
	recurrenceMeta,
	editingFatura,
	userId,
	updateTransacao,
	applyEditToRecurrenceTransacoes,
	recalcFaturaTotal,
}) {
	await updateTransacao(editId, payload);

	if (recurringScope && recurringScope !== "only_this" && recurrenceMeta?.recurrence_uuid) {
		await applyEditToRecurrenceTransacoes({
			recurrenceUuid: recurrenceMeta.recurrence_uuid,
			currentTransacaoId: editId,
			scope: recurringScope,
			templatePayload: {
				tipo: payload.tipo,
				valor: payload.valor,
				id_categoria: payload.id_categoria,
				id_pessoa: payload.id_pessoa,
				pessoa: payload.pessoa,
				id_imobilizado: payload.id_imobilizado,
				id_banco: payload.id_banco,
				family_id: payload.family_id,
				is_family_shared: payload.is_family_shared,
				observacao: payload.observacao,
				json: payload.json,
				user_id: userId ?? null,
			},
		});
	}

	if (editingFatura?.id_fatura) {
		await recalcFaturaTotal(editingFatura.id_fatura).catch(() => {});
	}

	return { savedId: editId, successMessage: "Lançamento atualizado!" };
}

// Decide qual das cinco escritas aplicar (parcelado, previsto, edição,
// recorrência nova, lançamento simples) e devolve o id salvo + mensagem.
export async function persistTransacao({ payload, data, context, database }) {
	const {
		editId,
		ghostMode,
		ghostRecurrenceUuid,
		ghostDueDate,
		selectedCatalogBanco,
		recurrenceMeta,
		editingFatura,
		recurringScope,
		userId,
	} = context;

	const cartaoSelecionado = selectedCatalogBanco?.side === "cartao";

	if (cartaoSelecionado && !editId && !ghostMode) {
		return saveParcelado({
			payload,
			data,
			selectedCatalogBanco,
			createTransacoesParceladas: database.createTransacoesParceladas,
		});
	}

	if (ghostMode) {
		const result = await database.materializeRecurrenceOccurrence({
			recurrenceUuid: ghostRecurrenceUuid,
			dueDate: ghostDueDate,
			overrides: payload,
			status: payload.status,
			dataBaixa: payload.data_baixa,
		});
		return { savedId: result?.id_transacao ?? null, successMessage: "Lançamento salvo!" };
	}

	if (editId) {
		return saveEdit({
			payload,
			editId,
			recurringScope,
			recurrenceMeta,
			editingFatura,
			userId,
			updateTransacao: database.updateTransacao,
			applyEditToRecurrenceTransacoes: database.applyEditToRecurrenceTransacoes,
			recalcFaturaTotal: database.recalcFaturaTotal,
		});
	}

	if (data.recurrence_mode === "recorrente") {
		const result = await database.createRecurringTransacoes(payload, {
			frequency: data.recurrence_frequency,
			endDate: data.recurrence_end_date || null,
			skipNonWorking: Boolean(data.recurrence_skip_non_working),
			skipDirection: data.recurrence_skip_non_working
				? data.recurrence_skip_direction || null
				: null,
		});
		return { savedId: result?.ids?.[0] ?? null, successMessage: "Recorrência criada!" };
	}

	const result = await database.createTransacao(payload);
	return { savedId: result?.insertId ?? null, successMessage: "Lançamento salvo!" };
}
