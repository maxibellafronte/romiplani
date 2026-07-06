import { useState } from 'react'
import { signIn, signUp } from './supabase'

const ACCENT = '#EC4899'

const S = {
  input: {
    display: 'block', width: '100%',
    background: '#110810', border: '1px solid #3D1A2E',
    borderRadius: 8, color: '#F5D0E8',
    padding: '11px 13px', fontSize: 14, outline: 'none', marginTop: 6,
  },
  btnPink: {
    display: 'block', width: '100%',
    padding: '12px', background: ACCENT,
    border: 'none', borderRadius: 8,
    color: 'white', cursor: 'pointer',
    fontSize: 14, fontWeight: 700, marginTop: 20,
  },
  label: {
    fontSize: 11, color: '#6B3A55',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    display: 'block', marginTop: 16,
  }
}

export default function AuthScreen() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
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
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password, fullName)
        setSuccess(true)
      }
    } catch (e) {
      const msg = e.message || 'Error desconocido'
      if (msg.includes('Invalid login')) setError('Email o contraseña incorrectos')
      else if (msg.includes('already registered')) setError('Este email ya está registrado')
      else if (msg.includes('Email not confirmed')) setError('Confirmá tu email antes de ingresar')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{minHeight:'100vh',background:'#0E0A0D',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
        <div style={{background:'#1A0E16',border:'1px solid #3D1A2E',borderRadius:14,padding:36,width:'min(420px,100%)',textAlign:'center'}}>
          <div style={{fontSize:48,marginBottom:16}}>✉️</div>
          <h2 style={{color:'#F5D0E8',fontSize:18,fontWeight:800,marginBottom:12}}>¡Registro exitoso!</h2>
          <p style={{color:'#9B6A85',fontSize:14,lineHeight:1.6,marginBottom:20}}>
            Tu cuenta fue creada. El coach debe activarla antes de que puedas acceder a la programación.
          </p>
          <p style={{color:'#6B3A55',fontSize:12,marginBottom:24}}>
            Revisá tu email para confirmar tu cuenta si Supabase lo requiere.
          </p>
          <button
            onClick={()=>{ setSuccess(false); setMode('login'); setPassword(''); }}
            style={{...S.btnPink, marginTop:0}}
          >
            Ir al Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{minHeight:'100vh',background:'#0E0A0D',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'#1A0E16',border:'1px solid #3D1A2E',borderRadius:14,padding:32,width:'min(420px,100%)'}}>

        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{fontSize:36,marginBottom:10}}>⚡</div>
          <h1 style={{color:'#F5D0E8',fontSize:20,fontWeight:900,letterSpacing:'0.06em',margin:0}}>CF PROGRAMACIÓN</h1>
          <p style={{color:'#5A2A40',fontSize:11,marginTop:6,letterSpacing:'0.1em',textTransform:'uppercase'}}>
            {mode === 'login' ? 'Iniciá sesión para continuar' : 'Creá tu cuenta'}
          </p>
        </div>

        {/* Form */}
        {mode === 'register' && (
          <>
            <span style={S.label}>Nombre completo</span>
            <input
              value={fullName} onChange={e=>setFullName(e.target.value)}
              placeholder="Ej: Juan García"
              style={S.input}
            />
          </>
        )}

        <span style={S.label}>Email</span>
        <input
          type="email" value={email} onChange={e=>setEmail(e.target.value)}
          placeholder="tu@email.com"
          onKeyDown={e=>e.key==='Enter'&&handleSubmit()}
          style={S.input}
        />

        <span style={S.label}>Contraseña</span>
        <input
          type="password" value={password} onChange={e=>setPassword(e.target.value)}
          placeholder={mode==='register'?'Mínimo 6 caracteres':'••••••••'}
          onKeyDown={e=>e.key==='Enter'&&handleSubmit()}
          style={S.input}
        />

        {error && (
          <div style={{marginTop:12,padding:'10px 13px',background:'#7F1D1D22',border:'1px solid #7F1D1D',borderRadius:8,color:'#FCA5A5',fontSize:13}}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{...S.btnPink, opacity:loading?0.7:1}}>
          {loading ? 'CARGANDO...' : mode==='login' ? 'INGRESAR' : 'REGISTRARME'}
        </button>

        {/* Toggle */}
        <div style={{textAlign:'center',marginTop:20}}>
          {mode === 'login' ? (
            <p style={{color:'#6B3A55',fontSize:13}}>
              ¿No tenés cuenta?{' '}
              <button onClick={()=>{setMode('register');setError(null)}}
                style={{background:'none',border:'none',color:ACCENT,cursor:'pointer',fontSize:13,fontWeight:700}}>
                Registrate
              </button>
            </p>
          ) : (
            <p style={{color:'#6B3A55',fontSize:13}}>
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
