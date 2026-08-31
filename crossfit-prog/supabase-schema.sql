-- ============================================
-- RF Planificación — Schema base para Supabase
-- Ejecutar en: Supabase > SQL Editor > New query
--
-- ⚠️ Este archivo solo crea la tabla. Las políticas de acceso
--    (RLS) están en security-migration.sql y hay que correrlo
--    después: sin él la tabla queda inaccesible.
--
--    Las versiones viejas de este archivo creaban una política
--    "escritura_publica" con FOR ALL USING (true), que dejaba
--    escribir a cualquiera con la anon key. No la reintroduzcas.
-- ============================================

CREATE TABLE IF NOT EXISTS programming (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year        INT  NOT NULL,
  week        INT  NOT NULL,
  track       TEXT NOT NULL DEFAULT 'General',
  data        JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, week, track)
);

ALTER TABLE programming ENABLE ROW LEVEL SECURITY;

-- Las políticas se definen en security-migration.sql
-- (lectura: cualquier usuario logueado / escritura: solo role='admin')
