-- Etapa 1, item 3 do PLANO-BFF.md — decisão do dono: solução completa (opção A).
-- Auditoria feita antes de escrever esta migration (project tygsdhwkndubgthjyurj):
--   select count(*) from public.imobilizado;                          -- 0
--   select id_tipo_imobilizado, nome, deleted from tipo_imobilizado;  -- 1 linha (id=1,
--     "Geral", deleted=0), 0 vínculos em imobilizado.
-- Ou seja: hoje não existe NENHUM dado de produção dependente da linha órfã de
-- tipo_imobilizado nem de imobilizado. Não há backfill de dono a decidir — dá para
-- escopar por user_id direto. Se isso mudar entre a auditoria e a execução, o `do $$`
-- abaixo aborta a migration em vez de perder dado silenciosamente.

begin;

-- Remove a única linha órfã (sem dono possível, 0 vínculos) antes de tornar
-- user_id obrigatório. A condição NOT EXISTS é a mesma checada na auditoria.
delete from public.tipo_imobilizado ti
where not exists (
  select 1 from public.imobilizado i where i.id_tipo_imobilizado = ti.id_tipo_imobilizado
);

alter table public.tipo_imobilizado
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

do $$
begin
  if exists (select 1 from public.tipo_imobilizado where user_id is null) then
    raise exception 'tipo_imobilizado tem linha(s) sem user_id e sem vínculo em imobilizado que não foi removida — resolver manualmente antes de prosseguir (não gerar linha de dono ambíguo)';
  end if;
end $$;

alter table public.tipo_imobilizado
  alter column user_id set not null;

create index if not exists idx_tipo_imobilizado_user on public.tipo_imobilizado(user_id);

drop policy if exists "tipo_imobilizado_select" on public.tipo_imobilizado;
drop policy if exists "tipo_imobilizado_insert" on public.tipo_imobilizado;
drop policy if exists "tipo_imobilizado_update" on public.tipo_imobilizado;
drop policy if exists "tipo_imobilizado_delete" on public.tipo_imobilizado;

create policy "tipo_imobilizado_select" on public.tipo_imobilizado
  for select to authenticated
  using (user_id = auth.uid());

create policy "tipo_imobilizado_insert" on public.tipo_imobilizado
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "tipo_imobilizado_update" on public.tipo_imobilizado
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "tipo_imobilizado_delete" on public.tipo_imobilizado
  for delete to authenticated
  using (user_id = auth.uid());

commit;
