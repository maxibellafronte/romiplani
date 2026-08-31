import { admin, withAdmin } from '../_lib/admin.js'

export default withAdmin(async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const dias = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365)
  const desde = new Date()
  desde.setDate(desde.getDate() - dias)

  const { data, error } = await admin
    .from('login_logs')
    .select('*')
    .gte('created_at', desde.toISOString())
    .order('created_at', { ascending: false })

  if (error) throw error
  return res.status(200).json(data || [])
})
