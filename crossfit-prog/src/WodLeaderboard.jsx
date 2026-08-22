import { useState, useEffect } from 'react'
import { supabase, supabaseAdmin } from './supabase'

const ACCENT = '#679F9E'

function parseResult(val, type) {
  if (!val || String(val).trim() === '') return null
  const s = String(val).trim()
  if (type === 'tiempo') {
    const m = s.match(/^(\d+):(\d{2})$/)
    if (m) return parseInt(m[1]) * 60 + parseInt(m[2])
    const n = parseFloat(s)
    return isNaN(n) ? null : n
  }
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function fmtResult(val, type) {
  if (!val) return '—'
  return type === 'kg' ? val + ' kg' : type === 'reps' ? val + ' reps' : val
}

function rankColor(r) {
  if (r === 1) return '#F59E0B'
  if (r === 2) return '#9CA3AF'
  if (r === 3) return '#CD7C2F'
  return '#7AADA0'
}

function RankBadge({ rank }) {
  const icons = { 1: '🥇', 2: '🥈', 3: '🥉' }
  if (icons[rank]) return <span style={{ fontSize: 18 }}>{icons[rank]}</span>
  return (
    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1A2820', color: '#4A7A70', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
      {rank}
    </div>
  )
}

function ExpandableNote({ note }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <span
      onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
      style={{
        fontSize: 11, color: '#4A7A70', display: 'block',
        fontStyle: 'italic', lineHeight: 1.45, marginTop: 2,
        cursor: 'pointer',
        ...(expanded ? {} : {
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        })
      }}
    >
      {note}
    </span>
  )
}

