-- ============================================================
-- MIGRACIÓN DE SEGURIDAD — RF Planificación
-- Ejecutar en: Supabase > SQL Editor > New query
--
-- Qué arregla:
--   Antes, la política "escritura_publica" (FOR ALL USING (true))
--   permitía que cualquiera con la anon key —que es pública por
--   diseño— insertara, modificara o borrara toda la programación.
--   El único control era una contraseña que viajaba en el JavaScript.
--
--   A partir de acá el permiso vive en profiles.role y lo verifica
--   Postgres, no el navegador.
--
-- IMPORTANTE: correr los pasos en orden. El PASO 0 es solo lectura.
-- ============================================================


-- ── PASO 0 ── Mirá qué hay antes de tocar nada ──────────────
-- Correr SOLO esto primero. No modifica nada: lista las columnas
-- reales de las tablas, para no asumir que existe algo que no está.
--
--   select table_name, column_name, data_type
--   from information_schema.columns
--   where table_schema = 'public'
--     and table_name in ('profiles','programming','wod_results','login_logs')
--   order by table_name, ordinal_position;
--
-- Y para sacar el email de Romina (sin la columna role, que todavía
-- no existe):
--
--   select id, email, full_name, status
--   from public.profiles order by created_at;


-- ── PASO 1 ── Crear la columna de rol ───────────────────────
-- profiles no tenía columna role: hay que agregarla. Todos los
-- perfiles existentes quedan como 'user'; en el PASO 7 marcamos
-- a los coaches.
alter table public.profiles
  add column if not exists role text not null default 'user';

-- Solo estos dos valores son válidos.
alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));


-- ── PASO 2 ── ¿El usuario actual es coach? ──────────────────
-- SECURITY DEFINER hace que la función lea profiles sin pasar por
-- RLS. Sin eso, una política sobre profiles que consulta profiles
-- entra en recursión infinita.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public;
grant  execute on function public.is_admin() to authenticated;


-- ── PASO 3 ── programming ───────────────────────────────────
-- Leen todos los logueados; escriben solo los coaches.
alter table public.programming enable row level security;

drop policy if exists "lectura_publica"    on public.programming;
drop policy if exists "escritura_publica"  on public.programming;
drop policy if exists "programming_select" on public.programming;
drop policy if exists "programming_write"  on public.programming;

create policy "programming_select" on public.programming
  for select to authenticated
  using (true);

create policy "programming_write" on public.programming
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ── PASO 4 ── profiles ──────────────────────────────────────
-- Cada atleta ve solo su perfil; el coach ve todos.
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_admin_all"  on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Un atleta puede cambiar su nombre, pero NO su rol ni su estado:
-- si no, cualquiera se auto-ascendería a coach. Esto se controla con
-- permisos por columna, que RLS no puede expresar.
-- Los coaches editan perfiles vía /api/admin/profiles, que usa la
-- service_role key del servidor y no está sujeta a estos permisos.
revoke update on public.profiles from authenticated;
grant  update (full_name) on public.profiles to authenticated;


-- ── PASO 5 ── wod_results ───────────────────────────────────
-- Todos ven el leaderboard; cada uno toca solo su propio resultado.
-- El coach edita/borra los ajenos vía /api/admin/wod-results.
alter table public.wod_results enable row level security;

drop policy if exists "wod_select"     on public.wod_results;
drop policy if exists "wod_insert_own" on public.wod_results;
drop policy if exists "wod_update_own" on public.wod_results;
drop policy if exists "wod_delete_own" on public.wod_results;

create policy "wod_select" on public.wod_results
  for select to authenticated
  using (true);

create policy "wod_insert_own" on public.wod_results
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "wod_update_own" on public.wod_results
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "wod_delete_own" on public.wod_results
  for delete to authenticated
  using (user_id = auth.uid());


-- ── PASO 6 ── login_logs ────────────────────────────────────
-- Nadie los lee desde el navegador: /api/admin/activity los lee con la
-- service_role key del servidor, que ignora RLS.
-- Escribir sí: signIn() inserta una fila por login, y solo puede
-- insertar filas a nombre propio.
alter table public.login_logs enable row level security;

drop policy if exists "logs_select"      on public.login_logs;
drop policy if exists "logs_select_own"  on public.login_logs;
drop policy if exists "logs_insert_own"  on public.login_logs;

-- Cada uno ve solo sus propias filas. No es para mostrarlas: la app las
-- consulta para saber si ya registró la visita de hoy y no duplicarla.
-- El panel del coach NO usa esto: lee todo vía /api/admin/activity.
create policy "logs_select_own" on public.login_logs
  for select to authenticated
  using (user_id = auth.uid());

create policy "logs_insert_own" on public.login_logs
  for insert to authenticated
  with check (user_id = auth.uid());


-- ── PASO 7 ── Marcar a los coaches ──────────────────────────
-- ⚠️ Reemplazá el email de Romina por el real (lo sacás del PASO 0)
-- ANTES de correr esto. Si te equivocás, quedás sin acceso de coach.
update public.profiles
set role = 'admin', status = 'active'
where email in (
  'maxil.bellafronte@gmail.com',
  'REEMPLAZAR_EMAIL_DE_ROMINA'
);


-- ── PASO 8 ── Verificación ──────────────────────────────────
-- Tiene que devolver exactamente 2 filas: vos y Romina.
select email, full_name, role, status
from public.profiles
where role = 'admin';
