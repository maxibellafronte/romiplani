import { useState, useEffect } from 'react'
import { getRMDeAtletas, getAllProfiles } from './supabase'
import { ETIQUETAS, ORDEN, fmtKg } from './movimientos'

const ACCENT = '#31708E'

// Diferencia contra la marca anterior del mismo movimiento. La guarda la
// base (columna previous_weight_kg) cada vez que el atleta pisa su RM, así
// que sobrevive a la sesión: no se calcula en el navegador.
function Delta({ actual, anterior }) {
  if (anterior == null) return null
  const d = Math.round((Number(actual) - Number(anterior)) * 100) / 100
  if (!isFinite(d) || d === 0) return null
  const subio = d > 0
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, flexShrink: 0,
      color: subio ? '#4A7A64' : '#AEB9C0',
    }}>
      {subio ? '+' : '−'}{fmtKg(Math.abs(d))}
    </span>
  )
}

export default function RMAtletasPanel() {
  const [atletas, setAtletas] = useState([])   // [{ id, nombre, records: [] }]
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [abierto, setAbierto] = useState(null) // id del atleta desplegado
  const [busqueda, setBusqueda] = useState('')

  const cargar = async () => {
    setLoading(true); setError(null)
    try {
      // Los RM los devuelve RLS: un perfil con role='admin' ve los de todos.
      const [records, perfiles] = await Promise.all([getRMDeAtletas(), getAllProfiles()])
      const nombres = Object.fromEntries((perfiles || []).map(p => [p.id, p.full_name || p.email]))

      const porAtleta = new Map()
      for (const r of records) {
        if (!porAtleta.has(r.user_id)) {
          porAtleta.set(r.user_id, {
            id: r.user_id,
            // El nombre del perfil manda: el user_name de la fila es el que
            // tenía el atleta cuando cargó el RM y puede haber cambiado.
            nombre: nombres[r.user_id] || r.user_name || 'Atleta',
            records: [],
          })
        }
        porAtleta.get(r.user_id).records.push(r)
      }

      const lista = [...porAtleta.values()]
      for (const a of lista) {
        a.records.sort((x, y) => (ORDEN[x.movement] ?? 999) - (ORDEN[y.movement] ?? 999))
      }
      lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      setAtletas(lista)
    } catch (e) {
      console.error('Error cargando RM de atletas:', e)
      setError('No se pudieron cargar los RM.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const filtrados = busqueda.trim()
    ? atletas.filter(a => a.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()))
    : atletas

  return (
    <div style={{ padding: '14px 12px', maxWidth: 720, margin: '0 auto' }}>

      {/* Encabezado */}
      <div style={{ background: '#EEF2F0', border: '1px solid #AEB9C0', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: ACCENT, letterSpacing: '0.08em' }}>🏋️ RM ATLETAS</div>
            <div style={{ fontSize: 11, color: '#7A8FA0', marginTop: 3 }}>Pesos máximos cargados por cada atleta</div>
          </div>
          <span style={{ fontSize: 11, color: '#7A8FA0', fontWeight: 700, flexShrink: 0 }}>
            {atletas.length} {atletas.length === 1 ? 'atleta' : 'atletas'}
          </span>
        </div>
        {atletas.length > 4 && (
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar atleta..."
            style={{ marginTop: 10, width: '100%', boxSizing: 'border-box', background: '#E2E8EA', border: '1px solid #AEB9C0', borderRadius: 7, color: '#1F3A4A', padding: '8px 11px', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
          />
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: '#AEB9C0', fontSize: 12, letterSpacing: '0.12em' }}>CARGANDO RM...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 40, color: ACCENT, fontSize: 13 }}>{error}</div>
      ) : atletas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#C4CDD4', fontSize: 11, letterSpacing: '0.1em' }}>
          — TODAVÍA NADIE CARGÓ RM —
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#C4CDD4', fontSize: 11, letterSpacing: '0.1em' }}>
          — SIN RESULTADOS —
        </div>
      ) : (
        <div style={{ background: '#EEF2F0', border: '1px solid #AEB9C0', borderRadius: 10, overflow: 'hidden' }}>
          {filtrados.map((a, i) => {
            const desplegado = abierto === a.id
            const borde = i < filtrados.length - 1 ? '1px solid #C4CDD4' : 'none'
            const mejoras = a.records.filter(r => r.previous_weight_kg != null && Number(r.weight_kg) > Number(r.previous_weight_kg)).length

            return (
              <div key={a.id} style={{ borderBottom: borde }}>
                <div onClick={() => setAbierto(desplegado ? null : a.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: 'pointer', background: desplegado ? '#E2E8EA' : 'transparent' }}>
                  <span style={{ fontSize: 11, color: '#AEB9C0', width: 12, flexShrink: 0 }}>{desplegado ? '▾' : '▸'}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: '#1F3A4A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.nombre}
                  </span>
                  {mejoras > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#4A7A64', flexShrink: 0 }}>
                      ↑{mejoras}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: '#7A8FA0', flexShrink: 0 }}>
                    {a.records.length} {a.records.length === 1 ? 'RM' : 'RM'}
                  </span>
                </div>

                {desplegado && (
                  <div style={{ padding: '2px 14px 10px 36px' }}>
                    {a.records.map(r => (
                      <div key={r.movement} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid #E2E8EA' }}>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: '#5A7286', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ETIQUETAS[r.movement] || r.movement}
                        </span>
                        <Delta actual={r.weight_kg} anterior={r.previous_weight_kg} />
                        <span style={{ fontSize: 13, fontWeight: 800, color: ACCENT, flexShrink: 0, minWidth: 58, textAlign: 'right' }}>
                          {fmtKg(r.weight_kg)} kg
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
