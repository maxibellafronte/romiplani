import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const serviceKey  = import.meta.env.VITE_SUPABASE_SERVICE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
export const supabaseAdmin = createClient(supabaseUrl, serviceKey)

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
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data || null
}

// ── Gestión atletas ───────────────────────────────────────
export async function getAllProfiles() {
  const { data, error } = await supabaseAdmin
    .from('profiles').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function updateProfile(userId, updates) {
  const { error } = await supabaseAdmin.from('profiles').update(updates).eq('id', userId)
  if (error) throw error
}

// Borra el usuario de Auth y de profiles. No falla si el usuario de Auth ya no existe.
export async function deleteUserFully(userId) {
  // 1. Intentar borrar de Authentication (puede no existir)
  try {
    await supabaseAdmin.auth.admin.deleteUser(userId)
  } catch (e) {
    // Si no existe en Auth, seguimos igual para limpiar el profile
    console.log('Usuario no encontrado en Auth (posible registro huérfano):', e.message)
  }
  // 2. Borrar el perfil de la tabla profiles siempre
  const { error } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
  if (error) throw error
}
