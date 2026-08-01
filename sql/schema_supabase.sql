-- =============================================================================
-- FLUTU CONTA — Schema completo para Supabase
-- Idempotente: seguro para rodar em conta nova ou re-executar
-- Ordem: extensões → schemas → funções → tabelas → grants → triggers → índices → RLS → políticas
-- =============================================================================

-- =============================================================================
-- EXTENSÕES
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- SCHEMA PRIVADO (não exposto pelo PostgREST)
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

-- =============================================================================
-- FUNÇÕES AUXILIARES
-- =============================================================================

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SET search_path = public;

-- Cria perfil automaticamente quando um novo usuário é registrado no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, nome, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name'),
        NEW.email
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

-- Garante user_id no INSERT quando vier null (evita falha na política RLS)
CREATE OR REPLACE FUNCTION private.fill_user_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NULL THEN
        NEW.user_id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

GRANT EXECUTE ON FUNCTION private.fill_user_id_on_insert() TO authenticated;

-- user_id é imutável em UPDATE: impede que um membro da família (ou o próprio
-- cliente) reatribua a posse de uma linha compartilhada para outro usuário.
CREATE OR REPLACE FUNCTION private.preserve_user_id_on_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id = OLD.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

GRANT EXECUTE ON FUNCTION private.preserve_user_id_on_update() TO authenticated;

-- Verifica se o usuário autenticado é membro ativo de uma família
CREATE OR REPLACE FUNCTION private.is_familia_member(fam_id BIGINT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.familia_membros
        WHERE family_id = fam_id
          AND user_id   = auth.uid()
          AND status    = 'active'
    );
$$ LANGUAGE sql
   SECURITY DEFINER
   STABLE
   SET search_path = public;

