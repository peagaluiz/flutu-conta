begin;

-- 1) familia_membros: restaura policies originais (sem os splits owner/self)
drop policy if exists "familia_membros_update_owner" on public.familia_membros;
drop policy if exists "familia_membros_update_self"  on public.familia_membros;
drop policy if exists "familia_membros_insert"       on public.familia_membros;

create policy "familia_membros_update" on public.familia_membros
  for update
  using (
    (user_id = auth.uid())
    or exists (
      select 1 from familias
      where familias.id = familia_membros.family_id
        and familias.owner_user_id = auth.uid()
    )
  );

create policy "familia_membros_insert" on public.familia_membros
  for insert
  with check (
    (exists (
      select 1 from familias
      where familias.id = familia_membros.family_id
        and familias.owner_user_id = auth.uid()
    ))
    or (
      (user_id = auth.uid())
      and exists (
        select 1 from familia_convites c
        where c.family_id = familia_membros.family_id
          and c.status = 'pending'
          and lower(c.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
      )
    )
  );

-- 2) remove o WITH CHECK dos UPDATEs (recria cada policy só com USING, como hoje)
drop policy if exists "banco_update" on public.banco;
create policy "banco_update" on public.banco for update
  using ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

drop policy if exists "cartao_faturas_update" on public.cartao_faturas;
create policy "cartao_faturas_update" on public.cartao_faturas for update
  using ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

drop policy if exists "imobilizado_update" on public.imobilizado;
create policy "imobilizado_update" on public.imobilizado for update
  using ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

drop policy if exists "pessoa_update" on public.pessoa;
create policy "pessoa_update" on public.pessoa for update
  using ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

drop policy if exists "recorrencias_update" on public.recorrencias;
create policy "recorrencias_update" on public.recorrencias for update
  using ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

drop policy if exists "transacoes_update" on public.transacoes;
create policy "transacoes_update" on public.transacoes for update
  using ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

drop policy if exists "familias_update" on public.familias;
create policy "familias_update" on public.familias for update
  using (owner_user_id = auth.uid());

drop policy if exists "familia_convites_update" on public.familia_convites;
create policy "familia_convites_update" on public.familia_convites for update
  using (private.is_familia_member(family_id));

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update
  using (id = auth.uid());

commit;
