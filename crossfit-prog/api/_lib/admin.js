import { createClient } from '@supabase/supabase-js'

// Estas variables NO llevan prefijo VITE_, por lo que Vite nunca las incluye
// en el bundle del navegador. Viven solo en el servidor de Vercel.
const supabaseUrl = process.env.SUPABASE_URL
const serviceKey  = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en el entorno del servidor')
}

// Cliente con service_role: solo existe del lado del servidor.
export const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Verifica que quien llama tenga sesión válida y rol admin.
// Devuelve el usuario, o null si ya respondió con un error.
export async function requireAdmin(req, res) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    res.status(401).json({ error: 'No autenticado' })
    return null
  }

  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) {
    res.status(401).json({ error: 'Sesión inválida o expirada' })
    return null
  }

  const { data: profile } = await admin
    .from('profiles').select('role, status').eq('id', user.id).single()

  if (!profile || profile.role !== 'admin') {
    res.status(403).json({ error: 'No tenés permisos de coach' })
    return null
  }

  return { user, profile }
}

// Wrapper: aplica requireAdmin y centraliza el manejo de errores.
export function withAdmin(handler) {
  return async (req, res) => {
    try {
      const caller = await requireAdmin(req, res)
      if (!caller) return // requireAdmin ya respondió 401/403
      return await handler(req, res, caller)
    } catch (e) {
      console.error('Error en endpoint admin:', e)
      res.status(500).json({ error: 'Error interno del servidor' })
    }
  }
}