REVOKE EXECUTE ON FUNCTION private.is_familia_member(BIGINT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION private.is_familia_member(BIGINT) TO authenticated;

-- Remove versão antiga do schema público se existir
DROP FUNCTION IF EXISTS public.is_familia_member(BIGINT) CASCADE;

-- =============================================================================
-- TABELAS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.banco (
    id_banco         BIGSERIAL   PRIMARY KEY,
    nome             TEXT        NOT NULL,
    cor_hex          TEXT        NOT NULL DEFAULT '#6B7280',
    tipo             TEXT        NOT NULL DEFAULT 'corrente',  -- legado (vestigial): substituído por is_corrente/is_cartao
    is_corrente      INTEGER     NOT NULL DEFAULT 1,           -- banco funciona como conta corrente
    is_cartao        INTEGER     NOT NULL DEFAULT 0,           -- banco funciona como cartão de crédito
    dia_fechamento   INTEGER,                                 -- dia do mês que a fatura fecha (cartão)
    dia_vencimento   INTEGER,                                 -- dia do mês que a fatura vence (cartão)
    user_id          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    family_id        BIGINT      REFERENCES public.familias(id) ON DELETE SET NULL,
    is_family_shared INTEGER     NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted          INTEGER     NOT NULL DEFAULT 0
);
-- Migração para bases existentes
ALTER TABLE public.banco ADD COLUMN IF NOT EXISTS tipo           TEXT NOT NULL DEFAULT 'corrente';
ALTER TABLE public.banco ADD COLUMN IF NOT EXISTS is_corrente    INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.banco ADD COLUMN IF NOT EXISTS is_cartao      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.banco ADD COLUMN IF NOT EXISTS dia_fechamento INTEGER;
ALTER TABLE public.banco ADD COLUMN IF NOT EXISTS dia_vencimento INTEGER;

CREATE TABLE IF NOT EXISTS public.banco_catalogo (
    id       BIGSERIAL PRIMARY KEY,
    nome     TEXT      NOT NULL,
    cor_hex  TEXT      NOT NULL DEFAULT '#6B7280',
    logo_url TEXT,
    ativo    BOOLEAN   NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.categoria_catalogo (
    id       BIGSERIAL PRIMARY KEY,
    nome     TEXT      NOT NULL,
    icone    TEXT,                            -- nome do ícone Lucide (ex: "Utensils")
    cor_hex  TEXT      NOT NULL DEFAULT '#6B7280',
    ordem    INTEGER   NOT NULL DEFAULT 0,
    ativo    BOOLEAN   NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome       TEXT,
    email      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.familias (
    id            BIGSERIAL PRIMARY KEY,
    nome          TEXT NOT NULL,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.familia_membros (
    id         BIGSERIAL PRIMARY KEY,
    family_id  BIGINT NOT NULL REFERENCES public.familias(id) ON DELETE CASCADE,
    user_id    UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role       TEXT   NOT NULL DEFAULT 'member',  -- 'owner' | 'member'
    status     TEXT   NOT NULL DEFAULT 'active',  -- 'active' | 'removed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(family_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.familia_convites (
    id                 BIGSERIAL PRIMARY KEY,
    family_id          BIGINT NOT NULL REFERENCES public.familias(id) ON DELETE CASCADE,
    email              TEXT   NOT NULL,
    status             TEXT   NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'cancelled'
    invited_by_user_id UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pessoa (
    id_pessoa        BIGSERIAL PRIMARY KEY,
    nome             TEXT    NOT NULL,
    family_id        BIGINT  REFERENCES public.familias(id) ON DELETE SET NULL,
    is_family_shared INTEGER NOT NULL DEFAULT 0,
    user_id          UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.tipo_imobilizado (
    id_tipo_imobilizado BIGSERIAL PRIMARY KEY,
    nome                TEXT    NOT NULL,
    user_id             UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted             INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.imobilizado (
    id_imobilizado      BIGSERIAL PRIMARY KEY,
    id_tipo_imobilizado BIGINT  NOT NULL REFERENCES public.tipo_imobilizado(id_tipo_imobilizado),
    codigo              TEXT    NOT NULL,
    descricao           TEXT    NOT NULL,
    family_id           BIGINT  REFERENCES public.familias(id) ON DELETE SET NULL,
    is_family_shared    INTEGER NOT NULL DEFAULT 0,
    user_id             UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
    status              INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted             INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.transacoes (
    id_transacao     BIGSERIAL PRIMARY KEY,
    tipo             TEXT           NOT NULL,
    valor            NUMERIC(15,2)  NOT NULL,
    id_pessoa        BIGINT         REFERENCES public.pessoa(id_pessoa) ON DELETE SET NULL,
    pessoa           TEXT,
    id_imobilizado   BIGINT         REFERENCES public.imobilizado(id_imobilizado) ON DELETE SET NULL,
    id_banco         BIGINT         REFERENCES public.banco(id_banco) ON DELETE SET NULL,
    id_categoria     BIGINT         REFERENCES public.categoria_catalogo(id) ON DELETE SET NULL,
    family_id        BIGINT         REFERENCES public.familias(id) ON DELETE SET NULL,
    is_family_shared INTEGER        NOT NULL DEFAULT 0,
    user_id          UUID           REFERENCES auth.users(id) ON DELETE SET NULL,
    data_transacao   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    data_vencimento  TIMESTAMPTZ,
    data_baixa       TIMESTAMPTZ,
    status           TEXT           NOT NULL DEFAULT 'pendente',
    observacao       TEXT,
    json             JSONB,
    id_fatura        BIGINT,                       -- FK p/ cartao_faturas (constraint adicionada após a tabela existir)
    parcela_atual    INTEGER,
    parcela_total    INTEGER,
    ofx_fitid        TEXT,                         -- ID único do item OFX (dedup em reimportações)
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
    deleted          INTEGER        NOT NULL DEFAULT 0
);
-- Migração para bases existentes
ALTER TABLE public.transacoes ADD COLUMN IF NOT EXISTS id_fatura     BIGINT;
ALTER TABLE public.transacoes ADD COLUMN IF NOT EXISTS parcela_atual INTEGER;
ALTER TABLE public.transacoes ADD COLUMN IF NOT EXISTS parcela_total INTEGER;
ALTER TABLE public.transacoes ADD COLUMN IF NOT EXISTS ofx_fitid     TEXT;

CREATE TABLE IF NOT EXISTS public.recorrencias (
    id_recurrencia    BIGSERIAL   PRIMARY KEY,
    uuid              TEXT        NOT NULL UNIQUE DEFAULT (uuid_generate_v4()::text),
    status            TEXT        NOT NULL DEFAULT 'ativa',   -- 'ativa' | 'pausada' | 'encerrada'
    frequency         TEXT        NOT NULL,                   -- 'mensal' | 'semanal' | 'anual'
    interval_days     INTEGER,                                -- reservado, não utilizado
    base_due_date     TIMESTAMPTZ NOT NULL,
    next_due_date     TIMESTAMPTZ NOT NULL,
    end_date          TIMESTAMPTZ,
    template_json     JSONB       NOT NULL,
    occurrences_count INTEGER     NOT NULL DEFAULT 0,
    last_generated_at TIMESTAMPTZ,
    skip_non_working  INTEGER     NOT NULL DEFAULT 0,         -- 1 = ignorar feriados e domingos
    skip_direction    TEXT,                                   -- 'before' | 'after'
    user_id           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    family_id         BIGINT      REFERENCES public.familias(id) ON DELETE SET NULL,
    is_family_shared  INTEGER     NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted           INTEGER     NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.recorrencia_transacoes (
    id_recurrencia_transacao BIGSERIAL   PRIMARY KEY,
    id_recurrencia           BIGINT      NOT NULL REFERENCES public.recorrencias(id_recurrencia) ON DELETE CASCADE,
    id_transacao             BIGINT      NOT NULL UNIQUE REFERENCES public.transacoes(id_transacao) ON DELETE CASCADE,
    due_date                 TIMESTAMPTZ NOT NULL,
    sequence                 INTEGER     NOT NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(id_recurrencia, due_date)
);

CREATE TABLE IF NOT EXISTS public.cartao_faturas (
    id_fatura              BIGSERIAL     PRIMARY KEY,
    id_banco               BIGINT        NOT NULL REFERENCES public.banco(id_banco) ON DELETE CASCADE,
    mes_referencia         DATE          NOT NULL,                  -- primeiro dia do mês da fatura
    data_fechamento        DATE,
    data_vencimento        DATE,
    valor_total            NUMERIC(15,2) NOT NULL DEFAULT 0,
    status                 TEXT          NOT NULL DEFAULT 'aberta', -- 'aberta' | 'fechada' | 'paga'
    id_transacao_pagamento BIGINT        REFERENCES public.transacoes(id_transacao) ON DELETE SET NULL,
    family_id              BIGINT        REFERENCES public.familias(id) ON DELETE SET NULL,
    is_family_shared       INTEGER       NOT NULL DEFAULT 0,
    user_id                UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted                INTEGER       NOT NULL DEFAULT 0
);

-- FK transacoes.id_fatura -> cartao_faturas (adicionada após ambas existirem)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'transacoes_id_fatura_fkey'
    ) THEN
        ALTER TABLE public.transacoes
            ADD CONSTRAINT transacoes_id_fatura_fkey
            FOREIGN KEY (id_fatura) REFERENCES public.cartao_faturas(id_fatura) ON DELETE SET NULL;
    END IF;
END $$;

-- =============================================================================
-- GRANTS
-- O role "authenticated" precisa de privilégio de tabela para que o RLS
-- sequer seja avaliado. Sem GRANT, PostgreSQL retorna 42501 antes de
-- verificar qualquer política.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_family_snapshot()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH current_membership AS (
    SELECT fm.* FROM public.familia_membros fm
    WHERE fm.user_id = auth.uid() AND fm.status = 'active'
    ORDER BY fm.created_at ASC LIMIT 1
), current_family AS (
    SELECT f.* FROM public.familias f
    JOIN current_membership cm ON cm.family_id = f.id
), pending AS (
    SELECT fi.id, fi.family_id, f.nome AS family_nome,
           COALESCE(p.nome, p.email) AS invited_by_nome, fi.created_at
    FROM public.familia_convites fi
    JOIN public.familias f ON f.id = fi.family_id
    LEFT JOIN public.profiles p ON p.id = fi.invited_by_user_id
    WHERE lower(fi.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      AND fi.status = 'pending'
    ORDER BY fi.created_at DESC LIMIT 1
)
SELECT jsonb_build_object(
    'family', (SELECT to_jsonb(cf) FROM current_family cf),
    'membership', (SELECT to_jsonb(cm) FROM current_membership cm),
    'members', COALESCE((SELECT jsonb_agg(to_jsonb(fm) || jsonb_build_object('user_nome', p.nome, 'user_email', p.email) ORDER BY fm.created_at)
        FROM public.familia_membros fm JOIN current_membership cm ON cm.family_id = fm.family_id
        LEFT JOIN public.profiles p ON p.id = fm.user_id WHERE fm.status = 'active'), '[]'::jsonb),
    'invites', COALESCE((SELECT jsonb_agg(to_jsonb(fi) ORDER BY fi.created_at DESC)
        FROM public.familia_convites fi JOIN current_membership cm ON cm.family_id = fi.family_id
        WHERE fi.status = 'pending'), '[]'::jsonb),
    'pending_invite', (SELECT to_jsonb(pending) FROM pending)
);
$$;

REVOKE ALL ON FUNCTION public.get_family_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_family_snapshot() TO authenticated;

GRANT USAGE ON SCHEMA public TO authenticated, anon;

GRANT SELECT ON TABLE public.banco_catalogo      TO authenticated, anon;
GRANT SELECT ON TABLE public.categoria_catalogo  TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.banco                  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.familias               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.familia_membros        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.familia_convites       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pessoa                 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tipo_imobilizado       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.imobilizado            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transacoes             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recorrencias           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recorrencia_transacoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cartao_faturas         TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================================================
-- TRIGGERS: auto-criação de profile no signup
-- =============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- TRIGGERS: set_updated_at
-- =============================================================================

DROP TRIGGER IF EXISTS trg_banco_updated_at             ON public.banco;
DROP TRIGGER IF EXISTS trg_profiles_updated_at         ON public.profiles;
DROP TRIGGER IF EXISTS trg_familias_updated_at         ON public.familias;
DROP TRIGGER IF EXISTS trg_familia_convites_updated_at ON public.familia_convites;
DROP TRIGGER IF EXISTS trg_pessoa_updated_at           ON public.pessoa;
DROP TRIGGER IF EXISTS trg_tipo_imobilizado_updated_at ON public.tipo_imobilizado;
DROP TRIGGER IF EXISTS trg_imobilizado_updated_at      ON public.imobilizado;
DROP TRIGGER IF EXISTS trg_transacoes_updated_at       ON public.transacoes;
DROP TRIGGER IF EXISTS trg_recorrencias_updated_at     ON public.recorrencias;

CREATE TRIGGER trg_banco_updated_at
    BEFORE UPDATE ON public.banco
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_familias_updated_at
    BEFORE UPDATE ON public.familias
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_familia_convites_updated_at
    BEFORE UPDATE ON public.familia_convites
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_pessoa_updated_at
    BEFORE UPDATE ON public.pessoa
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_tipo_imobilizado_updated_at
    BEFORE UPDATE ON public.tipo_imobilizado
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_imobilizado_updated_at
    BEFORE UPDATE ON public.imobilizado
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_transacoes_updated_at
    BEFORE UPDATE ON public.transacoes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_recorrencias_updated_at
    BEFORE UPDATE ON public.recorrencias
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_cartao_faturas_updated_at ON public.cartao_faturas;
CREATE TRIGGER trg_cartao_faturas_updated_at
    BEFORE UPDATE ON public.cartao_faturas
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- TRIGGERS: fill/preserve user_id
-- =============================================================================

DROP TRIGGER IF EXISTS trg_banco_fill_user_id            ON public.banco;
DROP TRIGGER IF EXISTS trg_banco_preserve_user_id       ON public.banco;
DROP TRIGGER IF EXISTS trg_pessoa_fill_user_id           ON public.pessoa;
DROP TRIGGER IF EXISTS trg_imobilizado_fill_user_id      ON public.imobilizado;
DROP TRIGGER IF EXISTS trg_transacoes_fill_user_id       ON public.transacoes;
DROP TRIGGER IF EXISTS trg_recorrencias_fill_user_id     ON public.recorrencias;
DROP TRIGGER IF EXISTS trg_pessoa_preserve_user_id       ON public.pessoa;
DROP TRIGGER IF EXISTS trg_imobilizado_preserve_user_id  ON public.imobilizado;
DROP TRIGGER IF EXISTS trg_transacoes_preserve_user_id   ON public.transacoes;
DROP TRIGGER IF EXISTS trg_recorrencias_preserve_user_id ON public.recorrencias;

CREATE TRIGGER trg_banco_fill_user_id
    BEFORE INSERT ON public.banco
    FOR EACH ROW EXECUTE FUNCTION private.fill_user_id_on_insert();

CREATE TRIGGER trg_banco_preserve_user_id
    BEFORE UPDATE ON public.banco
    FOR EACH ROW EXECUTE FUNCTION private.preserve_user_id_on_update();

CREATE TRIGGER trg_pessoa_fill_user_id
    BEFORE INSERT ON public.pessoa
    FOR EACH ROW EXECUTE FUNCTION private.fill_user_id_on_insert();

CREATE TRIGGER trg_imobilizado_fill_user_id
    BEFORE INSERT ON public.imobilizado
    FOR EACH ROW EXECUTE FUNCTION private.fill_user_id_on_insert();

CREATE TRIGGER trg_transacoes_fill_user_id
    BEFORE INSERT ON public.transacoes
    FOR EACH ROW EXECUTE FUNCTION private.fill_user_id_on_insert();

CREATE TRIGGER trg_recorrencias_fill_user_id
    BEFORE INSERT ON public.recorrencias
    FOR EACH ROW EXECUTE FUNCTION private.fill_user_id_on_insert();

CREATE TRIGGER trg_pessoa_preserve_user_id
    BEFORE UPDATE ON public.pessoa
    FOR EACH ROW EXECUTE FUNCTION private.preserve_user_id_on_update();

CREATE TRIGGER trg_imobilizado_preserve_user_id
    BEFORE UPDATE ON public.imobilizado
    FOR EACH ROW EXECUTE FUNCTION private.preserve_user_id_on_update();

CREATE TRIGGER trg_transacoes_preserve_user_id
    BEFORE UPDATE ON public.transacoes
    FOR EACH ROW EXECUTE FUNCTION private.preserve_user_id_on_update();

CREATE TRIGGER trg_recorrencias_preserve_user_id
    BEFORE UPDATE ON public.recorrencias
    FOR EACH ROW EXECUTE FUNCTION private.preserve_user_id_on_update();

DROP TRIGGER IF EXISTS trg_cartao_faturas_fill_user_id     ON public.cartao_faturas;
DROP TRIGGER IF EXISTS trg_cartao_faturas_preserve_user_id ON public.cartao_faturas;

CREATE TRIGGER trg_cartao_faturas_fill_user_id
    BEFORE INSERT ON public.cartao_faturas
    FOR EACH ROW EXECUTE FUNCTION private.fill_user_id_on_insert();

CREATE TRIGGER trg_cartao_faturas_preserve_user_id
    BEFORE UPDATE ON public.cartao_faturas
    FOR EACH ROW EXECUTE FUNCTION private.preserve_user_id_on_update();

-- =============================================================================
-- ÍNDICES
-- =============================================================================

-- banco_catalogo
CREATE INDEX IF NOT EXISTS idx_banco_catalogo_ativo    ON public.banco_catalogo(ativo);

-- banco
CREATE INDEX IF NOT EXISTS idx_banco_user              ON public.banco(user_id, deleted);
CREATE INDEX IF NOT EXISTS idx_banco_family            ON public.banco(family_id, is_family_shared);

-- transacoes (banco)
CREATE INDEX IF NOT EXISTS idx_transacoes_banco        ON public.transacoes(id_banco);

-- familia_membros
CREATE INDEX IF NOT EXISTS idx_familia_membros_user    ON public.familia_membros(user_id, status);
CREATE INDEX IF NOT EXISTS idx_familia_membros_family  ON public.familia_membros(family_id, status);

-- familia_convites
CREATE INDEX IF NOT EXISTS idx_familia_convites_family ON public.familia_convites(family_id, status);
CREATE INDEX IF NOT EXISTS idx_familia_convites_email  ON public.familia_convites(email);

-- pessoa
CREATE INDEX IF NOT EXISTS idx_pessoa_user             ON public.pessoa(user_id);
CREATE INDEX IF NOT EXISTS idx_pessoa_family           ON public.pessoa(family_id, is_family_shared);
CREATE INDEX IF NOT EXISTS idx_pessoa_deleted          ON public.pessoa(deleted);

-- tipo_imobilizado
CREATE INDEX IF NOT EXISTS idx_tipo_imobilizado_user   ON public.tipo_imobilizado(user_id);

-- imobilizado
CREATE INDEX IF NOT EXISTS idx_imobilizado_user        ON public.imobilizado(user_id);
CREATE INDEX IF NOT EXISTS idx_imobilizado_family      ON public.imobilizado(family_id, is_family_shared);
CREATE INDEX IF NOT EXISTS idx_imobilizado_deleted     ON public.imobilizado(deleted);
CREATE INDEX IF NOT EXISTS idx_imobilizado_tipo        ON public.imobilizado(id_tipo_imobilizado);

-- transacoes
CREATE INDEX IF NOT EXISTS idx_transacoes_user              ON public.transacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_family            ON public.transacoes(family_id, is_family_shared);
CREATE INDEX IF NOT EXISTS idx_transacoes_status            ON public.transacoes(status, deleted);
CREATE INDEX IF NOT EXISTS idx_transacoes_data_transacao    ON public.transacoes(data_transacao DESC);
CREATE INDEX IF NOT EXISTS idx_transacoes_data_vencimento   ON public.transacoes(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_transacoes_id_pessoa         ON public.transacoes(id_pessoa);
CREATE INDEX IF NOT EXISTS idx_transacoes_id_imobilizado    ON public.transacoes(id_imobilizado);
CREATE INDEX IF NOT EXISTS idx_transacoes_id_categoria      ON public.transacoes(id_categoria);

-- recorrencias
CREATE INDEX IF NOT EXISTS idx_recorrencias_status_due ON public.recorrencias(status, next_due_date);
CREATE INDEX IF NOT EXISTS idx_recorrencias_user       ON public.recorrencias(user_id, family_id);
CREATE INDEX IF NOT EXISTS idx_recorrencias_deleted    ON public.recorrencias(deleted);

-- recorrencia_transacoes
CREATE INDEX IF NOT EXISTS idx_recorrencia_transacoes_recurrencia ON public.recorrencia_transacoes(id_recurrencia);
CREATE INDEX IF NOT EXISTS idx_recorrencia_transacoes_due_date    ON public.recorrencia_transacoes(due_date);

-- cartao_faturas
CREATE INDEX IF NOT EXISTS idx_cartao_faturas_banco   ON public.cartao_faturas(id_banco, mes_referencia);
-- Uma única fatura ativa por (cartão, mês de referência): impede duplicatas que
-- quebram o parcelamento (find-or-create não é atômico).
CREATE UNIQUE INDEX IF NOT EXISTS uq_cartao_faturas_banco_mes ON public.cartao_faturas(id_banco, mes_referencia) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_cartao_faturas_user    ON public.cartao_faturas(user_id);
CREATE INDEX IF NOT EXISTS idx_cartao_faturas_family  ON public.cartao_faturas(family_id, is_family_shared);
CREATE INDEX IF NOT EXISTS idx_transacoes_id_fatura   ON public.transacoes(id_fatura);
CREATE INDEX IF NOT EXISTS idx_transacoes_user_due_active
    ON public.transacoes(user_id, data_vencimento, id_transacao DESC) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_transacoes_family_due_active
    ON public.transacoes(family_id, data_vencimento, id_transacao DESC) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_transacoes_user_settled_active
    ON public.transacoes(user_id, data_baixa, id_transacao DESC) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_transacoes_family_settled_active
    ON public.transacoes(family_id, data_baixa, id_transacao DESC) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_recorrencias_user_projection
    ON public.recorrencias(user_id, status, next_due_date) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_recorrencias_family_projection
    ON public.recorrencias(family_id, status, next_due_date) WHERE deleted = 0;

-- Read model compartilhado pela projeção de previstas e pela tabela de recorrências.
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

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.banco_catalogo         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categoria_catalogo     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banco                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.familias               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.familia_membros        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.familia_convites       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pessoa                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipo_imobilizado       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imobilizado            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recorrencias           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recorrencia_transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartao_faturas         ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- POLÍTICAS RLS
-- =============================================================================

-- ─── banco_catalogo ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "banco_catalogo_read_all" ON public.banco_catalogo;
CREATE POLICY "banco_catalogo_read_all"
    ON public.banco_catalogo FOR SELECT USING (true);

-- ─── categoria_catalogo ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "categoria_catalogo_read_all" ON public.categoria_catalogo;
CREATE POLICY "categoria_catalogo_read_all"
    ON public.categoria_catalogo FOR SELECT USING (true);

-- Seed: categorias de lançamentos
INSERT INTO public.categoria_catalogo (nome, icone, cor_hex, ordem) VALUES
    ('Alimentação',  'Utensils',      '#F97316', 1),
    ('Moradia',      'Home',          '#3B82F6', 2),
    ('Transporte',   'Car',           '#8B5CF6', 3),
    ('Saúde',        'HeartPulse',    '#EF4444', 4),
    ('Educação',     'GraduationCap', '#10B981', 5),
    ('Lazer',        'Smile',         '#F59E0B', 6),
    ('Salário',      'Briefcase',     '#06B6D4', 7),
    ('Investimentos','TrendingUp',    '#22C55E', 8),
    ('Outros',       'HelpCircle',    '#6B7280', 9)
ON CONFLICT DO NOTHING;

INSERT INTO public.categoria_catalogo (nome, icone, cor_hex, ordem)
SELECT 'Ajuste', 'Scale', '#64748B', 10
WHERE NOT EXISTS (SELECT 1 FROM public.categoria_catalogo WHERE nome = 'Ajuste');

-- Seed: bancos brasileiros principais
INSERT INTO public.banco_catalogo (nome, cor_hex) VALUES
    ('Nubank',         '#820AD1'),
    ('Itaú',           '#EC7000'),
    ('Bradesco',       '#CC092F'),
    ('Santander',      '#EC0000'),
    ('Caixa',          '#005B9F'),
    ('Banco do Brasil','#FDEE00'),
    ('Inter',          '#FF7A00'),
    ('C6 Bank',        '#242424'),
    ('XP',             '#252525'),
    ('BTG Pactual',    '#003087'),
    ('Sicredi',        '#009B3A'),
    ('Sicoob',         '#007B40'),
    ('PicPay',         '#11C76F'),
    ('Mercado Pago',   '#009EE3'),
    ('Neon',           '#00E5A0'),
    ('PagBank',        '#F9A800'),
    ('Wise',           '#9FE870'),
    ('Avenue',         '#1A1A2E'),
    ('Rico',           '#FFC300'),
    ('Clear',          '#3B82F6'),
    ('Outro',          '#6B7280')
ON CONFLICT DO NOTHING;

-- ─── banco ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "banco_select" ON public.banco;
DROP POLICY IF EXISTS "banco_insert" ON public.banco;
DROP POLICY IF EXISTS "banco_update" ON public.banco;
DROP POLICY IF EXISTS "banco_delete" ON public.banco;

CREATE POLICY "banco_select" ON public.banco FOR SELECT
    USING (
        user_id = auth.uid()
        OR (is_family_shared = 1 AND family_id IS NOT NULL
            AND private.is_familia_member(family_id))
    );

-- O trigger fill_user_id_on_insert preenche user_id = auth.uid() quando vier null,
-- então o WITH CHECK abaixo valida a linha já com o dono resolvido. A segunda
-- condição permite inserir em nome da família apenas se o autor for membro ativo.
CREATE POLICY "banco_insert" ON public.banco FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        OR (is_family_shared = 1 AND family_id IS NOT NULL
            AND private.is_familia_member(family_id))
    );

CREATE POLICY "banco_update" ON public.banco FOR UPDATE
    USING (
        user_id = auth.uid()
        OR (is_family_shared = 1 AND family_id IS NOT NULL
            AND private.is_familia_member(family_id))
    );

CREATE POLICY "banco_delete" ON public.banco FOR DELETE
    USING (user_id = auth.uid());

-- ─── profiles ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

-- Usuário vê o próprio perfil + perfis de membros da mesma família
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
    USING (
        id = auth.uid()
        OR private.is_familia_member(
            (SELECT family_id FROM public.familia_membros
             WHERE user_id = profiles.id AND status = 'active' LIMIT 1)
        )
    );

CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT
    WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE
    USING (id = auth.uid());

-- ─── familias ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "familias_select" ON public.familias;
DROP POLICY IF EXISTS "familias_select_invited" ON public.familias;
DROP POLICY IF EXISTS "familias_insert" ON public.familias;
DROP POLICY IF EXISTS "familias_update" ON public.familias;
DROP POLICY IF EXISTS "familias_delete" ON public.familias;

CREATE POLICY "familias_select" ON public.familias FOR SELECT
    USING (owner_user_id = auth.uid() OR private.is_familia_member(id));

-- Convidado com convite pendente vê o nome da família antes de aceitar
CREATE POLICY "familias_select_invited" ON public.familias FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.familia_convites c
            WHERE c.family_id = familias.id
              AND c.status = 'pending'
              AND lower(c.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    );

CREATE POLICY "familias_insert" ON public.familias FOR INSERT
    WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "familias_update" ON public.familias FOR UPDATE
    USING (owner_user_id = auth.uid());

CREATE POLICY "familias_delete" ON public.familias FOR DELETE
    USING (owner_user_id = auth.uid());

-- ─── familia_membros ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "familia_membros_select" ON public.familia_membros;
DROP POLICY IF EXISTS "familia_membros_insert" ON public.familia_membros;
DROP POLICY IF EXISTS "familia_membros_update" ON public.familia_membros;
DROP POLICY IF EXISTS "familia_membros_delete" ON public.familia_membros;

CREATE POLICY "familia_membros_select" ON public.familia_membros FOR SELECT
    USING (user_id = auth.uid() OR private.is_familia_member(family_id));

-- Owner adiciona membros; convidado com convite pendente entra por conta própria
CREATE POLICY "familia_membros_insert" ON public.familia_membros FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.familias
            WHERE id = family_id AND owner_user_id = auth.uid()
        )
        OR (
            user_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM public.familia_convites c
                WHERE c.family_id = familia_membros.family_id
                  AND c.status = 'pending'
                  AND lower(c.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
            )
        )
    );

CREATE POLICY "familia_membros_update" ON public.familia_membros FOR UPDATE
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.familias
            WHERE id = family_id AND owner_user_id = auth.uid()
        )
    );

CREATE POLICY "familia_membros_delete" ON public.familia_membros FOR DELETE
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.familias
            WHERE id = family_id AND owner_user_id = auth.uid()
        )
    );

-- ─── familia_convites ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "familia_convites_select" ON public.familia_convites;
DROP POLICY IF EXISTS "familia_convites_insert" ON public.familia_convites;
DROP POLICY IF EXISTS "familia_convites_update" ON public.familia_convites;
DROP POLICY IF EXISTS "familia_convites_select_invited" ON public.familia_convites;
DROP POLICY IF EXISTS "familia_convites_update_invited" ON public.familia_convites;

CREATE POLICY "familia_convites_select" ON public.familia_convites FOR SELECT
    USING (private.is_familia_member(family_id));

-- O convidado (identificado pelo e-mail do JWT) enxerga o próprio convite,
-- mesmo antes de ser membro da família
CREATE POLICY "familia_convites_select_invited" ON public.familia_convites FOR SELECT
    USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

CREATE POLICY "familia_convites_insert" ON public.familia_convites FOR INSERT
    WITH CHECK (
        invited_by_user_id = auth.uid()
        AND private.is_familia_member(family_id)
    );

CREATE POLICY "familia_convites_update" ON public.familia_convites FOR UPDATE
    USING (private.is_familia_member(family_id));

-- O convidado pode responder (aceitar/recusar) o próprio convite pendente
CREATE POLICY "familia_convites_update_invited" ON public.familia_convites FOR UPDATE
    USING (
        status = 'pending'
        AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    WITH CHECK (
        lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND status IN ('accepted', 'cancelled')
    );

-- ─── pessoa ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "pessoa_select" ON public.pessoa;
DROP POLICY IF EXISTS "pessoa_insert" ON public.pessoa;
DROP POLICY IF EXISTS "pessoa_update" ON public.pessoa;
DROP POLICY IF EXISTS "pessoa_delete" ON public.pessoa;

CREATE POLICY "pessoa_select" ON public.pessoa FOR SELECT
    USING (
        user_id = auth.uid()
        OR (is_family_shared = 1 AND family_id IS NOT NULL
            AND private.is_familia_member(family_id))
    );

CREATE POLICY "pessoa_insert" ON public.pessoa FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        OR (is_family_shared = 1 AND family_id IS NOT NULL
            AND private.is_familia_member(family_id))
    );

CREATE POLICY "pessoa_update" ON public.pessoa FOR UPDATE
    USING (
        user_id = auth.uid()
        OR (is_family_shared = 1 AND family_id IS NOT NULL
            AND private.is_familia_member(family_id))
    );

CREATE POLICY "pessoa_delete" ON public.pessoa FOR DELETE
    USING (user_id = auth.uid());

-- ─── tipo_imobilizado ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tipo_imobilizado_select" ON public.tipo_imobilizado;
DROP POLICY IF EXISTS "tipo_imobilizado_insert" ON public.tipo_imobilizado;
DROP POLICY IF EXISTS "tipo_imobilizado_update" ON public.tipo_imobilizado;
DROP POLICY IF EXISTS "tipo_imobilizado_delete" ON public.tipo_imobilizado;

CREATE POLICY "tipo_imobilizado_select" ON public.tipo_imobilizado FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "tipo_imobilizado_insert" ON public.tipo_imobilizado FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "tipo_imobilizado_update" ON public.tipo_imobilizado FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "tipo_imobilizado_delete" ON public.tipo_imobilizado FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- ─── imobilizado ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "imobilizado_select" ON public.imobilizado;
DROP POLICY IF EXISTS "imobilizado_insert" ON public.imobilizado;
DROP POLICY IF EXISTS "imobilizado_update" ON public.imobilizado;
DROP POLICY IF EXISTS "imobilizado_delete" ON public.imobilizado;

CREATE POLICY "imobilizado_select" ON public.imobilizado FOR SELECT
    USING (
        user_id = auth.uid()
        OR (is_family_shared = 1 AND family_id IS NOT NULL
            AND private.is_familia_member(family_id))
    );

CREATE POLICY "imobilizado_insert" ON public.imobilizado FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        OR (is_family_shared = 1 AND family_id IS NOT NULL
            AND private.is_familia_member(family_id))
    );

CREATE POLICY "imobilizado_update" ON public.imobilizado FOR UPDATE
    USING (
        user_id = auth.uid()
        OR (is_family_shared = 1 AND family_id IS NOT NULL
            AND private.is_familia_member(family_id))
    );

CREATE POLICY "imobilizado_delete" ON public.imobilizado FOR DELETE
    USING (user_id = auth.uid());

-- ─── transacoes ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "transacoes_select" ON public.transacoes;
DROP POLICY IF EXISTS "transacoes_insert" ON public.transacoes;
DROP POLICY IF EXISTS "transacoes_update" ON public.transacoes;
DROP POLICY IF EXISTS "transacoes_delete" ON public.transacoes;

CREATE POLICY "transacoes_select" ON public.transacoes FOR SELECT
    USING (
        user_id = auth.uid()
        OR (is_family_shared = 1 AND family_id IS NOT NULL
            AND private.is_familia_member(family_id))
    );

CREATE POLICY "transacoes_insert" ON public.transacoes FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        OR (is_family_shared = 1 AND family_id IS NOT NULL
            AND private.is_familia_member(family_id))
    );

CREATE POLICY "transacoes_update" ON public.transacoes FOR UPDATE
    USING (
        user_id = auth.uid()
        OR (is_family_shared = 1 AND family_id IS NOT NULL
            AND private.is_familia_member(family_id))
    );

-- Deleção física restrita ao dono. O app usa soft-delete (deleted=1 via UPDATE) para itens compartilhados,
-- o que permite que qualquer membro da família "delete" via a policy transacoes_update.
CREATE POLICY "transacoes_delete" ON public.transacoes FOR DELETE
    USING (user_id = auth.uid());

-- ─── recorrencias ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "recorrencias_select" ON public.recorrencias;
DROP POLICY IF EXISTS "recorrencias_insert" ON public.recorrencias;
DROP POLICY IF EXISTS "recorrencias_update" ON public.recorrencias;
DROP POLICY IF EXISTS "recorrencias_delete" ON public.recorrencias;

CREATE POLICY "recorrencias_select" ON public.recorrencias FOR SELECT
    USING (
        user_id = auth.uid()
        OR (is_family_shared = 1 AND family_id IS NOT NULL
            AND private.is_familia_member(family_id))
    );

CREATE POLICY "recorrencias_insert" ON public.recorrencias FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        OR (is_family_shared = 1 AND family_id IS NOT NULL
            AND private.is_familia_member(family_id))
    );

