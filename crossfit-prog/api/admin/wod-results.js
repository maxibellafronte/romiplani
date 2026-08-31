import { admin, withAdmin } from '../_lib/admin.js'

export default withAdmin(async (req, res) => {
  // ── Editar el resultado de otro atleta ──────────────────
  if (req.method === 'PATCH') {
    const { blockId, userId, result, notes } = req.body || {}
    if (!blockId || !userId) {
      return res.status(400).json({ error: 'Faltan blockId o userId' })
    }
    if (typeof result !== 'string' || !result.trim()) {
      return res.status(400).json({ error: 'El resultado no puede estar vacío' })
    }

    const { error } = await admin
      .from('wod_results')
      .update({ result: result.trim(), notes: notes?.trim() || null })
      .eq('block_id', blockId)
      .eq('user_id', userId)

    if (error) throw error
    return res.status(200).json({ ok: true })
  }

  // ── Borrar el resultado de otro atleta ──────────────────
  if (req.method === 'DELETE') {
    const { blockId, userId } = req.query
    if (!blockId || !userId) {
      return res.status(400).json({ error: 'Faltan blockId o userId' })
    }

    const { error } = await admin
      .from('wod_results')
      .delete()
      .eq('block_id', blockId)
      .eq('user_id', userId)

    if (error) throw error
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', 'PATCH, DELETE')
  return res.status(405).json({ error: 'Método no permitido' })
})
