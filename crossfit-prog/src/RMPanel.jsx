import { useState, useEffect } from 'react'
import { getMisRM, guardarRM, borrarRM } from './supabase'

const ACCENT = '#31708E'

// Catálogo de movimientos. Para agregar uno nuevo alcanza con sumar una
// línea acá: el `id` es lo que queda guardado en la base (no cambiarlo
// una vez que hay atletas con datos cargados), el `label` es lo que se ve.
export const MOVIMIENTOS = [
  { grupo: 'Levantamientos olímpicos', items: [
    { id: 'snatch',          label: 'Snatch' },
    { id: 'power_snatch',    label: 'Power Snatch' },
    { id: 'hang_snatch',     label: 'Hang Snatch' },
    { id: 'clean',           label: 'Clean' },
    { id: 'power_clean',     label: 'Power Clean' },
    { id: 'hang_clean',      label: 'Hang Clean' },
    { id: 'squat_clean',     label: 'Squat Clean' },
    { id: 'clean_and_jerk',  label: 'Clean & Jerk' },
    { id: 'split_jerk',      label: 'Split Jerk' },
    { id: 'push_jerk',       label: 'Push Jerk' },
  ]},
  { grupo: 'Sentadillas', items: [
    { id: 'back_squat',      label: 'Back Squat' },
    { id: 'front_squat',     label: 'Front Squat' },
    { id: 'overhead_squat',  label: 'Overhead Squat' },
  ]},
  { grupo: 'Tirones', items: [
    { id: 'deadlift',        label: 'Deadlift' },
    { id: 'sumo_deadlift',   label: 'Sumo Deadlift' },
    { id: 'bent_over_row',   label: 'Bent Over Row' },
    { id: 'weighted_pullup', label: 'Weighted Pull-up' },
  ]},
  { grupo: 'Empujes', items: [
    { id: 'strict_press',    label: 'Strict Press' },
    { id: 'push_press',      label: 'Push Press' },
    { id: 'bench_press',     label: 'Bench Press' },
    { id: 'thruster',        label: 'Thruster' },
  ]},
]

const CATALOGO = MOVIMIENTOS.flatMap(g => g.items)
const ETIQUETAS = Object.fromEntries(CATALOGO.map(m => [m.id, m.label]))

