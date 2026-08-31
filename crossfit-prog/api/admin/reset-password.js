import { randomInt } from 'node:crypto'
import { admin, withAdmin } from '../_lib/admin.js'

// Sin caracteres ambiguos (0/O, 1/l/I): la contraseña se dicta o se copia
// a mano por WhatsApp, así que tiene que leerse sin dudas.
const ALFABETO = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generarPasswordTemporal() {
  let salida = ''
  for (let i = 0; i < 10; i++) {
    salida += ALFABETO[randomInt(ALFABETO.length)]
  }
  // Un guion al medio la hace más fácil de leer en voz alta.
  return `${salida.slice(0, 5)}-${salida.slice(5)}`
}

export default withAdmin(async (req, res, caller) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const { userId } = req.body || {}
  if (!userId) return res.status(400).json({ error: 'Falta userId' })
  if (userId === caller.user.id) {
    return res.status(400).json({
      error: 'Para cambiar tu propia contraseña usá la opción de tu cuenta',
    })
  }

  const passwordTemporal = generarPasswordTemporal()

  const { error: errorAuth } = await admin.auth.admin.updateUserById(userId, {
    password: passwordTemporal,
  })
  if (errorAuth) {
    console.error('Fallo al resetear la contraseña:', errorAuth)
    return res.status(500).json({ error: 'No se pudo cambiar la contraseña: ' + errorAuth.message })
  }

  // Marca la cuenta para que la app la obligue a elegir una nueva al entrar.
  const { error } = await admin
    .from('profiles')
    .update({ must_change_password: true })
    .eq('id', userId)
  if (error) throw error

  // Se devuelve una sola vez: no queda guardada en ningún lado en claro.
  return res.status(200).json({ password: passwordTemporal })
})
