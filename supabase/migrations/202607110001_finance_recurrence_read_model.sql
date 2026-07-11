CREATE OR REPLACE VIEW public.finance_recurrence_read_model
WITH (security_invoker = true)
AS
SELECT
    r.*,
    cc.nome AS categoria,
    COALESCE(
        jsonb_agg(rt.due_date ORDER BY rt.due_date)
            FILTER (WHERE rt.id_recurrencia_transacao IS NOT NULL),
        '[]'::jsonb
    ) AS due_dates,
    COUNT(rt.id_recurrencia_transacao) AS active_transactions_count
FROM public.recorrencias r
LEFT JOIN public.categoria_catalogo cc
    ON cc.id = NULLIF(r.template_json ->> 'id_categoria', '')::BIGINT
LEFT JOIN public.recorrencia_transacoes rt
    ON rt.id_recurrencia = r.id_recurrencia
GROUP BY r.id_recurrencia, cc.nome;

GRANT SELECT ON public.finance_recurrence_read_model TO authenticated;
