import { admin, withAdmin } from '../_lib/admin.js'

// Solo estos campos se pueden modificar desde el panel. Cualquier otro
// se descarta, para que nadie pueda escribir columnas arbitrarias.
const CAMPOS_EDITABLES = ['full_name', 'status', 'role', 'track']

export default withAdmin(async (req, res, caller) => {
  // ── Listar atletas ──────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await admin
      .from('profiles').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return res.status(200).json(data)
  }

  // ── Editar un perfil (aprobar, cambiar rol o track) ─────
  if (req.method === 'PATCH') {
    const { userId, updates } = req.body || {}
    if (!userId || !updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Faltan userId o updates' })
    }

    const limpio = {}
    for (const campo of CAMPOS_EDITABLES) {
      if (campo in updates) limpio[campo] = updates[campo]
    }
    if (Object.keys(limpio).length === 0) {
      return res.status(400).json({ error: 'Ningún campo editable en updates' })
    }

    // Evita que un coach se quite a sí mismo el admin y quede afuera.
    if (userId === caller.user.id && 'role' in limpio && limpio.role !== 'admin') {
      return res.status(400).json({ error: 'No podés quitarte a vos mismo el rol de coach' })
    }

    const { error } = await admin.from('profiles').update(limpio).eq('id', userId)
    if (error) throw error
    return res.status(200).json({ ok: true })
  }

  // ── Borrar usuario (Auth + perfil) ──────────────────────
  if (req.method === 'DELETE') {
    const userId = req.query.userId
    if (!userId) return res.status(400).json({ error: 'Falta userId' })
    if (userId === caller.user.id) {
      return res.status(400).json({ error: 'No podés borrar tu propia cuenta' })
    }

    // Puede no existir en Auth (registro huérfano): seguimos igual
    // para limpiar el perfil.
    try {
      await admin.auth.admin.deleteUser(userId)
    } catch (e) {
      console.log('Usuario no encontrado en Auth (posible registro huérfano):', e.message)
    }

    const { error } = await admin.from('profiles').delete().eq('id', userId)
    if (error) throw error
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE')
  return res.status(405).json({ error: 'Método no permitido' })
})
