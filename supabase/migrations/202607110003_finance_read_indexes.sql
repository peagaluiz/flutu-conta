CREATE INDEX IF NOT EXISTS idx_transacoes_user_due_active
    ON public.transacoes(user_id, data_vencimento, id_transacao DESC)
    WHERE deleted = 0;

CREATE INDEX IF NOT EXISTS idx_transacoes_family_due_active
    ON public.transacoes(family_id, data_vencimento, id_transacao DESC)
    WHERE deleted = 0;

CREATE INDEX IF NOT EXISTS idx_transacoes_user_settled_active
    ON public.transacoes(user_id, data_baixa, id_transacao DESC)
    WHERE deleted = 0;

CREATE INDEX IF NOT EXISTS idx_transacoes_family_settled_active
    ON public.transacoes(family_id, data_baixa, id_transacao DESC)
    WHERE deleted = 0;

CREATE INDEX IF NOT EXISTS idx_recorrencias_user_projection
    ON public.recorrencias(user_id, status, next_due_date)
    WHERE deleted = 0;

CREATE INDEX IF NOT EXISTS idx_recorrencias_family_projection
    ON public.recorrencias(family_id, status, next_due_date)
    WHERE deleted = 0;
