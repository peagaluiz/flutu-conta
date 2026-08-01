-- Reverte 20260801_tipo_imobilizado_user_id.up.sql para o estado documentado em
-- sql/schema_supabase.sql antes desta migration. NÃO recupera a linha órfã
-- deletada no up (id_tipo_imobilizado=1, "Geral") — ela não tinha vínculo em
-- imobilizado, então recriar não afeta nenhum dado real; se precisar dela de
-- volta, inserir manualmente.

begin;

drop policy if exists "tipo_imobilizado_select" on public.tipo_imobilizado;
drop policy if exists "tipo_imobilizado_insert" on public.tipo_imobilizado;
drop policy if exists "tipo_imobilizado_update" on public.tipo_imobilizado;
drop policy if exists "tipo_imobilizado_delete" on public.tipo_imobilizado;

create policy "tipo_imobilizado_select" on public.tipo_imobilizado for select
  using (true);

create policy "tipo_imobilizado_insert" on public.tipo_imobilizado for insert
  with check (auth.role() = 'authenticated');

create policy "tipo_imobilizado_update" on public.tipo_imobilizado for update
  using (auth.role() = 'authenticated');

drop index if exists idx_tipo_imobilizado_user;

alter table public.tipo_imobilizado
  alter column user_id drop not null;

alter table public.tipo_imobilizado
  drop column if exists user_id;

commit;
