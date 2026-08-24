import { useState, useEffect } from 'react'
import { supabaseAdmin } from './supabase'

const ACCENT = '#31708E'

function fmtDate(d) {
  return new Date(d).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' })
}
function fmtTime(d) {
  return new Date(d).toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' })
}
function fmtDateKey(d) {
  return new Date(d).toISOString().split('T')[0]
}

export default function ActivityPanel() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [view, setView] = useState('summary')
  const [selectedUser, setSelectedUser] = useState(null)
  const [dateRange, setDateRange] = useState(30)

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

  const byUser = logs.reduce((acc, log) => {
    const key = log.user_id
    if (!acc[key]) acc[key] = { user_name: log.user_name, email: log.email, logs: [] }
    acc[key].logs.push(log)
    return acc
  }, {})

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
    background: view === t ? '#D6E0E4' : 'none',
    border: `1px solid ${view === t ? ACCENT : '#C4CDD4'}`,
    color: view === t ? ACCENT : '#8A98A2',
  })

  const rangeBtnStyle = (d) => ({
    padding: '4px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer', borderRadius: 5,
    background: dateRange === d ? '#D6E0E4' : 'none',
    border: `1px solid ${dateRange === d ? '#AEB9C0' : '#C4CDD4'}`,
    color: dateRange === d ? '#245166' : '#8A98A2',
  })

  if (loading) return (
    <div style={{padding:40,textAlign:'center',color:'#9AA6AE',letterSpacing:'0.1em',fontSize:12}}>CARGANDO ACTIVIDAD...</div>
  )
  if (error) return (
    <div style={{padding:24,textAlign:'center',color:'#A33A3A',fontSize:13}}>{error}</div>
  )

  return (
    <div style={{padding:16}}>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <div style={{fontSize:11,fontWeight:700,color:'#245166',letterSpacing:'0.1em',textTransform:'uppercase'}}>
          📈 Actividad de Atletas
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <span style={{fontSize:10,color:'#8A98A2'}}>Últimos:</span>
          {[7,15,30,60].map(d => (
            <button key={d} onClick={()=>setDateRange(d)} style={rangeBtnStyle(d)}>{d}d</button>
          ))}
          <button onClick={load} style={{background:'none',border:'1px solid #C4CDD4',borderRadius:6,color:'#8A98A2',cursor:'pointer',fontSize:11,padding:'4px 10px',marginLeft:4}}>↻</button>
        </div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {[
          {label:'Total accesos', value:logs.length},
          {label:'Atletas únicos', value:Object.keys(byUser).length},
          {label:'Días con actividad', value:Object.keys(byDay).length},
          {label:'Promedio diario', value: Object.keys(byDay).length ? Math.round(logs.length/Object.keys(byDay).length) : 0},
        ].map(s => (
          <div key={s.label} style={{flex:1,minWidth:100,background:'#EEF2F0',border:'1px solid #C4CDD4',borderRadius:8,padding:'10px 12px',textAlign:'center'}}>
            <div style={{fontSize:20,fontWeight:900,color:ACCENT}}>{s.value}</div>
            <div style={{fontSize:9,color:'#8A98A2',textTransform:'uppercase',letterSpacing:'0.07em',marginTop:3}}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:6,marginBottom:14}}>
        <button onClick={()=>{setView('summary');setSelectedUser(null)}} style={tabStyle('summary')}>📅 Por día</button>
        <button onClick={()=>{setView('users');setSelectedUser(null)}} style={tabStyle('users')}>👥 Por atleta</button>
        {selectedUser && <button onClick={()=>setView('detail')} style={tabStyle('detail')}>🔍 Detalle</button>}
      </div>

      {view === 'summary' && (
        <div>
          {sortedDays.length === 0 ? (
            <div style={{textAlign:'center',color:'#9AA6AE',padding:'30px 0',fontSize:12,letterSpacing:'0.1em'}}>— SIN ACTIVIDAD EN ESTE PERÍODO —</div>
          ) : sortedDays.map(day => {
            const dayLogs = byDay[day]
            const uniqueUsers = [...new Set(dayLogs.map(l => l.user_id))].length
            return (
              <div key={day} style={{background:'#EEF2F0',border:'1px solid #C4CDD4',borderRadius:8,padding:'10px 14px',marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <span style={{fontSize:13,fontWeight:700,color:'#1F3A4A'}}>{fmtDate(day)}</span>
                  <div style={{display:'flex',gap:12}}>
                    <span style={{fontSize:11,color:ACCENT,fontWeight:600}}>{dayLogs.length} accesos</span>
                    <span style={{fontSize:11,color:'#7A8FA0'}}>{uniqueUsers} atleta{uniqueUsers!==1?'s':''}</span>
                  </div>
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {[...new Set(dayLogs.map(l=>l.user_id))].map(uid => {
                    const userLogs = dayLogs.filter(l=>l.user_id===uid)
                    const name = userLogs[0].user_name || userLogs[0].email
                    return (
                      <div key={uid}
                        onClick={()=>{setSelectedUser(uid);setView('detail')}}
                        style={{background:'#DEE5E8',border:'1px solid #C4CDD4',borderRadius:5,padding:'3px 9px',cursor:'pointer'}}>
                        <span style={{fontSize:11,color:'#5A7286'}}>{name}</span>
                        {userLogs.length > 1 && <span style={{fontSize:10,color:'#8A98A2',marginLeft:5}}>×{userLogs.length}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view === 'users' && (
        <div>
          {sortedUsers.length === 0 ? (
            <div style={{textAlign:'center',color:'#9AA6AE',padding:'30px 0',fontSize:12,letterSpacing:'0.1em'}}>— SIN ACTIVIDAD EN ESTE PERÍODO —</div>
          ) : sortedUsers.map(([uid, data]) => {
            const lastLog = data.logs[0]
            const daysActive = new Set(data.logs.map(l=>fmtDateKey(l.created_at))).size
            return (
              <div key={uid}
                onClick={()=>{setSelectedUser(uid);setView('detail')}}
                style={{background:'#EEF2F0',border:'1px solid #C4CDD4',borderRadius:8,padding:'11px 14px',marginBottom:8,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#1F3A4A',marginBottom:2}}>{data.user_name || data.email}</div>
                  <div style={{fontSize:11,color:'#8A98A2'}}>{data.email}</div>
                </div>
                <div style={{display:'flex',gap:16,flexShrink:0,textAlign:'center'}}>
                  <div>
                    <div style={{fontSize:16,fontWeight:800,color:ACCENT}}>{data.logs.length}</div>
                    <div style={{fontSize:9,color:'#9AA6AE',textTransform:'uppercase',letterSpacing:'0.06em'}}>accesos</div>
                  </div>
                  <div>
                    <div style={{fontSize:16,fontWeight:800,color:'#5A7286'}}>{daysActive}</div>
                    <div style={{fontSize:9,color:'#9AA6AE',textTransform:'uppercase',letterSpacing:'0.06em'}}>días</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:11,color:'#7A8FA0'}}>{fmtDate(lastLog.created_at)}</div>
                    <div style={{fontSize:9,color:'#9AA6AE'}}>último acceso</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view === 'detail' && userDetail && (
        <div>
          <div style={{background:'#EEF2F0',border:'1px solid #AEB9C0',borderRadius:8,padding:'12px 14px',marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:'#1F3A4A',marginBottom:2}}>{userDetail.user_name || userDetail.email}</div>
            <div style={{fontSize:11,color:'#8A98A2'}}>{userDetail.email}</div>
            <div style={{display:'flex',gap:16,marginTop:10}}>
              <span style={{fontSize:12,color:ACCENT,fontWeight:600}}>{userDetail.logs.length} accesos totales</span>
              <span style={{fontSize:12,color:'#7A8FA0'}}>{new Set(userDetail.logs.map(l=>fmtDateKey(l.created_at))).size} días distintos</span>
            </div>
          </div>

          {Object.entries(
            userDetail.logs.reduce((acc,log)=>{
              const day=fmtDateKey(log.created_at)
              if(!acc[day])acc[day]=[]
              acc[day].push(log)
              return acc
            },{})).sort((a,b)=>b[0].localeCompare(a[0])).map(([day,dayLogs])=>(
            <div key={day} style={{background:'#EEF2F0',border:'1px solid #C4CDD4',borderRadius:8,padding:'10px 14px',marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:dayLogs.length>1?8:0}}>
                <span style={{fontSize:12,fontWeight:600,color:'#1F3A4A'}}>{fmtDate(day)}</span>
                <span style={{fontSize:11,color:ACCENT,fontWeight:600}}>{dayLogs.length} {dayLogs.length===1?'acceso':'accesos'}</span>
              </div>
              {dayLogs.length > 1 && (
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {dayLogs.map(log=>(
                    <span key={log.id} style={{fontSize:11,color:'#7A8FA0',background:'#DEE5E8',padding:'2px 8px',borderRadius:4}}>{fmtTime(log.created_at)}</span>
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
