import { useState, useEffect, useRef } from 'react'
import { loadWeek, saveWeek } from './supabase'

// ── Contraseña admin (configurable por variable de entorno) ──────────────
const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASSWORD || 'coach2026'

// ── Tipos de bloque ──────────────────────────────────────────────────────
const BTYPES = {
  warmup:   { label: 'Warm-up',      bg: '#7C3AED', accent: '#C4B5FD' },
  strength: { label: 'Strength',     bg: '#1D4ED8', accent: '#93C5FD' },
  wod:      { label: 'WOD / Metcon', bg: '#B91C1C', accent: '#FCA5A5' },
  skill:    { label: 'Skill',        bg: '#065F46', accent: '#6EE7B7' },
}

const DL = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
const DK = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']

// ── Utilidades de fecha ──────────────────────────────────────────────────
function getMon(year, week) {
  const j4 = new Date(year, 0, 4)
  const mon = new Date(j4)
  mon.setDate(j4.getDate() - (j4.getDay() + 6) % 7 + (week - 1) * 7)
  return mon
}

function getISOWY(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const w1 = new Date(d.getFullYear(), 0, 4)
  const week = 1 + Math.round(((d - w1) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7)
  return { year: d.getFullYear(), week }
}

function fmtDate(d) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function emptyW() {
  const days = {}
  DK.forEach(k => { days[k] = { focus: '', isRest: false, blocks: [] } })
  return { title: '', days }
}

// ── Estilos comunes ──────────────────────────────────────────────────────
const S = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.88)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#1C1C1C', border: '1px solid #2A2A2A',
    borderRadius: 10, padding: 24,
    width: 'min(440px, 94vw)',
    maxHeight: '90vh', overflowY: 'auto',
  },
  label: {
    fontSize: 10, color: '#555',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    display: 'block', marginTop: 14, marginBottom: 4,
  },
  input: {
    display: 'block', width: '100%',
    background: '#111', border: '1px solid #2A2A2A',
    borderRadius: 6, color: '#F0F0F0',
    padding: '9px 11px', fontSize: 13, outline: 'none',
  },
  btnGhost: {
    padding: '8px 16px', background: 'none',
    border: '1px solid #2A2A2A', borderRadius: 6,
    color: '#777', cursor: 'pointer', fontSize: 13,
  },
  btnRed: {
    padding: '8px 20px', background: '#E23A3A',
    border: 'none', borderRadius: 6,
    color: 'white', cursor: 'pointer',
    fontSize: 13, fontWeight: 700,
  },
}

// ── Login Modal ──────────────────────────────────────────────────────────
function LoginModal({ onLogin, onClose }) {
  const [pass, setPass] = useState('')
  const [err, setErr] = useState(false)

  const go = () => {
    if (pass === ADMIN_PASS) { onLogin() }
    else { setErr(true); setTimeout(() => setErr(false), 1500) }
  }

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔐</div>
          <h2 style={{ color: '#F0F0F0', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Acceso Coach</h2>
          <p style={{ fontSize: 12, color: '#555' }}>Ingresá la contraseña de administrador</p>
        </div>
        <input
          type="password" value={pass}
          onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go()}
          placeholder="Contraseña..."
          style={{ ...S.input, borderColor: err ? '#E23A3A' : '#2A2A2A', marginBottom: 6, transition: 'border-color 0.2s' }}
          autoFocus
        />
        {err && <p style={{ color: '#E23A3A', fontSize: 11, marginBottom: 10, textAlign: 'center' }}>Contraseña incorrecta</p>}
        {!err && <div style={{ marginBottom: 14 }} />}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ ...S.btnGhost, flex: 1 }}>Cancelar</button>
          <button onClick={go} style={{ ...S.btnRed, flex: 1 }}>Entrar</button>
        </div>
      </div>
    </div>
  )
}