function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function fmtFecha(iso) {
  const s = String(iso ?? '').slice(0, 10)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1].slice(2)}` : ''
}

// 100.00 → "100" ; 62.50 → "62.5"
function fmtKg(v) {
  const n = Number(v)
  return isFinite(n) ? String(Math.round(n * 100) / 100) : String(v ?? '')
}

const inputStyle = {
  background: '#E2E8EA', border: '1px solid #AEB9C0', borderRadius: 7,
  color: '#1F3A4A', padding: '9px 12px', fontSize: 14, outline: 'none',
  fontFamily: 'inherit',
}

export default function RMPanel({ userId, userName }) {
  const [records, setRecords] = useState({})   // { movement: fila }
  const [loading, setLoading] = useState(true)
  const [cargaError, setCargaError] = useState(null)

  const [editando, setEditando] = useState(null)   // id del movimiento abierto
  const [valor, setValor] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [mejora, setMejora] = useState(null)       // { movement, delta }

  const cargar = async () => {
    setLoading(true); setCargaError(null)
    try {
      const filas = await getMisRM(userId)
      setRecords(Object.fromEntries(filas.map(f => [f.movement, f])))
    } catch (e) {
      console.error('Error cargando RM:', e)
      setCargaError('No se pudieron cargar tus RM. Probá de nuevo en un rato.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (userId) cargar() }, [userId])

  // Movimientos guardados que ya no están en el catálogo (por ejemplo, si se
  // renombró un id): se muestran igual, para no esconderle datos al atleta.
  const huerfanos = Object.keys(records)
    .filter(id => !ETIQUETAS[id])
    .map(id => ({ id, label: id }))
  const grupos = huerfanos.length
    ? [...MOVIMIENTOS, { grupo: 'Otros', items: huerfanos }]
    : MOVIMIENTOS

  const cargados = Object.keys(records).length
  const total = CATALOGO.length + huerfanos.length

  const abrirEditor = (mov) => {
    const r = records[mov.id]
    setEditando(mov.id)
    setValor(r ? fmtKg(r.weight_kg) : '')
    setFecha(r?.achieved_on ? String(r.achieved_on).slice(0, 10) : hoyISO())
    setNota(r?.notes || '')
    setError(null)
  }

  const cerrarEditor = () => {
    setEditando(null); setValor(''); setNota(''); setError(null)
  }

  const guardar = async (mov) => {
    const peso = parseFloat(String(valor).replace(',', '.'))
    if (!isFinite(peso) || peso <= 0) {
      setError('Ingresá un peso válido en kg (ej: 100 o 62.5)')
      return
    }
    if (peso > 500) {
      setError('Ese peso parece demasiado alto. Revisalo.')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      setError('Elegí la fecha del récord')
      return
    }
    setGuardando(true); setError(null)
    try {
      const anterior = records[mov.id] ? Number(records[mov.id].weight_kg) : null
      const fila = await guardarRM({
        userId, userName, movement: mov.id,
        weightKg: peso, achievedOn: fecha, notes: nota,
      })
      setRecords(prev => ({ ...prev, [mov.id]: fila }))
      cerrarEditor()
      if (anterior != null && peso > anterior) {
        setMejora({ movement: mov.id, delta: Math.round((peso - anterior) * 100) / 100 })
        setTimeout(() => setMejora(null), 5000)
      }
    } catch (e) {
      console.error('Error guardando RM:', e)
      setError('No se pudo guardar: ' + (e.message || 'intentá de nuevo'))
    } finally {
      setGuardando(false)
    }
  }

  const borrar = async (mov) => {
    if (!confirm(`¿Borrar tu RM de ${mov.label}?`)) return
    setGuardando(true)
    try {
      await borrarRM(userId, mov.id)
      setRecords(prev => { const n = { ...prev }; delete n[mov.id]; return n })
      cerrarEditor()
    } catch (e) {
      setError('No se pudo borrar: ' + (e.message || 'intentá de nuevo'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div style={{ padding: '14px 12px', maxWidth: 720, margin: '0 auto' }}>

      {/* Encabezado */}
      <div style={{ background: '#EEF2F0', border: '1px solid #AEB9C0', borderRadius: 10, padding: '12px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: ACCENT, letterSpacing: '0.08em' }}>🏋️ MIS RM</div>
          <div style={{ fontSize: 11, color: '#7A8FA0', marginTop: 3 }}>Tus pesos máximos por movimiento</div>
        </div>
        <span style={{ fontSize: 11, color: '#7A8FA0', fontWeight: 700, flexShrink: 0 }}>{cargados}/{total}</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: '#AEB9C0', fontSize: 12, letterSpacing: '0.12em' }}>CARGANDO RM...</div>
      ) : cargaError ? (
        <div style={{ textAlign: 'center', padding: 40, color: ACCENT, fontSize: 13 }}>{cargaError}</div>
      ) : grupos.map(g => (
        <div key={g.grupo} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#7A8FA0', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 4px 6px' }}>
            {g.grupo}
          </div>
          <div style={{ background: '#EEF2F0', border: '1px solid #AEB9C0', borderRadius: 10, overflow: 'hidden' }}>
            {g.items.map((mov, i) => {
              const r = records[mov.id]
              const abierto = editando === mov.id
              const borde = i < g.items.length - 1 ? '1px solid #C4CDD4' : 'none'

              if (abierto) {
                return (
                  <div key={mov.id} style={{ padding: '12px 14px', background: '#E2E8EA', borderBottom: borde }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1F3A4A', marginBottom: 10 }}>{mov.label}</div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        value={valor}
                        onChange={e => setValor(e.target.value.replace(/[^0-9.,]/g, ''))}
                        onKeyDown={e => e.key === 'Enter' && guardar(mov)}
                        inputMode="decimal"
                        placeholder="Ej: 100"
                        autoFocus
                        style={{ ...inputStyle, flex: 1, minWidth: 0, fontWeight: 700 }}
                      />
                      <span style={{ fontSize: 12, color: '#7A8FA0', fontWeight: 700 }}>kg</span>
                      <input
                        type="date"
                        value={fecha}
                        max={hoyISO()}
                        onChange={e => setFecha(e.target.value)}
                        style={{ ...inputStyle, fontSize: 13, padding: '8px 10px' }}
                      />
                    </div>

                    <input
                      value={nota}
                      onChange={e => setNota(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && guardar(mov)}
                      placeholder="Notas (opcional)"
                      style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginTop: 8, fontSize: 13 }}
                    />

                    {error && (
                      <div style={{ marginTop: 8, padding: '8px 12px', background: '#EDDBDB', border: '1px solid #C25454', borderRadius: 6 }}>
                        <p style={{ color: '#A33A3A', fontSize: 12, margin: 0 }}>{error}</p>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button onClick={() => guardar(mov)} disabled={guardando}
                        style={{ padding: '9px 18px', background: ACCENT, border: 'none', borderRadius: 7, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: guardando ? 0.7 : 1 }}>
                        {guardando ? '...' : 'Guardar'}
                      </button>
                      <button onClick={cerrarEditor} disabled={guardando}
                        style={{ padding: '9px 14px', background: 'none', border: '1px solid #AEB9C0', borderRadius: 7, color: '#7A8FA0', cursor: 'pointer', fontSize: 13 }}>
                        Cancelar
                      </button>
                      {r && (
                        <button onClick={() => borrar(mov)} disabled={guardando}
                          style={{ marginLeft: 'auto', padding: '9px 12px', background: 'none', border: '1px solid #C4CDD4', borderRadius: 7, color: '#AEB9C0', cursor: 'pointer', fontSize: 12 }}>
                          Borrar
                        </button>
                      )}
                    </div>
                  </div>
                )
              }

              return (
                <div key={mov.id} onClick={() => abrirEditor(mov)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
                    background: r ? '#EEF2F0' : '#E9EEEF', borderBottom: borde, cursor: 'pointer',
                  }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: r ? 700 : 500, color: r ? '#1F3A4A' : '#7A8FA0', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {mov.label}
                    </span>
                    {r?.notes && (
                      <span style={{ fontSize: 11, color: '#7A8FA0', fontStyle: 'italic', display: 'block', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.notes}
                      </span>
                    )}
                  </div>
                  {mejora?.movement === mov.id && (
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#4A7A64', flexShrink: 0 }}>
                      🎉 +{fmtKg(mejora.delta)} kg
                    </span>
                  )}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {r ? (
                      <>
                        <span style={{ fontSize: 15, fontWeight: 800, color: ACCENT }}>{fmtKg(r.weight_kg)} kg</span>
                        <span style={{ fontSize: 10, color: '#AEB9C0', display: 'block', marginTop: 1 }}>{fmtFecha(r.achieved_on)}</span>
                      </>
                    ) : (
                      <span style={{ fontSize: 12, color: '#AEB9C0' }}>+ cargar</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
