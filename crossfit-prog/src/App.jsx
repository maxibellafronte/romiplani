import { useState, useEffect, useRef } from 'react'
import { supabase, loadWeek, saveWeek, getProfile, signOut } from './supabase'
import AuthScreen from './AuthScreen'
import PendingScreen from './PendingScreen'
import AthletesPanel from './AthletesPanel'

const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASSWORD || 'coach2026'
const ACCENT = '#EC4899'

const BTYPES = {
  warmup:    { label: 'Warm-up',              bg: '#9F1239', accent: '#FDA4AF' },
  strength:  { label: 'Strength',             bg: '#BE185D', accent: '#F9A8D4' },
  barbell:   { label: 'Barbell Conditioning', bg: '#9D174D', accent: '#FBCFE8' },
  metcon:    { label: 'Metcon',               bg: '#7E22CE', accent: '#E9D5FF' },
  wod:       { label: 'WOD',                  bg: '#86198F', accent: '#F0ABFC' },
  skill:     { label: 'Skills',               bg: '#5B21B6', accent: '#DDD6FE' },
  accessory: { label: 'Accessory',            bg: '#1E3A5F', accent: '#93C5FD' },
}

const DL = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
const DK = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']
const TRACKS = ['Scaled', 'Advanced', 'RX']

