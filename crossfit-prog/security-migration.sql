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
-- Corré SOLO esta línea primero y anotá el email de Romina.
--
--   select id, email, full_name, role, status
--   from public.profiles order by created_at;


-- ── PASO 1 ── ¿El usuario actual es coach? ──────────────────
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


-- ── PASO 2 ── programming ───────────────────────────────────
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


-- ── PASO 3 ── profiles ──────────────────────────────────────
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


-- ── PASO 4 ── wod_results ───────────────────────────────────
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


-- ── PASO 5 ── login_logs ────────────────────────────────────
-- Sin políticas: desde el navegador no se leen ni se escriben.
-- /api/admin/activity los lee con la service_role key, que ignora RLS.
alter table public.login_logs enable row level security;

drop policy if exists "logs_select" on public.login_logs;

-- Si después de esto los logins dejan de registrarse, quiere decir que
-- los escribía el cliente y no un trigger. En ese caso, descomentá:
--
--   create policy "logs_insert_own" on public.login_logs
--     for insert to authenticated
--     with check (user_id = auth.uid());


-- ── PASO 6 ── Marcar a los coaches ──────────────────────────
-- ⚠️ Reemplazá el email de Romina por el real (lo sacás del PASO 0)
-- ANTES de correr esto. Si te equivocás, quedás sin acceso de coach.
update public.profiles
set role = 'admin', status = 'active'
where email in (
  'maxil.bellafronte@gmail.com',
  'REEMPLAZAR_EMAIL_DE_ROMINA'
);


-- ── PASO 7 ── Verificación ──────────────────────────────────
-- Tiene que devolver exactamente 2 filas: vos y Romina.
select email, full_name, role, status
from public.profiles
where role = 'admin';
