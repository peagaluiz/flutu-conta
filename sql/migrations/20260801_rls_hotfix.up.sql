begin;

-- ─────────────────────────────────────────────────────────────────────────
-- 1) familia_membros: impedir auto-promoção a owner e restringir INSERT
-- ─────────────────────────────────────────────────────────────────────────

-- UPDATE: separa dois casos legítimos.
--  (a) OWNER da família pode alterar qualquer membro (mantém transferOwnership).
--  (b) o próprio membro só pode mexer no PRÓPRIO registro E sem trocar de papel
--      (permite sair: status -> 'removed'; NÃO permite role -> 'owner').
drop policy if exists "familia_membros_update" on public.familia_membros;

create policy "familia_membros_update_owner" on public.familia_membros
  for update
  using (
    exists (
      select 1 from public.familias f
      where f.id = familia_membros.family_id
        and f.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.familias f
      where f.id = familia_membros.family_id
        and f.owner_user_id = (select auth.uid())
    )
  );

create policy "familia_membros_update_self" on public.familia_membros
  for update
  using ( user_id = (select auth.uid()) )
  with check (
    user_id = (select auth.uid())
    -- impede escalonamento: o papel não pode virar 'owner' por auto-update.
    and role <> 'owner'
  );

-- INSERT: dois casos legítimos.
--  (a) criação de família: o criador se insere como owner do PRÓPRIO user_id,
--      e ele é o owner_user_id da família recém-criada.
--  (b) aceite de convite: o convidado se insere como 'member' (nunca 'owner'),
--      e precisa ter um convite pendente para aquele email/família.
drop policy if exists "familia_membros_insert" on public.familia_membros;

create policy "familia_membros_insert" on public.familia_membros
  for insert
  with check (
    -- (a) owner se auto-inserindo na própria família
    (
      user_id = (select auth.uid())
      and role = 'owner'
      and exists (
        select 1 from public.familias f
        where f.id = familia_membros.family_id
          and f.owner_user_id = (select auth.uid())
      )
    )
    or
    -- (b) convidado aceitando convite, sempre como member
    (
      user_id = (select auth.uid())
      and role = 'member'
      and exists (
        select 1 from public.familia_convites c
        where c.family_id = familia_membros.family_id
          and c.status = 'pending'
          and lower(c.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 2) WITH CHECK em TODOS os UPDATEs das tabelas de dados.
--    Motivo: sem WITH CHECK, o predicado da policy só é avaliado nas linhas
--    ANTIGAS (USING), não nas NOVAS. Um usuário pode dar UPDATE numa linha dele
--    trocando user_id para o de outra pessoa (mesma classe da auto-promoção a
--    owner). Os triggers private.preserve_user_id_on_update mitigam nas 6 tabelas
--    de dados, mas (i) não cobrem familias/familia_convites/profiles, e (ii)
--    trigger não é a barreira de autorização — RLS é. WITH CHECK é o guard certo.
--    Recriamos cada *_update espelhando o USING atual no WITH CHECK. Mantemos
--    auth.uid() direto (a troca por (select auth.uid()) é 5.2, pós-BFF).
-- ─────────────────────────────────────────────────────────────────────────

-- padrão "dono OU família compartilhada" (banco, cartao_faturas, imobilizado,
-- pessoa, recorrencias, transacoes)
drop policy if exists "banco_update" on public.banco;
create policy "banco_update" on public.banco for update
  using      ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)))
  with check ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

drop policy if exists "cartao_faturas_update" on public.cartao_faturas;
create policy "cartao_faturas_update" on public.cartao_faturas for update
  using      ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)))
  with check ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

drop policy if exists "imobilizado_update" on public.imobilizado;
create policy "imobilizado_update" on public.imobilizado for update
  using      ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)))
  with check ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

drop policy if exists "pessoa_update" on public.pessoa;
create policy "pessoa_update" on public.pessoa for update
  using      ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)))
  with check ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

drop policy if exists "recorrencias_update" on public.recorrencias;
create policy "recorrencias_update" on public.recorrencias for update
  using      ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)))
  with check ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

drop policy if exists "transacoes_update" on public.transacoes;
create policy "transacoes_update" on public.transacoes for update
  using      ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)))
  with check ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

-- familias: só o owner
drop policy if exists "familias_update" on public.familias;
create policy "familias_update" on public.familias for update
  using      (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- familia_convites: membro da família (o *_update_invited já tem with check próprio)
drop policy if exists "familia_convites_update" on public.familia_convites;
create policy "familia_convites_update" on public.familia_convites for update
  using      (private.is_familia_member(family_id))
  with check (private.is_familia_member(family_id));

-- profiles: só o próprio
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update
  using      (id = auth.uid())
  with check (id = auth.uid());

-- Observações:
--  * recorrencia_transacoes NÃO tem policy de UPDATE (só select/insert/delete) → nada a fazer.
--  * banco_catalogo / categoria_catalogo só têm SELECT → nada a fazer.
--  * familia_membros já recebeu WITH CHECK no item 1.
--  * tipo_imobilizado: FORA do hotfix. Ver PLANO-BFF.md, Etapa 1 item 3 e a seção
--    "Questões em aberto". Decisão do dono entre (A) adicionar user_id + escopar e
--    (C) aceitar o risco. Bloco recomendado (revogar UPDATE/DELETE) NÃO roda aqui.

commit;
