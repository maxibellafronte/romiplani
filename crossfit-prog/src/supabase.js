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

  // Un registro por login real. Va acá y no en loadProfile() a propósito:
  // loadProfile corre en cada recarga de página y en cada refresco de token
  // (~1 vez por hora con la pestaña abierta), así que registrar ahí inflaba
  // la cuenta por 100. Esto solo corre cuando alguien entra sus credenciales.
  if (data.user) {
    try {
      const perfil = await getProfile(data.user.id)
      await supabase.from('login_logs').insert({
        user_id: data.user.id,
        user_name: perfil?.full_name || null,
        email: perfil?.email || data.user.email || null,
      })
    } catch (e) {
      // Nunca bloquear el login por no poder registrarlo.
      console.log('No se pudo registrar el acceso:', e)
    }
  }

  return data
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
