import { admin, withUser } from '../_lib/admin.js'

// Cada usuario cambia SU propia contraseña. El id sale del token, nunca
// del body: así nadie puede cambiar la de otra persona.
export default withUser(async (req, res, caller) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const { password } = req.body || {}
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  }

  const { error: errorAuth } = await admin.auth.admin.updateUserById(caller.user.id, { password })
  if (errorAuth) {
    console.error('Fallo al cambiar la contraseña:', errorAuth)
    return res.status(500).json({ error: 'No se pudo cambiar la contraseña: ' + errorAuth.message })
  }

  // Se limpia acá, en el servidor: el usuario no tiene permiso de escritura
  // sobre esta columna, así que no puede saltearse el cambio.
  const { error } = await admin
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', caller.user.id)
  if (error) throw error

  return res.status(200).json({ ok: true })
})