function getMon(year, week) {
  const j4 = new Date(year, 0, 4)
  const mon = new Date(j4)
  mon.setDate(j4.getDate() - (j4.getDay() + 6) % 7 + (week - 1) * 7)
  return mon
}
function getISOWY(date) {
  const d = new Date(date); d.setHours(0,0,0,0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const w1 = new Date(d.getFullYear(), 0, 4)
  const week = 1 + Math.round(((d - w1) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7)
  return { year: d.getFullYear(), week }
}
function fmtDate(d) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
}
function fmtDateLong(d) {
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]}`
}
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }
function emptyW() {
  const days = {}
  DK.forEach(k => { days[k] = { focus: '', isRest: false, blocks: [] } })
  return { title: '', days }
}
function useIsMobile() {
  const [m, setM] = useState(window.innerWidth < 768)
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return m
}

const S = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { background:'#1A0E16', border:'1px solid #3D1A2E', borderRadius:12, padding:22, width:'min(440px,94vw)', maxHeight:'90vh', overflowY:'auto' },
  label: { fontSize:10, color:'#6B3A55', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginTop:14 },
  input: { display:'block', width:'100%', background:'#110810', border:'1px solid #3D1A2E', borderRadius:8, color:'#F5D0E8', padding:'10px 12px', fontSize:13, outline:'none', marginTop:5 },
  btnGhost: { padding:'10px 16px', background:'none', border:'1px solid #3D1A2E', borderRadius:8, color:'#6B3A55', cursor:'pointer', fontSize:13 },
  btnPink: { padding:'10px 20px', background:ACCENT, border:'none', borderRadius:8, color:'white', cursor:'pointer', fontSize:13, fontWeight:700 },
}

// ── Login Admin Modal ─────────────────────────────────────
function LoginModal({ onLogin, onClose }) {
  const [pass, setPass] = useState('')
  const [err, setErr] = useState(false)
  const go = () => { if (pass === ADMIN_PASS) onLogin(); else { setErr(true); setTimeout(()=>setErr(false),1500) } }
  return (
    <div style={S.overlay} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <span style={{fontWeight:700,fontSize:14,color:'#F5D0E8'}}>Acceso Coach</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:'#6B3A55',fontSize:22,cursor:'pointer'}}>×</button>
        </div>
        <div style={{textAlign:'center',marginBottom:18}}>
          <div style={{fontSize:34,marginBottom:8}}>🔐</div>
          <p style={{fontSize:12,color:'#6B3A55'}}>Ingresá la contraseña de administrador</p>
        </div>
        <input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&go()}
          placeholder="Contraseña..." autoFocus
          style={{...S.input, borderColor:err?ACCENT:'#3D1A2E', marginBottom:6, transition:'border-color 0.2s'}} />
        {err && <p style={{color:ACCENT,fontSize:11,marginBottom:10,textAlign:'center'}}>Contraseña incorrecta</p>}
        <div style={{display:'flex',gap:8,marginTop:14}}>
          <button onClick={onClose} style={{...S.btnGhost,flex:1}}>Cancelar</button>
          <button onClick={go} style={{...S.btnPink,flex:1}}>Entrar</button>
        </div>
      </div>
    </div>
  )
}

// ── Block Modal ───────────────────────────────────────────
function BlockModal({ block, onSave, onClose }) {
  const [type, setType] = useState(block?.type || 'warmup')
  const [title, setTitle] = useState(block?.title || '')
  const [content, setContent] = useState(block?.content || '')
  return (
    <div style={S.overlay} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <span style={{fontWeight:700,fontSize:14,color:'#F5D0E8'}}>{block?.id ? 'Editar bloque' : 'Nuevo bloque'}</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:'#6B3A55',fontSize:22,cursor:'pointer'}}>×</button>
        </div>
        <span style={S.label}>Tipo de bloque</span>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:7}}>
          {Object.entries(BTYPES).map(([k,v]) => (
            <button key={k} onClick={()=>setType(k)} style={{
              padding:'6px 11px', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer',
              border:`1px solid ${k===type ? v.bg : '#3D1A2E'}`,
              background: k===type ? v.bg+'40' : 'none',
              color: k===type ? v.accent : '#6B3A55',
            }}>{v.label}</button>
          ))}
        </div>
        <span style={S.label}>Título</span>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ej: Back Squat 5×5 @80%" style={S.input} />
        <span style={S.label}>Contenido / Descripción</span>
        <textarea value={content} onChange={e=>setContent(e.target.value)} rows={6}
          placeholder={'Detallá el ejercicio, series, reps, tiempo...\n\nEj:\n5 rondas:\n- 10 Thrusters 40kg\n- 15 Pull-ups'}
          style={{...S.input, resize:'vertical', lineHeight:1.6, fontFamily:'monospace', fontSize:12}} />
        <div style={{display:'flex',gap:8,marginTop:20,justifyContent:'flex-end'}}>
          <button onClick={onClose} style={S.btnGhost}>Cancelar</button>
          <button onClick={()=>onSave({id:block?.id||uid(), type, title, content})} style={S.btnPink}>
            {block?.id ? 'Guardar cambios' : 'Añadir bloque'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Block Pill ────────────────────────────────────────────
function BlockPill({ block, isAdmin, isMobile, onEdit, onDel }) {
  const [open, setOpen] = useState(false)
  const t = BTYPES[block.type] || BTYPES.wod
  return (
    <div style={{background:t.bg+'18', border:`1px solid ${t.bg}44`, borderRadius:8, marginBottom:8, overflow:'hidden'}}>
      <div onClick={()=>setOpen(o=>!o)}
        style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:isMobile?'10px 12px':'8px 10px',cursor:'pointer',gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}>
          <div style={{width:3,height:16,borderRadius:2,background:t.bg,flexShrink:0}} />
          <span style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.1em',color:t.accent}}>{t.label}</span>
          {block.title && !open && (
            <span style={{fontSize:12,color:'#9B6A85',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>— {block.title}</span>
          )}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
          {isAdmin && (
            <>
              <button onClick={e=>{e.stopPropagation();onEdit(block)}}
                style={{background:'none',border:'none',color:'#7A4A65',cursor:'pointer',fontSize:12,padding:'2px 5px'}}>✏</button>
              <button onClick={e=>{e.stopPropagation();onDel(block.id)}}
                style={{background:'none',border:'none',color:'#5A2A40',cursor:'pointer',fontSize:15,padding:'2px 5px'}}>×</button>
            </>
          )}
          <span style={{fontSize:11,color:'#5A2A40',transition:'transform 0.2s',display:'inline-block',transform:open?'rotate(180deg)':'rotate(0deg)'}}>▾</span>
        </div>
      </div>
      {open && (
        <div style={{padding:isMobile?'0 12px 12px':'0 10px 10px',borderTop:`1px solid ${t.bg}30`}}>
          {block.title && <div style={{fontSize:isMobile?14:13,fontWeight:700,color:'#F5D0E8',marginTop:10,marginBottom:block.content?6:0}}>{block.title}</div>}
          {block.content && <div style={{fontSize:isMobile?13:11,color:'#9B6A85',whiteSpace:'pre-wrap',lineHeight:1.6,wordBreak:'break-word'}}>{block.content}</div>}
        </div>
      )}
    </div>
  )
}

// ── Day Card ──────────────────────────────────────────────
function DayCard({ dayKey, label, date, dateObj, data, isAdmin, isToday, isMobile, defaultOpen, onUpdate, onAdd, onEdit, onDel }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{
      background:isToday?'#1A0814':'#120910',
      border:`1px solid ${isToday?ACCENT:'#2A1220'}`,
      borderRadius:10, overflow:'hidden',
      marginBottom:isMobile?8:0,
      flex:isMobile?'none':1, minWidth:isMobile?'100%':130,
    }}>
      <div onClick={()=>setOpen(o=>!o)} style={{
        padding:isMobile?'12px 14px':'9px 10px', cursor:'pointer',
        background:isToday?ACCENT+'18':'transparent',
        display:'flex', justifyContent:'space-between', alignItems:'center', gap:8,
      }}>
        <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}>
          <span style={{fontWeight:900,fontSize:isMobile?16:12,color:isToday?ACCENT:'#C4809A',letterSpacing:'0.07em',flexShrink:0}}>{label}</span>
          {isToday && <span style={{fontSize:9,background:ACCENT,color:'white',padding:'2px 7px',borderRadius:10,fontWeight:700,flexShrink:0}}>HOY</span>}
          {data.focus && !open && <span style={{fontSize:10,color:'#5A2A40',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>· {data.focus}</span>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          <span style={{fontSize:isMobile?12:10,color:'#5A2A40'}}>{isMobile?fmtDateLong(dateObj):date}</span>
          <span style={{fontSize:12,color:'#5A2A40',transition:'transform 0.2s',display:'inline-block',transform:open?'rotate(180deg)':'rotate(0deg)'}}>▾</span>
        </div>
      </div>
      {open && (
        <div style={{padding:isMobile?'10px 14px':'9px 10px',borderTop:`1px solid ${isToday?ACCENT+'30':'#1E0A17'}`}}>
          {isAdmin ? (
            <input value={data.focus||''} onChange={e=>onUpdate({...data,focus:e.target.value})}
              placeholder="foco del día..."
              style={{background:'none',border:'none',borderBottom:'1px solid #2A1220',color:'#9B6A85',fontSize:10,
                width:'100%',marginBottom:10,padding:'3px 0',outline:'none',textTransform:'uppercase',letterSpacing:'0.06em'}}
              onClick={e=>e.stopPropagation()} />
          ) : data.focus ? (
            <div style={{fontSize:10,color:'#7A4A65',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.07em',fontWeight:600}}>{data.focus}</div>
          ) : null}
          {isAdmin && (
            <label style={{display:'flex',alignItems:'center',gap:6,marginBottom:10,cursor:'pointer'}} onClick={e=>e.stopPropagation()}>
              <input type="checkbox" checked={!!data.isRest} onChange={e=>onUpdate({...data,isRest:e.target.checked})} style={{accentColor:ACCENT,width:12,height:12}} />
              <span style={{fontSize:10,color:'#5A2A40',textTransform:'uppercase',letterSpacing:'0.07em'}}>Día de descanso</span>
            </label>
          )}
          {data.isRest ? (
            <div style={{textAlign:'center',color:'#3D1A2E',fontSize:11,padding:'16px 0',letterSpacing:'0.15em',fontWeight:600}}>— DESCANSO —</div>
          ) : (
            <>
              {(data.blocks||[]).map(b => (
                <BlockPill key={b.id} block={b} isAdmin={isAdmin} isMobile={isMobile} onEdit={onEdit} onDel={onDel} />
              ))}
              {isAdmin && (
                <button onClick={e=>{e.stopPropagation();onAdd()}}
                  style={{width:'100%',background:'none',border:'1px dashed #3D1A2E',borderRadius:6,
                    color:'#5A2A40',fontSize:11,padding:isMobile?'10px 0':'7px 0',
                    cursor:'pointer',marginTop:4,letterSpacing:'0.07em',fontWeight:600}}>
                  + AÑADIR BLOQUE
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── App Principal ─────────────────────────────────────────
export default function App() {
  const today = new Date()
  const { year:ty, week:tw } = getISOWY(today)
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
  const [adminTab, setAdminTab] = useState('programming') // 'programming' | 'athletes'
  const saveTimer = useRef(null)
  const isMobile = useIsMobile()

  // Auth state
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [selectedTrack, setSelectedTrack] = useState(null)

  // Escuchar cambios de sesión
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else { setProfile(null); setAuthLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (userId) => {
    const p = await getProfile(userId)
    setProfile(p)
    if (p?.track) setSelectedTrack(p.track)
    setAuthLoading(false)
  }

  // Cargar programación
  const trackToLoad = isAdmin ? (selectedTrack || 'Scaled') : profile?.track
  useEffect(() => {
    if (!trackToLoad) return
    setLoading(true); setError(null)
    loadWeek(year, week, trackToLoad)
      .then(d => { setWdata(d || emptyW()); setLoading(false) })
      .catch(() => { setError('No se pudo conectar.'); setLoading(false) })
  }, [year, week, trackToLoad])

  const persist = (data) => {
    clearTimeout(saveTimer.current); setSaving(true)
    saveTimer.current = setTimeout(async () => {
      try { await saveWeek(year, week, data, trackToLoad) }
      catch(e) { console.error(e) }
      finally { setSaving(false) }
    }, 700)
  }

  const updDay = (dk, d) => { const nw={...wdata,days:{...wdata.days,[dk]:d}}; setWdata(nw); persist(nw) }
  const updTitle = (t) => { const nw={...wdata,title:t}; setWdata(nw); persist(nw) }

  const saveBlock = (dk, block) => {
    const day = wdata.days[dk]
    const exists = day.blocks.some(b => b.id===block.id)
    const blocks = exists ? day.blocks.map(b=>b.id===block.id?block:b) : [...day.blocks, block]
    updDay(dk, {...day, blocks})
    setAddDay(null); setEditBlk(null)
  }

  const delBlock = (dk, id) => {
    updDay(dk, {...wdata.days[dk], blocks:wdata.days[dk].blocks.filter(b=>b.id!==id)})
  }

  const nav = (dir) => {
    const m = getMon(year, week)
    const nm = new Date(m.getTime() + dir*7*86400000)
    const {year:y, week:w} = getISOWY(nm)
    setYear(y); setWeek(w)
  }

  const monday = getMon(year, week)
  const sunday = new Date(monday.getTime() + 6*86400000)
  const totalBlocks = Object.values(wdata.days).reduce((a,d)=>a+(d.blocks?.length||0),0)

  const sortedIdxs = isMobile
    ? [...DK.keys()].sort((a,b) => {
        const da=new Date(monday.getTime()+a*86400000), db=new Date(monday.getTime()+b*86400000)
        const ta=da.toDateString()===today.toDateString(), tb=db.toDateString()===today.toDateString()
        if(ta) return -1; if(tb) return 1
        const pastA=da<today&&!ta, pastB=db<today&&!tb
        if(pastA&&!pastB) return 1; if(!pastA&&pastB) return -1
        return a-b
      })
    : [...DK.keys()]

  // ── Auth Guards ───────────────────────────────────────────
  if (authLoading) return (
    <div style={{minHeight:'100vh',background:'#0E0A0D',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{fontSize:12,color:'#3D1A2E',letterSpacing:'0.12em'}}>CARGANDO...</div>
    </div>
  )
  if (!session) return <AuthScreen />
  if (profile?.status === 'pending') return <PendingScreen profile={profile} />
  if (profile?.status === 'inactive') return (
    <div style={{minHeight:'100vh',background:'#0E0A0D',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'#1A0E16',border:'1px solid #3D1A2E',borderRadius:14,padding:36,width:'min(420px,100%)',textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16}}>🔒</div>
        <h2 style={{color:'#F5D0E8',fontSize:18,fontWeight:800,marginBottom:12}}>Cuenta inactiva</h2>
        <p style={{color:'#9B6A85',fontSize:14,lineHeight:1.6,marginBottom:24}}>Tu acceso fue desactivado. Contactá al coach para más información.</p>
        <button onClick={signOut} style={{background:'none',border:'1px solid #3D1A2E',borderRadius:8,color:'#6B3A55',cursor:'pointer',fontSize:13,padding:'10px 24px'}}>Cerrar sesión</button>
      </div>
    </div>
  )

  // ── Main App ──────────────────────────────────────────────
  return (
    <div style={{minHeight:'100vh',background:'#0E0A0D',color:'#F5D0E8',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',display:'flex',flexDirection:'column'}}>
      {showLogin && <LoginModal onLogin={()=>{setIsAdmin(true);setShowLogin(false)}} onClose={()=>setShowLogin(false)} />}
      {addDay && <BlockModal block={null} onSave={b=>saveBlock(addDay,b)} onClose={()=>setAddDay(null)} />}
      {editBlk && <BlockModal block={editBlk.block} onSave={b=>saveBlock(editBlk.dk,b)} onClose={()=>setEditBlk(null)} />}

      {/* Header */}
      <div style={{background:'#0A0608',borderBottom:'1px solid #1E0A17',padding:isMobile?'10px 14px':'11px 16px'}}>
        {isMobile ? (
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div>
                <div style={{fontSize:14,fontWeight:900,color:'#F5D0E8',letterSpacing:'0.08em'}}>⚡ CF PROGRAMACIÓN</div>
                {wdata.title && <div style={{fontSize:10,color:ACCENT,fontWeight:600,marginTop:2}}>{wdata.title}</div>}
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                {isAdmin
                  ? <button onClick={()=>setIsAdmin(false)} style={{background:ACCENT,border:'none',borderRadius:8,color:'white',cursor:'pointer',fontSize:10,padding:'7px 13px',fontWeight:800}}>● ADMIN</button>
                  : <button onClick={()=>setShowLogin(true)} style={{background:'none',border:'1px solid #3D1A2E',borderRadius:8,color:'#6B3A55',cursor:'pointer',fontSize:10,padding:'7px 13px'}}>COACH</button>
                }
                <button onClick={signOut} style={{background:'none',border:'1px solid #2A1220',borderRadius:8,color:'#3D1A2E',cursor:'pointer',fontSize:10,padding:'7px 10px'}}>↩</button>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <button onClick={()=>nav(-1)} style={{background:'none',border:'1px solid #2A1220',borderRadius:6,color:'#6B3A55',cursor:'pointer',width:36,height:36,fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
              <div style={{textAlign:'center',flex:1}}>
                <div style={{fontSize:12,fontWeight:800,color:ACCENT,letterSpacing:'0.1em'}}>SEMANA {String(week).padStart(2,'0')}</div>
                <div style={{fontSize:10,color:'#5A2A40'}}>{fmtDate(monday)} — {fmtDate(sunday)} · {year}</div>
              </div>
              <button onClick={()=>nav(1)} style={{background:'none',border:'1px solid #2A1220',borderRadius:6,color:'#6B3A55',cursor:'pointer',width:36,height:36,fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
              <button onClick={()=>{setYear(ty);setWeek(tw)}} style={{background:ACCENT+'20',border:`1px solid ${ACCENT}40`,borderRadius:6,color:ACCENT,cursor:'pointer',fontSize:9,padding:'5px 10px',fontWeight:700}}>HOY</button>
            </div>
          </>
        ) : (
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <div>
              <div style={{fontSize:15,fontWeight:900,color:'#F5D0E8',letterSpacing:'0.08em'}}>⚡ CF PROGRAMACIÓN</div>
              <div style={{fontSize:9,color:'#3D1A2E',textTransform:'uppercase',letterSpacing:'0.12em'}}>Box Programming</div>
            </div>
            <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
              <button onClick={()=>nav(-1)} style={{background:'none',border:'1px solid #1E0A17',borderRadius:4,color:'#5A2A40',cursor:'pointer',width:28,height:28,fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:13,fontWeight:800,color:ACCENT,letterSpacing:'0.1em'}}>SEMANA {String(week).padStart(2,'0')}</div>
                <div style={{fontSize:9,color:'#3D1A2E'}}>{fmtDate(monday)} — {fmtDate(sunday)} · {year}</div>
              </div>
              <button onClick={()=>nav(1)} style={{background:'none',border:'1px solid #1E0A17',borderRadius:4,color:'#5A2A40',cursor:'pointer',width:28,height:28,fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
              <button onClick={()=>{setYear(ty);setWeek(tw)}} style={{background:ACCENT+'18',border:`1px solid ${ACCENT}33`,borderRadius:4,color:ACCENT,cursor:'pointer',fontSize:9,padding:'3px 9px',fontWeight:700}}>HOY</button>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {saving && <span style={{fontSize:9,color:'#3D1A2E'}}>GUARDANDO...</span>}
              {isAdmin
                ? <button onClick={()=>setIsAdmin(false)} style={{background:ACCENT,border:'none',borderRadius:6,color:'white',cursor:'pointer',fontSize:10,padding:'6px 12px',fontWeight:800}}>● ADMIN</button>
                : <button onClick={()=>setShowLogin(true)} style={{background:'none',border:'1px solid #1E0A17',borderRadius:6,color:'#3D1A2E',cursor:'pointer',fontSize:10,padding:'6px 12px'}}>COACH</button>
              }
              <button onClick={signOut} title="Cerrar sesión" style={{background:'none',border:'1px solid #1E0A17',borderRadius:6,color:'#3D1A2E',cursor:'pointer',fontSize:10,padding:'6px 10px'}}>↩</button>
            </div>
          </div>
        )}
      </div>

      {/* Track selector — admin elige qué track editar, atleta ve el suyo */}
      <div style={{padding:'8px 14px',background:'#0C0C0C',borderBottom:'1px solid #120910',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        {isAdmin ? (
          <>
            <span style={{fontSize:10,color:'#3D1A2E',letterSpacing:'0.08em',textTransform:'uppercase'}}>Track:</span>
            {TRACKS.map(t => (
              <button key={t} onClick={()=>setSelectedTrack(t)} style={{
                padding:'4px 12px', fontSize:11, fontWeight:700, cursor:'pointer', borderRadius:6,
                background: selectedTrack===t ? ACCENT+'22' : 'none',
                border: `1px solid ${selectedTrack===t ? ACCENT : '#2A1220'}`,
                color: selectedTrack===t ? ACCENT : '#3D1A2E',
              }}>{t}</button>
            ))}
            {/* Tabs admin */}
            <div style={{marginLeft:'auto',display:'flex',gap:6}}>
              <button onClick={()=>setAdminTab('programming')} style={{padding:'4px 12px',fontSize:11,fontWeight:600,cursor:'pointer',borderRadius:6,background:adminTab==='programming'?'#BE185D22':'none',border:`1px solid ${adminTab==='programming'?'#BE185D':'#2A1220'}`,color:adminTab==='programming'?'#F9A8D4':'#3D1A2E'}}>📅 Programación</button>
              <button onClick={()=>setAdminTab('athletes')} style={{padding:'4px 12px',fontSize:11,fontWeight:600,cursor:'pointer',borderRadius:6,background:adminTab==='athletes'?'#BE185D22':'none',border:`1px solid ${adminTab==='athletes'?'#BE185D':'#2A1220'}`,color:adminTab==='athletes'?'#F9A8D4':'#3D1A2E'}}>👥 Atletas</button>
            </div>
          </>
        ) : (
          <>
            <span style={{fontSize:10,color:'#3D1A2E',letterSpacing:'0.08em',textTransform:'uppercase'}}>Tu track:</span>
            <span style={{fontSize:12,fontWeight:700,color:ACCENT}}>{profile?.track || '—'}</span>
            <span style={{marginLeft:'auto',fontSize:10,color:'#2A1220'}}>{profile?.full_name || profile?.email}</span>
          </>
        )}
      </div>

      {/* Tab atletas (solo admin) */}
      {isAdmin && adminTab === 'athletes' ? (
        <div style={{flex:1,overflowY:'auto'}}>
          <AthletesPanel />
        </div>
      ) : (
        <>
          {/* Título semana */}
          {!isMobile && (
            <div style={{padding:'10px 16px',borderBottom:'1px solid #120910',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              {isAdmin
                ? <input value={wdata.title||''} onChange={e=>updTitle(e.target.value)} placeholder="Título de la semana..."
                    style={{background:'none',border:'none',color:'#F5D0E8',fontSize:16,fontWeight:700,flex:1,outline:'none',letterSpacing:'0.02em'}} />
                : <div style={{fontSize:16,fontWeight:700,color:wdata.title?'#F5D0E8':'#2A1220'}}>{wdata.title||'SIN TÍTULO'}</div>
              }
              <span style={{fontSize:9,color:'#2A1220',flexShrink:0}}>{totalBlocks} BLOQUES</span>
            </div>
          )}
          {isMobile && isAdmin && (
            <div style={{padding:'8px 14px',borderBottom:'1px solid #120910'}}>
              <input value={wdata.title||''} onChange={e=>updTitle(e.target.value)} placeholder="Título de la semana..."
                style={{background:'none',border:'none',color:'#F5D0E8',fontSize:14,fontWeight:700,width:'100%',outline:'none'}} />
            </div>
          )}

          {/* Días */}
          <div style={{flex:1,padding:'8px 10px',overflowX:isMobile?'visible':'auto'}}>
            {loading ? (
              <div style={{textAlign:'center',padding:60,color:'#3D1A2E',letterSpacing:'0.12em',fontSize:12}}>CARGANDO PROGRAMACIÓN...</div>
            ) : error ? (
              <div style={{textAlign:'center',padding:60,color:ACCENT,fontSize:13}}>{error}</div>
            ) : (
              <div style={{display:'flex',flexDirection:isMobile?'column':'row',gap:isMobile?0:5,minWidth:isMobile?'auto':900}}>
                {sortedIdxs.map(i => {
                  const dk=DK[i], dt=new Date(monday.getTime()+i*86400000)
                  const isToday=dt.toDateString()===today.toDateString()
                  const d=wdata.days[dk]||{focus:'',isRest:false,blocks:[]} 
                  return (
                    <DayCard key={dk} dayKey={dk} label={DL[i]} date={fmtDate(dt)} dateObj={dt}
                      data={d} isAdmin={isAdmin} isToday={isToday} isMobile={isMobile} defaultOpen={isToday}
                      onUpdate={nd=>updDay(dk,nd)} onAdd={()=>setAddDay(dk)}
                      onEdit={b=>setEditBlk({dk,block:b})} onDel={id=>delBlock(dk,id)} />
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{padding:'8px 14px',borderTop:'1px solid #120910',display:'flex',flexWrap:'wrap',justifyContent:'space-between',alignItems:'center',gap:6}}>
            <div style={{display:'flex',gap:isMobile?6:12,flexWrap:'wrap'}}>
              {Object.entries(BTYPES).map(([k,v]) => (
                <span key={k} style={{fontSize:9,color:v.accent,letterSpacing:'0.06em',fontWeight:600}}>● {v.label.toUpperCase()}</span>
              ))}
            </div>
            {isAdmin && <span style={{fontSize:9,color:ACCENT,letterSpacing:'0.08em',fontWeight:700}}>MODO EDICIÓN ACTIVO</span>}
          </div>
        </>
      )}
    </div>
  )
}
