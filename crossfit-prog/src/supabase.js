import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function loadWeek(year, week) {
  const { data, error } = await supabase
    .from('programming')
    .select('data')
    .eq('year', year)
    .eq('week', week)
    .single()

  if (error || !data) return null
  return data.data
}

export async function saveWeek(year, week, weekData) {
  const { error } = await supabase
    .from('programming')
    .upsert(
      { year, week, data: weekData, updated_at: new Date().toISOString() },
      { onConflict: 'year,week' }
    )

  if (error) throw error
}
