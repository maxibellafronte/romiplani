import { useState } from 'react'
import { cambiarMiPassword, signOut } from './supabase'

const ACCENT = '#31708E'

// Sirve para los dos casos:
//  - obligatorio: la coach reseteó la contraseña. Bloquea el resto de la
//    app hasta elegir una propia, así la temporal —que la coach conoce—
//    sirve para entrar una sola vez.
//  - voluntario: la persona la cambia porque quiere, y puede cancelar.
export default function CambiarPassword({ nombre, obligatorio = true, onListo, onCancelar }) {
  const [password, setPassword] = useState('')
  const [repetir, setRepetir] = useState('')
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const guardar = async () => {
    setError(null)
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (password !== repetir) { setError('Las contraseñas no coinciden'); return }

    setGuardando(true)
    try {
      await cambiarMiPassword(password)
      // En el caso obligatorio se sale directo; en el voluntario mostramos
      // la confirmación, porque si no el cartel se cierra y no queda claro
      // si el cambio se aplicó.
      if (obligatorio) onListo()
      else setGuardado(true)
    } catch (e) {
      setError(e.message || 'No se pudo cambiar la contraseña')
      setGuardando(false)
    }
  }

  const input = {
    width:'100%', background:'#E2E8EA', border:'1px solid #AEB9C0', borderRadius:8,
    color:'#1F3A4A', padding:'11px 13px', fontSize:14, outline:'none', marginBottom:10,
  }

  if (guardado) return (
    <div style={{minHeight:'100vh',background:'#DCE3E8',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'#EEF2F0',border:'1px solid #C4CDD4',borderRadius:14,padding:32,width:'min(420px,100%)',textAlign:'center'}}>
        <div style={{fontSize:44,marginBottom:12}}>✅</div>
        <h2 style={{color:'#1F3A4A',fontSize:18,fontWeight:800,marginBottom:10}}>Contraseña actualizada</h2>
        <p style={{color:'#5A7286',fontSize:13.5,lineHeight:1.55,marginBottom:20}}>
          La próxima vez que entres, usá la nueva.
        </p>
        <button onClick={onListo}
          style={{width:'100%',padding:'12px 16px',background:ACCENT,border:'none',borderRadius:8,
            color:'white',cursor:'pointer',fontSize:14,fontWeight:700}}>
          Volver
        </button>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#DCE3E8',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'#EEF2F0',border:'1px solid #C4CDD4',borderRadius:14,padding:32,width:'min(420px,100%)'}}>
        <div style={{textAlign:'center',marginBottom:22}}>
          <div style={{fontSize:44,marginBottom:12}}>🔑</div>
          <h2 style={{color:'#1F3A4A',fontSize:18,fontWeight:800,marginBottom:10}}>
            {obligatorio ? 'Elegí tu nueva contraseña' : 'Cambiar tu contraseña'}
          </h2>
          <p style={{color:'#5A7286',fontSize:13.5,lineHeight:1.55}}>
            {obligatorio
              ? `${nombre ? `Hola ${nombre}. ` : ''}Entraste con una contraseña temporal. Elegí una propia para seguir: solo vos vas a conocerla.`
              : 'Elegí una contraseña nueva. Vas a usarla la próxima vez que inicies sesión.'}
          </p>
        </div>

        <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
          placeholder="Nueva contraseña" autoFocus style={input} />
        <input type="password" value={repetir} onChange={e=>setRepetir(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&guardar()}
          placeholder="Repetir contraseña" style={input} />

        {error && (
          <div style={{marginTop:2,marginBottom:10,padding:'10px 13px',background:'#EDDBDB',border:'1px solid #C25454',borderRadius:8,color:'#A33A3A',fontSize:13}}>
            {error}
          </div>
        )}

        <button onClick={guardar} disabled={guardando}
          style={{width:'100%',padding:'12px 16px',background:ACCENT,border:'none',borderRadius:8,
            color:'white',cursor:guardando?'default':'pointer',fontSize:14,fontWeight:700,
            opacity:guardando?0.7:1,marginTop:4}}>
          {guardando ? 'Guardando...' : 'Guardar y continuar'}
        </button>

        <button onClick={obligatorio ? signOut : onCancelar}
          style={{width:'100%',marginTop:10,padding:'9px 16px',background:'none',
            border:'1px solid #C4CDD4',borderRadius:8,color:'#7A8FA0',cursor:'pointer',fontSize:12.5}}>
          {obligatorio ? 'Cerrar sesión' : 'Cancelar'}
        </button>
      </div>
    </div>
  )
}