export default function WodLeaderboard({ blockId, resultType, userId, userName, isAdmin }) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [myResult, setMyResult] = useState('')
  const [myNotes, setMyNotes] = useState('')
  const [inputVal, setInputVal] = useState('')
  const [notesVal, setNotesVal] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [editMode, setEditMode] = useState(false)

  const lower = resultType === 'tiempo'

  const load = async () => {
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('wod_results')
        .select('*')
        .eq('block_id', blockId)
        .order('created_at', { ascending: true })
      if (fetchError) throw fetchError

      const sorted = [...(data || [])].sort((a, b) => {
        const pa = parseResult(a.result, resultType)
        const pb = parseResult(b.result, resultType)
        if (pa === null && pb === null) return 0
        if (pa === null) return 1
        if (pb === null) return -1
        return lower ? pa - pb : pb - pa
      })

      let rank = 1
      const ranked = sorted.map((r, i) => {
        if (i > 0) {
          const prev = parseResult(sorted[i - 1].result, resultType)
          const curr = parseResult(r.result, resultType)
          if (prev !== curr) rank = i + 1
        }
        return { ...r, rank }
      })

      setResults(ranked)

      const mine = data?.find(r => r.user_id === userId)
      if (mine) {
        setMyResult(mine.result)
        setInputVal(mine.result)
        setMyNotes(mine.notes || '')
        setNotesVal(mine.notes || '')
      } else {
        setMyResult('')
        setInputVal('')
        setMyNotes('')
        setNotesVal('')
      }
    } catch (e) {
      console.error('Error cargando resultados:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [blockId])

  const handleSubmit = async () => {
    if (!inputVal.trim()) {
      setError('Ingresá tu resultado antes de guardar')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      // Primero intentar UPDATE si ya existe
      const { data: existing } = await supabase
        .from('wod_results')
        .select('id')
        .eq('block_id', blockId)
        .eq('user_id', userId)
        .single()

      let saveError
      if (existing) {
        const { error: updateError } = await supabase
          .from('wod_results')
          .update({
            result: inputVal.trim(),
            result_type: resultType,
            notes: notesVal.trim() || null,
          })
          .eq('block_id', blockId)
          .eq('user_id', userId)
        saveError = updateError
      } else {
        const { error: insertError } = await supabase
          .from('wod_results')
          .insert({
            block_id: blockId,
            user_id: userId,
            user_name: userName,
            result: inputVal.trim(),
            result_type: resultType,
            notes: notesVal.trim() || null,
          })
        saveError = insertError
      }

      if (saveError) throw saveError

      const savedResult = inputVal.trim()
      const savedNotes = notesVal.trim()

      setMyResult(savedResult)
      setMyNotes(savedNotes)
      setEditMode(false)

      // Actualizar resultados localmente de inmediato
      setResults(prev => {
        const newEntry = {
          id: existing?.id || 'temp-' + Date.now(),
          block_id: blockId,
          user_id: userId,
          user_name: userName,
          result: savedResult,
          result_type: resultType,
          notes: savedNotes || null,
          rank: 1,
        }
        const without = prev.filter(r => r.user_id !== userId)
        const withNew = [...without, newEntry]
        const sorted = withNew.sort((a, b) => {
          const pa = parseResult(a.result, resultType)
          const pb = parseResult(b.result, resultType)
          if (pa === null && pb === null) return 0
          if (pa === null) return 1
          if (pb === null) return -1
          return lower ? pa - pb : pb - pa
        })
        let rank = 1
        return sorted.map((r, i) => {
          if (i > 0) {
            const prev2 = parseResult(sorted[i-1].result, resultType)
            const curr = parseResult(r.result, resultType)
            if (prev2 !== curr) rank = i + 1
          }
          return { ...r, rank }
        })
      })

      // Recargar desde DB para sincronizar
      setTimeout(() => load(), 500)
    } catch (e) {
      console.error('Error guardando:', e)
      setError('Error al guardar: ' + (e.message || 'intentá de nuevo'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (resultUserId) => {
    if (!confirm('¿Eliminar este resultado?')) return
    try {
      await supabaseAdmin
        .from('wod_results')
        .delete()
        .eq('block_id', blockId)
        .eq('user_id', resultUserId)
      await load()
    } catch (e) {
      alert('Error al eliminar: ' + e.message)
    }
  }

  const ph = resultType === 'tiempo' ? 'Ej: 12:34' : resultType === 'kg' ? 'Ej: 80' : 'Ej: 150'
  const typeLabel = resultType === 'tiempo' ? '⏱ FOR TIME' : resultType === 'kg' ? '⚖️ MAX KG' : '💪 MAX REPS'

  const inputStyle = {
    background: '#0E1210',
    border: '1px solid #2A4A44',
    borderRadius: 7,
    color: '#D4EDE8',
    padding: '9px 12px',
    fontSize: 14,
    outline: 'none',
  }

  return (
    <div style={{ marginTop: 12, background: '#0F1412', border: '1px solid #2A4A44', borderRadius: 10, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '10px 14px', background: '#0E1614', borderBottom: '1px solid #1A2820', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          🏆 Leaderboard
        </span>
        <span style={{ fontSize: 10, color: '#4A7A70', fontWeight: 700, letterSpacing: '0.08em' }}>{typeLabel}</span>
      </div>

      {/* Carga de resultado — solo atletas */}
      {!isAdmin && (
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #1A2820' }}>
          {myResult && !editMode ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <span style={{ fontSize: 11, color: '#4A7A70', display: 'block', marginBottom: 3 }}>Tu resultado</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: ACCENT }}>{fmtResult(myResult, resultType)}</span>
                {myNotes && <p style={{ fontSize: 12, color: '#5A8A80', marginTop: 4, fontStyle: 'italic', lineHeight: 1.5 }}>{myNotes}</p>}
              </div>
              <button
                onClick={() => { setEditMode(true); setNotesVal(myNotes) }}
                style={{ background: 'none', border: '1px solid #2A4A44', borderRadius: 6, color: '#4A7A70', cursor: 'pointer', fontSize: 11, padding: '5px 10px', flexShrink: 0 }}>
                Editar
              </button>
            </div>
          ) : (
            <div>
              <span style={{ fontSize: 11, color: '#4A7A70', display: 'block', marginBottom: 8 }}>
                {myResult ? 'Editá tu resultado' : 'Cargá tu resultado'}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder={ph}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{ padding: '9px 16px', background: ACCENT, border: 'none', borderRadius: 7, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? '...' : '✓'}
                </button>
                {editMode && (
                  <button
                    onClick={() => { setEditMode(false); setInputVal(myResult); setNotesVal(myNotes) }}
                    style={{ padding: '9px 12px', background: 'none', border: '1px solid #2A4A44', borderRadius: 7, color: '#4A7A70', cursor: 'pointer', fontSize: 13 }}>
                    ✕
                  </button>
                )}
              </div>

              <div style={{ marginTop: 10 }}>
                <span style={{ fontSize: 11, color: '#4A7A70', display: 'block', marginBottom: 6 }}>
                  Notas <span style={{ fontSize: 10, color: '#2A4A44' }}>(opcional)</span>
                </span>
                <textarea
                  value={notesVal}
                  onChange={e => setNotesVal(e.target.value)}
                  placeholder=""
                  rows={2}
                  style={{ ...inputStyle, display: 'block', width: '100%', fontSize: 13, resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
                />
              </div>

              {error && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: '#2A1A1A', border: '1px solid #7F3030', borderRadius: 6 }}>
                  <p style={{ color: '#FCA5A5', fontSize: 12, margin: 0 }}>{error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tabla de resultados */}
      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#2A4A44', fontSize: 11, letterSpacing: '0.1em' }}>CARGANDO...</div>
      ) : results.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#1E3530', fontSize: 11, letterSpacing: '0.1em' }}>— SIN RESULTADOS AÚN —</div>
      ) : (
        <div>
          {results.map((r, i) => {
            const isMe = r.user_id === userId
            const rc = rankColor(r.rank)
            return (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                background: isMe ? ACCENT + '12' : i % 2 === 0 ? '#0F1412' : '#0E1210',
                borderBottom: i < results.length - 1 ? '1px solid #1A2820' : 'none',
              }}>
                <div style={{ flexShrink: 0, width: 28, display: 'flex', justifyContent: 'center' }}>
                  <RankBadge rank={r.rank} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: isMe ? 700 : 500, color: isMe ? ACCENT : '#D4EDE8', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.user_name || 'Atleta'} {isMe && <span style={{ fontSize: 10, color: '#4A7A70' }}>(vos)</span>}
                  </span>
                  {r.notes && <ExpandableNote note={r.notes} />}
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: rc, flexShrink: 0 }}>
                  {fmtResult(r.result, resultType)}
                </span>
                {isAdmin && (
                  <button onClick={() => handleDelete(r.user_id)}
                    style={{ background: 'none', border: 'none', color: '#2A4A44', cursor: 'pointer', fontSize: 16, padding: '0 4px', flexShrink: 0, lineHeight: 1 }}>
                    ×
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
