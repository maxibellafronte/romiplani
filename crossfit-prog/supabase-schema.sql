-- ============================================
-- CF PROGRAMACION — Schema para Supabase
-- Ejecutar en: Supabase > SQL Editor > New query
-- ============================================

CREATE TABLE programming (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year        INT  NOT NULL,
  week        INT  NOT NULL,
  data        JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, week)
);

-- Habilitar Row Level Security
ALTER TABLE programming ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer (atletas)
CREATE POLICY "lectura_publica" ON programming
  FOR SELECT USING (true);

-- Cualquiera puede escribir (el control de acceso es via contraseña en la app)
CREATE POLICY "escritura_publica" ON programming
  FOR ALL USING (true);
