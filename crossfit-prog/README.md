# ⚡ CF Programación — Guía de deploy

## Stack
- **Frontend**: React + Vite
- **Base de datos**: Supabase (PostgreSQL)
- **Hosting**: Vercel

---

## Paso 1 — Configurar Supabase

1. Andá a [supabase.com](https://supabase.com) y creá una cuenta
2. Creá un nuevo proyecto (elegí la región más cercana)
3. Cuando cargue, andá a **SQL Editor** > **New query**
4. Copiá y ejecutá el contenido de `supabase-schema.sql`
5. Andá a **Project Settings** > **API** y copiá:
   - `Project URL` → es tu `VITE_SUPABASE_URL`
   - `anon public` key → es tu `VITE_SUPABASE_ANON_KEY`

---

## Paso 2 — Subir el código a GitHub

1. Creá un repositorio nuevo en [github.com](https://github.com)
2. Subí todos estos archivos al repositorio

---

## Paso 3 — Deploy en Vercel

1. Andá a [vercel.com](https://vercel.com) y conectá tu cuenta de GitHub
2. Hacé click en **Add New Project**
3. Importá el repositorio que creaste
4. En **Environment Variables**, agregá:
   - `VITE_SUPABASE_URL` → tu URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` → tu anon key de Supabase
   - `VITE_ADMIN_PASSWORD` → la contraseña que quieras para el coach
5. Hacé click en **Deploy**

¡Listo! Vercel te da una URL pública tipo `tu-app.vercel.app`

---

## Uso

- **Atletas**: entran a la URL y ven la programación de la semana actual
- **Coach**: hace click en "COACH" arriba a la derecha, ingresa la contraseña y puede editar

---

## Contraseña por defecto
`coach2026` (cambiala en las variables de entorno de Vercel)