CREATE POLICY "recorrencias_update" ON public.recorrencias FOR UPDATE
    USING (
        user_id = auth.uid()
        OR (is_family_shared = 1 AND family_id IS NOT NULL
            AND private.is_familia_member(family_id))
    );

CREATE POLICY "recorrencias_delete" ON public.recorrencias FOR DELETE
    USING (user_id = auth.uid());

-- ─── recorrencia_transacoes ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "recorrencia_transacoes_select" ON public.recorrencia_transacoes;
DROP POLICY IF EXISTS "recorrencia_transacoes_insert" ON public.recorrencia_transacoes;
DROP POLICY IF EXISTS "recorrencia_transacoes_delete" ON public.recorrencia_transacoes;

CREATE POLICY "recorrencia_transacoes_select" ON public.recorrencia_transacoes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.transacoes t
            WHERE t.id_transacao = recorrencia_transacoes.id_transacao
              AND (
                  t.user_id = auth.uid()
                  OR (t.is_family_shared = 1 AND t.family_id IS NOT NULL
                      AND private.is_familia_member(t.family_id))
              )
        )
    );

CREATE POLICY "recorrencia_transacoes_insert" ON public.recorrencia_transacoes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.transacoes t
            WHERE t.id_transacao = recorrencia_transacoes.id_transacao
              AND t.user_id = auth.uid()
        )
    );