// ── Block Modal ──────────────────────────────────────────────────────────
function BlockModal({ block, onSave, onClose }) {
  const [type, setType] = useState(block?.type || 'warmup')
  const [title, setTitle] = useState(block?.title || '')
  const [content, setContent] = useState(block?.content || '')

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ color: '#F0F0F0', fontSize: 14, fontWeight: 700 }}>
            {block?.id ? 'Editar bloque' : 'Nuevo bloque'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <span style={S.label}>Tipo de bloque</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
          {Object.entries(BTYPES).map(([k, v]) => (
            <button
              key={k} onClick={() => setType(k)}
              style={{
                padding: '5px 11px', borderRadius: 4, fontSize: 11,
                fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em',
                border: `1px solid ${k === type ? v.bg : '#2A2A2A'}`,
                background: k === type ? v.bg + '30' : 'none',
                color: k === type ? v.accent : '#555',
              }}
            >{v.label}</button>
          ))}
        </div>

        <span style={S.label}>Título</span>
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Ej: Back Squat 5×5 @80%"
          style={S.input}
        />

        <span style={S.label}>Contenido / Descripción</span>
        <textarea
          value={content} onChange={e => setContent(e.target.value)}
          rows={6}
          placeholder={'Detallá el ejercicio, series, reps, tiempo, notas...\n\nEj:\n5 rondas:\n- 10 Thrusters 40kg\n- 15 Pull-ups\n- 200m run'}
          style={{
            ...S.input, resize: 'vertical',
            lineHeight: 1.55, fontFamily: 'monospace', fontSize: 12,
          }}
        />

        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={S.btnGhost}>Cancelar</button>
          <button
            onClick={() => onSave({ id: block?.id || uid(), type, title, content })}
            style={S.btnRed}
          >
            {block?.id ? 'Guardar cambios' : 'Añadir bloque'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Block Pill ───────────────────────────────────────────────────────────
function BlockPill({ block, isAdmin, onEdit, onDel }) {
  const t = BTYPES[block.type] || BTYPES.wod
  return (
    <div style={{
      background: t.bg + '18', borderLeft: `3px solid ${t.bg}`,
      borderRadius: 4, padding: '7px 8px', marginBottom: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: t.accent }}>
            {t.label}
          </span>
          {block.title && (
            <div style={{ fontSize: 12, fontWeight: 600, color: '#E8E8E8', marginTop: 2, lineHeight: 1.3 }}>
              {block.title}
            </div>
          )}
          {block.content && (
            <div style={{ fontSize: 11, color: '#777', marginTop: 3, whiteSpace: 'pre-wrap', lineHeight: 1.45, wordBreak: 'break-word' }}>
              {block.content}
            </div>
          )}
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            <button onClick={() => onEdit(block)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 12, padding: '2px 3px' }}>✏</button>
            <button onClick={() => onDel(block.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 14, padding: '2px 3px', lineHeight: 1 }}>×</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Day Column ───────────────────────────────────────────────────────────
function DayCol({ dayKey, label, date, data, isAdmin, isToday, onUpdate, onAdd, onEdit, onDel }) {
  return (
    <div style={{
      background: isToday ? '#1A0A0A' : '#111',
      border: `1px solid ${isToday ? '#E23A3A' : '#1E1E1E'}`,
      borderRadius: 7, padding: '9px 8px',
      minWidth: 130, flex: 1,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ marginBottom: 7 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: 12, color: isToday ? '#E23A3A' : '#C0C0C0', letterSpacing: '0.07em' }}>
            {label}
          </span>
          <span style={{ fontSize: 10, color: '#3A3A3A' }}>{date}</span>
        </div>
        {isAdmin ? (
          <input
            value={data.focus || ''}
            onChange={e => onUpdate({ ...data, focus: e.target.value })}
            placeholder="foco del día..."
            style={{
              background: 'none', border: 'none',
              borderBottom: '1px solid #1E1E1E',
              color: '#666', fontSize: 9, width: '100%',
              marginTop: 4, padding: '2px 0', outline: 'none',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}
          />
        ) : data.focus ? (
          <div style={{ fontSize: 9, color: '#555', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {data.focus}
          </div>
        ) : null}
      </div>

      {isAdmin && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7, cursor: 'pointer' }}>
          <input
            type="checkbox" checked={!!data.isRest}
            onChange={e => onUpdate({ ...data, isRest: e.target.checked })}
            style={{ accentColor: '#E23A3A', width: 10, height: 10 }}
          />
          <span style={{ fontSize: 9, color: '#3A3A3A', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Descanso
          </span>
        </label>
      )}

      {data.isRest ? (
        <div style={{ textAlign: 'center', color: '#2A2A2A', fontSize: 10, padding: '20px 0', letterSpacing: '0.12em', flex: 1 }}>
          — DESCANSO —
        </div>
      ) : (
        <div style={{ flex: 1 }}>
          {(data.blocks || []).map(b => (
            <BlockPill key={b.id} block={b} isAdmin={isAdmin} onEdit={onEdit} onDel={onDel} />
          ))}
          {isAdmin && (
            <button
              onClick={onAdd}
              style={{
                width: '100%', background: 'none',
                border: '1px dashed #222', borderRadius: 4,
                color: '#333', fontSize: 10, padding: '6px 0',
                cursor: 'pointer', marginTop: 2, letterSpacing: '0.06em',
              }}
            >
              + BLOQUE
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── App Principal ────────────────────────────────────────────────────────
export default function App() {
  const today = new Date()
  const { year: ty, week: tw } = getISOWY(today)

  const [year, setYear] = useState(ty)
  const [week, setWeek] = useState(tw)
  const [wdata, setWdata] = useState(emptyW())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [addDay, setAddDay] = useState(null)
  const [editBlk, setEditBlk] = useState(null)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    loadWeek(year, week)
      .then(d => { setWdata(d || emptyW()); setLoading(false) })
      .catch(() => { setError('No se pudo conectar a la base de datos.'); setLoading(false) })
  }, [year, week])

  const persist = (data) => {
    clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      try {
        await saveWeek(year, week, data)
      } catch (e) {
        console.error('Error guardando:', e)
      } finally {
        setSaving(false)
      }
    }, 700)
  }

  const updDay = (dk, d) => {
    const nw = { ...wdata, days: { ...wdata.days, [dk]: d } }
    setWdata(nw); persist(nw)
  }

  const updTitle = (t) => {
    const nw = { ...wdata, title: t }
    setWdata(nw); persist(nw)
  }

  const saveBlock = (dk, block) => {
    const day = wdata.days[dk]
    const exists = day.blocks.some(b => b.id === block.id)
    const blocks = exists
      ? day.blocks.map(b => b.id === block.id ? block : b)
      : [...day.blocks, block]
    updDay(dk, { ...day, blocks })
    setAddDay(null); setEditBlk(null)
  }

  const delBlock = (dk, id) => {
    const day = wdata.days[dk]
    updDay(dk, { ...day, blocks: day.blocks.filter(b => b.id !== id) })
  }

  const nav = (dir) => {
    const m = getMon(year, week)
    const nm = new Date(m.getTime() + dir * 7 * 86400000)
    const { year: y, week: w } = getISOWY(nm)
    setYear(y); setWeek(w)
  }

  const monday = getMon(year, week)
  const sunday = new Date(monday.getTime() + 6 * 86400000)
  const totalBlocks = Object.values(wdata.days).reduce((a, d) => a + (d.blocks?.length || 0), 0)
  const totalSessions = Object.values(wdata.days).filter(d => !d.isRest).length

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {showLogin && <LoginModal onLogin={() => { setIsAdmin(true); setShowLogin(false) }} onClose={() => setShowLogin(false)} />}
      {addDay && <BlockModal block={null} onSave={b => saveBlock(addDay, b)} onClose={() => setAddDay(null)} />}
      {editBlk && <BlockModal block={editBlk.block} onSave={b => saveBlock(editBlk.dk, b)} onClose={() => setEditBlk(null)} />}

      {/* Header */}
      <div style={{ background: '#0F0F0F', borderBottom: '1px solid #1A1A1A', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#F0F0F0', letterSpacing: '0.08em' }}>⚡ CF PROGRAMACIÓN</div>
          <div style={{ fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Box Programming</div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <button onClick={() => nav(-1)} style={{ background: 'none', border: '1px solid #1E1E1E', borderRadius: 4, color: '#555', cursor: 'pointer', width: 28, height: 28, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#E23A3A', letterSpacing: '0.1em' }}>
              SEMANA {String(week).padStart(2, '0')}
            </div>
            <div style={{ fontSize: 9, color: '#3A3A3A', letterSpacing: '0.04em' }}>
              {fmtDate(monday)} — {fmtDate(sunday)} · {year}
            </div>
          </div>
          <button onClick={() => nav(1)} style={{ background: 'none', border: '1px solid #1E1E1E', borderRadius: 4, color: '#555', cursor: 'pointer', width: 28, height: 28, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          <button
            onClick={() => { setYear(ty); setWeek(tw) }}
            style={{ background: '#E23A3A18', border: '1px solid #E23A3A33', borderRadius: 4, color: '#E23A3A', cursor: 'pointer', fontSize: 9, padding: '3px 9px', fontWeight: 700, letterSpacing: '0.08em' }}
          >HOY</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {saving && <span style={{ fontSize: 9, color: '#3A3A3A', letterSpacing: '0.07em' }}>GUARDANDO...</span>}
          {isAdmin ? (
            <button onClick={() => setIsAdmin(false)} style={{ background: '#E23A3A', border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer', fontSize: 10, padding: '6px 12px', fontWeight: 800, letterSpacing: '0.07em' }}>
              ● ADMIN
            </button>
          ) : (
            <button onClick={() => setShowLogin(true)} style={{ background: 'none', border: '1px solid #1E1E1E', borderRadius: 6, color: '#3A3A3A', cursor: 'pointer', fontSize: 10, padding: '6px 12px', letterSpacing: '0.07em' }}>
              COACH
            </button>
          )}
        </div>
      </div>

      {/* Título de semana */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #141414', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        {isAdmin ? (
          <input
            value={wdata.title || ''} onChange={e => updTitle(e.target.value)}
            placeholder="Título de la semana (ej. MICRO 04 — INTENSIDAD)..."
            style={{ background: 'none', border: 'none', color: '#E0E0E0', fontSize: 17, fontWeight: 700, flex: 1, outline: 'none', letterSpacing: '0.02em' }}
          />
        ) : (
          <div style={{ fontSize: 17, fontWeight: 700, color: wdata.title ? '#E0E0E0' : '#222', letterSpacing: '0.02em' }}>
            {wdata.title || 'SIN TÍTULO'}
          </div>
        )}
        <div style={{ display: 'flex', gap: 14, flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: '#2A2A2A', letterSpacing: '0.08em' }}>SESIONES {totalSessions}/7</span>
          <span style={{ fontSize: 9, color: '#2A2A2A', letterSpacing: '0.08em' }}>BLOQUES {totalBlocks}</span>
        </div>
      </div>

      {/* Grid de días */}
      <div style={{ flex: 1, padding: '10px 10px', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#2A2A2A', letterSpacing: '0.12em', fontSize: 12 }}>
            CARGANDO PROGRAMACIÓN...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#E23A3A', fontSize: 13 }}>
            {error}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, minWidth: 900 }}>
            {DK.map((dk, i) => {
              const dt = new Date(monday.getTime() + i * 86400000)
              const isToday = dt.toDateString() === today.toDateString()
              const d = wdata.days[dk] || { focus: '', isRest: false, blocks: [] }
              return (
                <DayCol
                  key={dk} dayKey={dk} label={DL[i]} date={fmtDate(dt)}
                  data={d} isAdmin={isAdmin} isToday={isToday}
                  onUpdate={nd => updDay(dk, nd)}
                  onAdd={() => setAddDay(dk)}
                  onEdit={b => setEditBlk({ dk, block: b })}
                  onDel={id => delBlock(dk, id)}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '8px 16px', borderTop: '1px solid #141414', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {Object.entries(BTYPES).map(([k, v]) => (
            <span key={k} style={{ fontSize: 9, color: v.accent, letterSpacing: '0.06em' }}>● {v.label.toUpperCase()}</span>
          ))}
        </div>
        {isAdmin && <span style={{ fontSize: 9, color: '#E23A3A', letterSpacing: '0.08em' }}>MODO EDICIÓN ACTIVO</span>}
      </div>
    </div>
  )
}
