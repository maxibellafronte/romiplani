import { useState, useEffect } from 'react'
import { getAllProfiles, updateProfile, deleteUserFully, resetearPassword } from './supabase'

const ACCENT = '#31708E'
const TRACKS = ['Scaled', 'Advanced', 'RX']

const STATUS_COLORS = {
  pending:  { bg: '#F0E6D2', border: '#C8912E', color: '#8A6410', label: 'Pendiente' },
  active:   { bg: '#DDE8DE', border: '#4A9A6A', color: '#2A6844', label: 'Activo' },
  inactive: { bg: '#DEE5E8', border: '#AEB9C0', color: '#7A8FA0', label: 'Inactivo' },
}

export default function AthletesPanel() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // 'all' | 'pending' | 'active' | 'inactive'
  // Contraseña temporal recién generada: se muestra una sola vez, no se
  // guarda en ningún lado en claro.
  const [temporal, setTemporal] = useState(null) // { id, email, password }

  const load = async () => {
    setLoading(true)
    try {
      const data = await getAllProfiles()
      setProfiles(data || [])
    } catch(e) {
      setError('No se pudieron cargar los atletas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleUpdate = async (id, updates) => {
    try {
      await updateProfile(id, updates)
      setProfiles(prev => prev.map(p => p.id === id ? {...p, ...updates} : p))
    } catch(e) {
      alert('Error al actualizar: ' + e.message)
    }
  }

  const handleReset = async (id, email) => {
    if (!confirm(`¿Generar una contraseña temporal para ${email}?\n\nLa actual deja de funcionar, y al entrar se le va a pedir que elija una nueva.`)) return
    try {
      const { password } = await resetearPassword(id)
      setTemporal({ id, email, password })
      setProfiles(prev => prev.map(p => p.id === id ? {...p, must_change_password:true} : p))
    } catch(e) {
      alert('Error al resetear la contraseña: ' + e.message)
    }
  }

  const handleDelete = async (id, email) => {
    if (!confirm(`¿Eliminar la cuenta de ${email}? Esta acción no se puede deshacer.`)) return
    try {
      await deleteUserFully(id)
      setProfiles(prev => prev.filter(p => p.id !== id))
    } catch(e) {
      alert('Error al eliminar: ' + e.message)
    }
  }

  const filtered = profiles.filter(p => filter === 'all' ? true : p.status === filter)
  const counts = {
    all: profiles.length,
    pending: profiles.filter(p => p.status === 'pending').length,
    active: profiles.filter(p => p.status === 'active').length,
    inactive: profiles.filter(p => p.status === 'inactive').length,
  }

  const filterBtnStyle = (f) => ({
    padding: '6px 14px',
    background: filter === f ? ACCENT+'22' : 'none',
    border: `1px solid ${filter === f ? ACCENT : '#AEB9C0'}`,
    borderRadius: 6, color: filter === f ? ACCENT : '#7A8FA0',
    cursor: 'pointer', fontSize: 11, fontWeight: 600,
  })

  if (loading) return (
    <div style={{padding:40,textAlign:'center',color:'#AEB9C0',letterSpacing:'0.1em',fontSize:12}}>
      CARGANDO ATLETAS...
    </div>
  )

  if (error) return (
    <div style={{padding:24,textAlign:'center',color:ACCENT,fontSize:13}}>{error}</div>
  )

  return (
    <div style={{padding:16}}>

      {temporal && (
        <div style={{marginBottom:16,padding:'14px 16px',background:'#E4EDF2',border:`1px solid ${ACCENT}`,borderRadius:10}}>
          <div style={{fontSize:12,fontWeight:800,color:'#1F3A4A',marginBottom:8}}>
            🔑 Contraseña temporal para {temporal.email}
          </div>
          <div style={{fontSize:22,fontWeight:800,color:ACCENT,letterSpacing:'0.06em',
            background:'#EEF2F0',border:'1px solid #C4CDD4',borderRadius:8,
            padding:'12px 14px',textAlign:'center',marginBottom:10,userSelect:'all'}}>
            {temporal.password}
          </div>
          <p style={{fontSize:12,color:'#5A7286',lineHeight:1.5,marginBottom:12}}>
            Pasásela y cerrá este aviso. <strong>No se vuelve a mostrar.</strong> Cuando
            entre con ella, la app le va a pedir que elija una nueva; a partir de ahí
            solo la sabe ella.
          </p>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>{navigator.clipboard?.writeText(temporal.password)}}
              style={{flex:1,padding:'8px 12px',background:ACCENT,border:'none',borderRadius:7,
                color:'white',cursor:'pointer',fontSize:12,fontWeight:700}}>
              Copiar
            </button>
            <button onClick={()=>setTemporal(null)}
              style={{flex:1,padding:'8px 12px',background:'none',border:'1px solid #AEB9C0',
                borderRadius:7,color:'#7A8FA0',cursor:'pointer',fontSize:12}}>
              Listo
            </button>
          </div>
        </div>
      )}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:'#31708E',letterSpacing:'0.1em',textTransform:'uppercase'}}>
          👥 Gestión de Atletas
        </div>
        <button onClick={load} style={{background:'none',border:'1px solid #AEB9C0',borderRadius:6,color:'#7A8FA0',cursor:'pointer',fontSize:11,padding:'5px 10px'}}>
          ↻ Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
        {[['all','Todos'],['pending','Pendientes'],['active','Activos'],['inactive','Inactivos']].map(([f,l]) => (
          <button key={f} onClick={()=>setFilter(f)} style={filterBtnStyle(f)}>
            {l} <span style={{opacity:0.6}}>({counts[f]})</span>
          </button>
        ))}
      </div>

      {/* Alerta pendientes */}
      {counts.pending > 0 && (
        <div style={{background:'#F0E6D2',border:'1px solid #C8912E',borderRadius:8,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:16}}>⚠️</span>
          <span style={{fontSize:12,color:'#8A6410'}}>
            {counts.pending} atleta{counts.pending>1?'s':''} esperando aprobación
          </span>
        </div>
      )}

      {/* Lista */}
      {!filtered.length ? (
        <div style={{textAlign:'center',color:'#C4CDD4',padding:'30px 0',fontSize:12,letterSpacing:'0.1em'}}>
          — SIN ATLETAS EN ESTA CATEGORÍA —
        </div>
      ) : (
        filtered.map(p => {
          const sc = STATUS_COLORS[p.status] || STATUS_COLORS.inactive
          return (
            <div key={p.id} style={{background:'#EEF2F0',border:`1px solid ${p.status==='pending'?'#C8912E':'#C4CDD4'}`,borderRadius:8,padding:'12px 14px',marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>

                {/* Info */}
                <div style={{minWidth:0}}>
                  <div style={{fontWeight:700,color:'#1F3A4A',fontSize:14,marginBottom:3}}>
                    {p.full_name || '(sin nombre)'}
                  </div>
                  <div style={{fontSize:11,color:'#7A8FA0',marginBottom:6}}>{p.email}</div>
                  <div style={{display:'inline-flex',alignItems:'center',gap:4,background:sc.bg,border:`1px solid ${sc.border}`,borderRadius:5,padding:'2px 8px'}}>
                    <span style={{fontSize:10,color:sc.color,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em'}}>{sc.label}</span>
                  </div>
                </div>

                {/* Controles */}
                <div style={{display:'flex',flexDirection:'column',gap:8,flexShrink:0}}>

                  {/* Track selector */}
                  <div style={{display:'flex',gap:4}}>
                    {TRACKS.map(t => (
                      <button key={t} onClick={()=>handleUpdate(p.id,{track:t})}
                        style={{
                          padding:'4px 10px',fontSize:10,fontWeight:700,cursor:'pointer',borderRadius:5,
                          background: p.track===t ? '#31708E40' : 'none',
                          border: `1px solid ${p.track===t ? '#31708E' : '#AEB9C0'}`,
                          color: p.track===t ? '#245166' : '#8A98A2',
                        }}>
                        {t}
                      </button>
                    ))}
                    {p.track && (
                      <button onClick={()=>handleUpdate(p.id,{track:null})}
                        style={{padding:'4px 8px',fontSize:10,cursor:'pointer',borderRadius:5,background:'none',border:'1px solid #C4CDD4',color:'#AEB9C0'}}>
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Status buttons */}
                  <div style={{display:'flex',gap:4}}>
                    {p.status !== 'active' && (
                      <button onClick={()=>handleUpdate(p.id,{status:'active'})}
                        style={{flex:1,padding:'6px 10px',background:'#DDE8DE',border:'1px solid #4A9A6A',borderRadius:6,color:'#2A6844',cursor:'pointer',fontSize:11,fontWeight:700}}>
                        ✓ Activar
                      </button>
                    )}
                    {p.status !== 'inactive' && (
                      <button onClick={()=>handleUpdate(p.id,{status:'inactive'})}
                        style={{flex:1,padding:'6px 10px',background:'none',border:'1px solid #AEB9C0',borderRadius:6,color:'#7A8FA0',cursor:'pointer',fontSize:11}}>
                        Desactivar
                      </button>
                    )}
                    <button onClick={()=>handleReset(p.id,p.email)} title="Generar contraseña temporal"
                      style={{padding:'6px 10px',background:'none',border:'1px solid #AEB9C0',borderRadius:6,color:'#7A8FA0',cursor:'pointer',fontSize:11}}>
                      🔑
                    </button>
                    <button onClick={()=>handleDelete(p.id,p.email)}
                      style={{padding:'6px 10px',background:'#EDDBDB',border:'1px solid #C25454',borderRadius:6,color:'#A33A3A',cursor:'pointer',fontSize:11}}>
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