CREATE POLICY "recorrencia_transacoes_delete" ON public.recorrencia_transacoes FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.transacoes t
            WHERE t.id_transacao = recorrencia_transacoes.id_transacao
              AND t.user_id = auth.uid()
        )
    );

-- ─── cartao_faturas ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "cartao_faturas_select" ON public.cartao_faturas;
DROP POLICY IF EXISTS "cartao_faturas_insert" ON public.cartao_faturas;
DROP POLICY IF EXISTS "cartao_faturas_update" ON public.cartao_faturas;
DROP POLICY IF EXISTS "cartao_faturas_delete" ON public.cartao_faturas;

CREATE POLICY "cartao_faturas_select" ON public.cartao_faturas FOR SELECT
    USING (
        user_id = auth.uid()
        OR (is_family_shared = 1 AND family_id IS NOT NULL
            AND private.is_familia_member(family_id))
    );

CREATE POLICY "cartao_faturas_insert" ON public.cartao_faturas FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        OR (is_family_shared = 1 AND family_id IS NOT NULL
            AND private.is_familia_member(family_id))
    );

CREATE POLICY "cartao_faturas_update" ON public.cartao_faturas FOR UPDATE
    USING (
        user_id = auth.uid()
        OR (is_family_shared = 1 AND family_id IS NOT NULL
            AND private.is_familia_member(family_id))
    );

CREATE POLICY "cartao_faturas_delete" ON public.cartao_faturas FOR DELETE
    USING (user_id = auth.uid());
