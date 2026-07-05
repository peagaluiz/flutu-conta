export type TransacaoDatabase = {
	id_transacao: number;
	remote_id?: number | null;
	tipo: "pagar" | "receber";
	valor: number;
	id_categoria?: number | null;
	categoria?: string | null;  // alias de JOIN (cc.nome AS categoria) — não existe como coluna física
	id_pessoa: number | null;
	pessoa: string | null;
	id_imobilizado: number | null;
	id_banco?: number | null;
	family_id?: number | null;
	is_family_shared?: number;
	user_id?: string | null;
	data_transacao: string;
	data_vencimento: string | null;
	data_baixa?: string | null;
	status: "pendente" | "pago";
	observacao: string | null;
	created_at: string;
	updated_at: string | null;
	data_sync?: string | null;
	sync_status?: "pending" | "synced" | "error";
	synced?: number;
	deleted?: number;
	json: string | null;
	id_fatura?: number | null;
	parcela_atual?: number | null;
	parcela_total?: number | null;
	ofx_fitid?: string | null;
	is_from_recurrence?: number;
	recurrence_uuid?: string | null;
	recurrence_frequency?: string | null;
	recurrence_sequence?: number | null;
};

export type RecurrenceFrequency = "mensal" | "semanal" | "anual";

export type RecurrenceDatabase = {
	id_recurrencia: number;
	uuid: string;
	status: "ativa" | "pausada";
	frequency: RecurrenceFrequency;
	interval_days: number | null;
	base_due_date: string;
	next_due_date: string;
	end_date: string | null;
	template_json: string;
	occurrences_count: number;
	last_generated_at: string | null;
	skip_non_working?: number | null;
	skip_direction?: "before" | "after" | null;
	created_at: string;
	updated_at: string | null;
	deleted: number;
	user_id?: string | null;
	family_id?: number | null;
	is_family_shared?: number;
	active_transactions_count?: number;
};

export type ImobilizadoRow = {
	id_imobilizado: number;
	codigo: string;
	descricao: string;
	family_id?: number | null;
	is_family_shared?: number;
	user_id?: string | null;
};
