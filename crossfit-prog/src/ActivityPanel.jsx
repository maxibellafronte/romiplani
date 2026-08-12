import { useState, useEffect } from 'react'
import { supabaseAdmin } from './supabase'

const ACCENT = '#679F9E'

function fmtDate(d) {
  const date = new Date(d)
  return date.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' })
}

function fmtTime(d) {
  const date = new Date(d)
  return date.toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' })
}

function fmtDateKey(d) {
  const date = new Date(d)
  return date.toISOString().split('T')[0]
}

export default function ActivityPanel() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [view, setView] = useState('summary') // 'summary' | 'detail'
  const [selectedUser, setSelectedUser] = useState(null)
  const [dateRange, setDateRange] = useState(30) // días

  const load = async () => {
    setLoading(true)
    try {
      const since = new Date()
      since.setDate(since.getDate() - dateRange)
      const { data, error } = await supabaseAdmin
        .from('login_logs')
        .select('*')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
      if (error) throw error
      setLogs(data || [])
    } catch(e) {
      setError('No se pudieron cargar los logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [dateRange])

  // Agrupar por usuario
  const byUser = logs.reduce((acc, log) => {
    const key = log.user_id
    if (!acc[key]) acc[key] = { user_name: log.user_name, email: log.email, logs: [] }
    acc[key].logs.push(log)
    return acc
  }, {})

  // Agrupar por día para el resumen
  const byDay = logs.reduce((acc, log) => {
    const day = fmtDateKey(log.created_at)
    if (!acc[day]) acc[day] = []
    acc[day].push(log)
    return acc
  }, {})

  const sortedDays = Object.keys(byDay).sort((a,b) => b.localeCompare(a))
  const sortedUsers = Object.entries(byUser).sort((a,b) => b[1].logs.length - a[1].logs.length)

  const userDetail = selectedUser ? byUser[selectedUser] : null

  const tabStyle = (t) => ({
    padding: '6px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 6,
    background: view === t ? ACCENT+'22' : 'none',
    border: `1px solid ${view === t ? ACCENT : '#1E3530'}`,
    color: view === t ? ACCENT : '#3A6058',
  })

  const rangeBtnStyle = (d) => ({
    padding: '4px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer', borderRadius: 5,
    background: dateRange === d ? '#2A4A4422' : 'none',
    border: `1px solid ${dateRange === d ? '#2A4A44' : '#1E3530'}`,
    color: dateRange === d ? '#A8D5D4' : '#3A6058',
  })

  if (loading) return (
    <div style={{padding:40,textAlign:'center',color:'#2A4A44',letterSpacing:'0.1em',fontSize:12}}>CARGANDO ACTIVIDAD...</div>
  )

  if (error) return (
    <div style={{padding:24,textAlign:'center',color:'#FCA5A5',fontSize:13}}>{error}</div>
  )

  return (
    <div style={{padding:16}}>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <div style={{fontSize:11,fontWeight:700,color:'#A8D5D4',letterSpacing:'0.1em',textTransform:'uppercase'}}>
          📈 Actividad de Atletas
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <span style={{fontSize:10,color:'#2A4A44'}}>Últimos:</span>
          {[7,15,30,60].map(d => (
            <button key={d} onClick={()=>setDateRange(d)} style={rangeBtnStyle(d)}>{d}d</button>
          ))}
          <button onClick={load} style={{background:'none',border:'1px solid #1E3530',borderRadius:6,color:'#3A6058',cursor:'pointer',fontSize:11,padding:'4px 10px',marginLeft:4}}>↻</button>
        </div>
      </div>

      {/* Stats rápidas */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {[
          {label:'Total accesos', value:logs.length},
          {label:'Atletas únicos', value:Object.keys(byUser).length},
          {label:'Días con actividad', value:Object.keys(byDay).length},
          {label:'Promedio diario', value: Object.keys(byDay).length ? Math.round(logs.length/Object.keys(byDay).length) : 0},
        ].map(s => (
          <div key={s.label} style={{flex:1,minWidth:100,background:'#0E1210',border:'1px solid #1E3530',borderRadius:8,padding:'10px 12px',textAlign:'center'}}>
            <div style={{fontSize:20,fontWeight:900,color:ACCENT}}>{s.value}</div>
            <div style={{fontSize:9,color:'#3A6058',textTransform:'uppercase',letterSpacing:'0.07em',marginTop:3}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:6,marginBottom:14}}>
        <button onClick={()=>{setView('summary');setSelectedUser(null)}} style={tabStyle('summary')}>📅 Por día</button>
        <button onClick={()=>{setView('users');setSelectedUser(null)}} style={tabStyle('users')}>👥 Por atleta</button>
        {selectedUser && <button onClick={()=>{setView('detail')}} style={tabStyle('detail')}>🔍 Detalle</button>}
      </div>

      {/* Vista por día */}
      {view === 'summary' && (
        <div>
          {sortedDays.length === 0 ? (
            <div style={{textAlign:'center',color:'#1E3530',padding:'30px 0',fontSize:12,letterSpacing:'0.1em'}}>— SIN ACTIVIDAD EN ESTE PERÍODO —</div>
          ) : sortedDays.map(day => {
            const dayLogs = byDay[day]
            const uniqueUsers = [...new Set(dayLogs.map(l => l.user_id))].length
            return (
              <div key={day} style={{background:'#0E1210',border:'1px solid #1A2820',borderRadius:8,padding:'10px 14px',marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <span style={{fontSize:13,fontWeight:700,color:'#D4EDE8'}}>{fmtDate(day)}</span>
                  <div style={{display:'flex',gap:12}}>
                    <span style={{fontSize:11,color:ACCENT,fontWeight:600}}>{dayLogs.length} accesos</span>
                    <span style={{fontSize:11,color:'#4A7A70'}}>{uniqueUsers} atleta{uniqueUsers!==1?'s':''}</span>
                  </div>
                </div>
                {/* Usuarios que entraron ese día */}
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {[...new Set(dayLogs.map(l=>l.user_id))].map(uid => {
                    const userLogs = dayLogs.filter(l=>l.user_id===uid)
                    const name = userLogs[0].user_name || userLogs[0].email
                    return (
                      <div key={uid}
                        onClick={()=>{setSelectedUser(uid);setView('detail')}}
                        style={{background:'#1A2820',border:'1px solid #2A4A44',borderRadius:5,padding:'3px 9px',cursor:'pointer'}}>
                        <span style={{fontSize:11,color:'#7AADA0'}}>{name}</span>
                        {userLogs.length > 1 && <span style={{fontSize:10,color:'#4A7A70',marginLeft:5}}>×{userLogs.length}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Vista por atleta */}
      {view === 'users' && (
        <div>
          {sortedUsers.length === 0 ? (
            <div style={{textAlign:'center',color:'#1E3530',padding:'30px 0',fontSize:12,letterSpacing:'0.1em'}}>— SIN ACTIVIDAD EN ESTE PERÍODO —</div>
          ) : sortedUsers.map(([uid, data]) => {
            const lastLog = data.logs[0]
            const daysActive = new Set(data.logs.map(l=>fmtDateKey(l.created_at))).size
            return (
              <div key={uid}
                onClick={()=>{setSelectedUser(uid);setView('detail')}}
                style={{background:'#0E1210',border:'1px solid #1A2820',borderRadius:8,padding:'11px 14px',marginBottom:8,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#D4EDE8',marginBottom:2}}>{data.user_name || data.email}</div>
                  <div style={{fontSize:11,color:'#3A6058'}}>{data.email}</div>
                </div>
                <div style={{display:'flex',gap:16,flexShrink:0,textAlign:'center'}}>
                  <div>
                    <div style={{fontSize:16,fontWeight:800,color:ACCENT}}>{data.logs.length}</div>
                    <div style={{fontSize:9,color:'#2A4A44',textTransform:'uppercase',letterSpacing:'0.06em'}}>accesos</div>
                  </div>
                  <div>
                    <div style={{fontSize:16,fontWeight:800,color:'#7AADA0'}}>{daysActive}</div>
                    <div style={{fontSize:9,color:'#2A4A44',textTransform:'uppercase',letterSpacing:'0.06em'}}>días</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:11,color:'#4A7A70'}}>{fmtDate(lastLog.created_at)}</div>
                    <div style={{fontSize:9,color:'#2A4A44'}}>último acceso</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Vista detalle atleta */}
      {view === 'detail' && userDetail && (
        <div>
          <div style={{background:'#0E1210',border:'1px solid #2A4A44',borderRadius:8,padding:'12px 14px',marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:'#D4EDE8',marginBottom:2}}>{userDetail.user_name || userDetail.email}</div>
            <div style={{fontSize:11,color:'#3A6058'}}>{userDetail.email}</div>
            <div style={{display:'flex',gap:16,marginTop:10}}>
              <span style={{fontSize:12,color:ACCENT,fontWeight:600}}>{userDetail.logs.length} accesos totales</span>
              <span style={{fontSize:12,color:'#4A7A70'}}>{new Set(userDetail.logs.map(l=>fmtDateKey(l.created_at))).size} días distintos</span>
            </div>
          </div>

          {/* Historial por día */}
          {Object.entries(
            userDetail.logs.reduce((acc,log)=>{
              const day=fmtDateKey(log.created_at)
              if(!acc[day])acc[day]=[]
              acc[day].push(log)
              return acc
            },{})).sort((a,b)=>b[0].localeCompare(a[0])).map(([day,dayLogs])=>(
            <div key={day} style={{background:'#0E1210',border:'1px solid #1A2820',borderRadius:8,padding:'10px 14px',marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:dayLogs.length>1?8:0}}>
                <span style={{fontSize:12,fontWeight:600,color:'#D4EDE8'}}>{fmtDate(day)}</span>
                <span style={{fontSize:11,color:ACCENT,fontWeight:600}}>{dayLogs.length} {dayLogs.length===1?'acceso':'accesos'}</span>
              </div>
              {dayLogs.length > 1 && (
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {dayLogs.map(log=>(
                    <span key={log.id} style={{fontSize:11,color:'#4A7A70',background:'#1A2820',padding:'2px 8px',borderRadius:4}}>{fmtTime(log.created_at)}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
