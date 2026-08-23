import { useState } from 'react'
import { signIn, signUp } from './supabase'

const ACCENT = '#31708E'

const S = {
  input: {
    display: 'block', width: '100%',
    background: '#F7F9FB', border: '1px solid #C0CDD8',
    borderRadius: 8, color: '#1F3A4A',
    padding: '11px 13px', fontSize: 14, outline: 'none', marginTop: 6,
  },
  btnMain: {
    display: 'block', width: '100%',
    padding: '12px', background: ACCENT,
    border: 'none', borderRadius: 8,
    color: '#FFFFFF', cursor: 'pointer',
    fontSize: 14, fontWeight: 700, marginTop: 20,
  },
  label: {
    fontSize: 11, color: '#7A8FA0',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    display: 'block', marginTop: 16,
  }
}

export default function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    if (!email || !password) { setError('Completá todos los campos'); return }
    if (mode === 'register' && !fullName) { setError('Ingresá tu nombre completo'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true)
    try {
      if (mode === 'login') { await signIn(email, password) }
      else { await signUp(email, password, fullName); setSuccess(true) }
    } catch (e) {
      const msg = e.message || 'Error desconocido'
      if (msg.includes('Invalid login')) setError('Email o contraseña incorrectos')
      else if (msg.includes('already registered')) setError('Este email ya está registrado')
      else if (msg.includes('Email not confirmed')) setError('Confirmá tu email antes de ingresar')
      else setError(msg)
    } finally { setLoading(false) }
  }

  if (success) {
    return (
      <div style={{minHeight:'100vh',background:'#EDF1F5',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
        <div style={{background:'#FFFFFF',border:'1px solid #DDE5EC',borderRadius:14,padding:36,width:'min(420px,100%)',textAlign:'center'}}>
          <div style={{fontSize:48,marginBottom:16}}>✉️</div>
          <h2 style={{color:'#1F3A4A',fontSize:18,fontWeight:800,marginBottom:12}}>¡Registro exitoso!</h2>
          <p style={{color:'#5A7286',fontSize:14,lineHeight:1.6,marginBottom:20}}>Tu cuenta fue creada. El coach debe activarla antes de que puedas acceder a la programación.</p>
          <button onClick={()=>{setSuccess(false);setMode('login');setPassword('');}} style={{...S.btnMain,marginTop:0}}>Ir al Login</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{minHeight:'100vh',background:'#EDF1F5',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'#FFFFFF',border:'1px solid #DDE5EC',borderRadius:14,padding:32,width:'min(420px,100%)'}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{fontSize:36,marginBottom:10}}>⚡</div>
          <h1 style={{color:'#1F3A4A',fontSize:20,fontWeight:900,letterSpacing:'0.06em',margin:0}}>RF PLANIFICACIÓN</h1>
          <p style={{color:'#90A4B4',fontSize:11,marginTop:6,letterSpacing:'0.1em',textTransform:'uppercase'}}>
            {mode === 'login' ? 'Iniciá sesión para continuar' : 'Creá tu cuenta'}
          </p>
        </div>

        {mode === 'register' && (
          <>
            <span style={S.label}>Nombre completo</span>
            <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Ej: Juan García" style={S.input} />
          </>
        )}

        <span style={S.label}>Email</span>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com"
          onKeyDown={e=>e.key==='Enter'&&handleSubmit()} style={S.input} />

        <span style={S.label}>Contraseña</span>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
          placeholder={mode==='register'?'Mínimo 6 caracteres':'••••••••'}
          onKeyDown={e=>e.key==='Enter'&&handleSubmit()} style={S.input} />

        {error && (
          <div style={{marginTop:12,padding:'10px 13px',background:'#FBEDED',border:'1px solid #C25454',borderRadius:8,color:'#A33A3A',fontSize:13}}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{...S.btnMain, opacity:loading?0.7:1}}>
          {loading ? 'CARGANDO...' : mode==='login' ? 'INGRESAR' : 'REGISTRARME'}
        </button>

        <div style={{textAlign:'center',marginTop:20}}>
          {mode === 'login' ? (
            <p style={{color:'#7A8FA0',fontSize:13}}>
              ¿No tenés cuenta?{' '}
              <button onClick={()=>{setMode('register');setError(null)}}
                style={{background:'none',border:'none',color:ACCENT,cursor:'pointer',fontSize:13,fontWeight:700}}>
                Registrate
              </button>
            </p>
          ) : (
            <p style={{color:'#7A8FA0',fontSize:13}}>
              ¿Ya tenés cuenta?{' '}
              <button onClick={()=>{setMode('login');setError(null)}}
                style={{background:'none',border:'none',color:ACCENT,cursor:'pointer',fontSize:13,fontWeight:700}}>
                Ingresá
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
