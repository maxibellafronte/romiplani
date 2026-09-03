-- ============================================================
-- RM / Récords personales — RF Planificación
-- Ejecutar en: Supabase > SQL Editor > New query
--
-- Requiere que security-migration.sql ya esté corrido: usa la
-- función public.is_admin() que se crea ahí.
--
-- Una fila por atleta y movimiento con su peso máximo actual.
-- Cuando el atleta mejora su marca, se pisa la fila (upsert sobre
-- user_id + movement), así que siempre queda el RM vigente.
-- ============================================================

create table if not exists public.personal_records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  user_name   text,
  -- id del movimiento tal como está en MOVIMIENTOS (src/RMPanel.jsx):
  -- 'back_squat', 'clean_and_jerk', etc.
  movement    text not null,
  weight_kg   numeric(6,2) not null check (weight_kg > 0 and weight_kg <= 500),
  achieved_on date not null default current_date,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, movement)
);

create index if not exists personal_records_user_idx
  on public.personal_records (user_id);

alter table public.personal_records enable row level security;

drop policy if exists "pr_select_own" on public.personal_records;
drop policy if exists "pr_insert_own" on public.personal_records;
drop policy if exists "pr_update_own" on public.personal_records;
drop policy if exists "pr_delete_own" on public.personal_records;

-- Los RM son privados de cada atleta. La coach los ve todos.
create policy "pr_select_own" on public.personal_records
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "pr_insert_own" on public.personal_records
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "pr_update_own" on public.personal_records
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "pr_delete_own" on public.personal_records
  for delete to authenticated
  using (user_id = auth.uid());


-- ── Marca anterior (para el "+5" del panel de coach) ────────
-- Guarda cuánto pesaba el RM antes de que el atleta lo pisara, para poder
-- mostrar cuántos kilos mejoró. Lo escribe un trigger y no el navegador:
-- así el dato queda aunque el atleta cargue desde otro dispositivo.
alter table public.personal_records
  add column if not exists previous_weight_kg numeric(6,2);

create or replace function public.pr_guardar_marca_anterior()
returns trigger
language plpgsql
as $$
begin
  if new.weight_kg is distinct from old.weight_kg then
    new.previous_weight_kg := old.weight_kg;
  else
    -- Editó la fecha o la nota, no el peso: la marca anterior no cambia.
    new.previous_weight_kg := old.previous_weight_kg;
  end if;
  return new;
end;
$$;

drop trigger if exists pr_marca_anterior on public.personal_records;
create trigger pr_marca_anterior
  before update on public.personal_records
  for each row execute function public.pr_guardar_marca_anterior();


-- ── Verificación ────────────────────────────────────────────
-- Tiene que devolver las 4 políticas de arriba.
-- select policyname, cmd from pg_policies
-- where schemaname = 'public' and tablename = 'personal_records';
--
-- Y la columna nueva:
-- select column_name from information_schema.columns
-- where table_schema = 'public' and table_name = 'personal_records';
