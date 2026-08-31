import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Un solo cliente, con la anon key (pública por diseño). Las operaciones
// privilegiadas NO se hacen acá: viven en /api/admin/*, del lado del servidor,
// que es el único lugar donde existe la service_role key.
export const supabase = createClient(supabaseUrl, supabaseKey)

// Llama a un endpoint admin adjuntando el token de sesión del usuario.
// El servidor valida el token y que el perfil tenga role='admin'.
async function apiAdmin(path, { method = 'GET', body, params } = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Tu sesión expiró. Volvé a iniciar sesión.')

  const url = new URL(path, window.location.origin)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null) url.searchParams.set(k, v)
    }
  }

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const detalle = await res.json().catch(() => ({}))
    throw new Error(detalle.error || `Error ${res.status}`)
  }
  return res.json()
}

// ── Programación ──────────────────────────────────────────
export async function loadWeek(year, week, track = 'General') {
  const { data, error } = await supabase
    .from('programming')
    .select('data')
    .eq('year', year)
    .eq('week', week)
    .eq('track', track)
    .single()
  if (error || !data) return null
  return data.data
}

export async function saveWeek(year, week, weekData, track = 'General') {
  // La escritura la autoriza RLS: solo perfiles con role='admin' pasan.
  const { error } = await supabase
    .from('programming')
    .upsert(
      { year, week, track, data: weekData, updated_at: new Date().toISOString() },
      { onConflict: 'year,week,track' }
    )
  if (error) throw error
}

// ── Recuperación de versiones viejas ──────────────────────
// Un navegador (sobre todo la app instalada en el celular, que usa un
// service worker) puede quedarse con un bundle viejo cacheado. Si ese
// bundle trae una clave de API que ya fue revocada, Supabase rechaza
// todo con estos errores. No es un problema de credenciales del usuario:
// es que hay que actualizar la app.
export function esVersionVieja(mensaje = '') {
  return /legacy api keys are disabled|invalid api key|no api key found/i.test(mensaje)
}

// Borra todo lo cacheado, saca los service workers y recarga desde la red.
export async function actualizarApp() {
  try {
    if ('serviceWorker' in navigator) {
      const registros = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registros.map(r => r.unregister()))
    }
  } catch (e) { /* seguimos: lo importante es limpiar cachés y recargar */ }

  try {
    if ('caches' in window) {
      const claves = await caches.keys()
      await Promise.all(claves.map(k => caches.delete(k)))
    }
  } catch (e) { /* idem */ }

  // Cache-busting: sin el parámetro, iOS puede volver a servir el HTML viejo.
  window.location.replace(`${window.location.pathname}?v=${Date.now()}`)
}

// ── Auth ──────────────────────────────────────────────────
export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({ email, password,
    options: { data: { full_name: fullName } }
  })
  if (error) throw error
  if (data.user) {
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', data.user.id)
  }
  return data
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

// Registra que el atleta abrió la app hoy: como mucho una fila por persona
// por día. La métrica es "días distintos en que entró", no cuántas veces
// recargó la página — el código original registraba en cada carga y en cada
// refresco de token, y por eso contaba ~90 accesos diarios por persona.
export async function registrarVisitaDiaria(userId, perfil) {
  if (!userId) return

  const inicioDelDia = new Date()
  inicioDelDia.setHours(0, 0, 0, 0)
  const claveHoy = `${inicioDelDia.getFullYear()}-${inicioDelDia.getMonth()+1}-${inicioDelDia.getDate()}`
  const cache = `visita:${userId}`

  // Atajo local para no consultar la base en cada recarga. Si falla
  // (modo privado, storage bloqueado) seguimos contra la base igual.
  try {
    if (localStorage.getItem(cache) === claveHoy) return
  } catch (e) { /* sin storage: verificamos contra la base */ }

  try {
    // Autoritativo: cubre el caso de entrar desde otro dispositivo.
    const { data: yaRegistrado } = await supabase
      .from('login_logs')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', inicioDelDia.toISOString())
      .limit(1)

    if (!yaRegistrado?.length) {
      await supabase.from('login_logs').insert({
        user_id: userId,
        user_name: perfil?.full_name || null,
        email: perfil?.email || null,
      })
    }

    try { localStorage.setItem(cache, claveHoy) } catch (e) { /* ignorar */ }
  } catch (e) {
    // Nunca romper la app por no poder registrar una visita.
    console.log('No se pudo registrar la visita:', e)
  }
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data || null
}

// ── Gestión atletas (vía /api/admin, requiere role='admin') ─
export async function getAllProfiles() {
  return apiAdmin('/api/admin/profiles')
}

export async function updateProfile(userId, updates) {
  return apiAdmin('/api/admin/profiles', { method: 'PATCH', body: { userId, updates } })
}

export async function deleteUserFully(userId) {
  return apiAdmin('/api/admin/profiles', { method: 'DELETE', params: { userId } })
}

// ── Contraseñas ───────────────────────────────────────────
// La coach resetea la de un atleta: devuelve una temporal de un solo uso
// y marca la cuenta para que tenga que elegir una nueva al entrar.
export async function resetearPassword(userId) {
  return apiAdmin('/api/admin/reset-password', { method: 'POST', body: { userId } })
}

// Cada uno cambia la suya. El servidor saca el id del token de sesión.
export async function cambiarMiPassword(password) {
  return apiAdmin('/api/account/password', { method: 'POST', body: { password } })
}

// ── Actividad ─────────────────────────────────────────────
export async function getLoginLogs(days = 30) {
  return apiAdmin('/api/admin/activity', { params: { days } })
}

// ── Resultados de WOD de otros atletas ────────────────────
export async function updateWodResult(blockId, userId, result, notes) {
  return apiAdmin('/api/admin/wod-results', {
    method: 'PATCH', body: { blockId, userId, result, notes },
  })
}

export async function deleteWodResult(blockId, userId) {
  return apiAdmin('/api/admin/wod-results', {
    method: 'DELETE', params: { blockId, userId },
  })
}
