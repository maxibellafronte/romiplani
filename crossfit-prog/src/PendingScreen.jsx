import { signOut } from './supabase'

const ACCENT = '#EC4899'

export default function PendingScreen({ profile }) {
  return (
    <div style={{minHeight:'100vh',background:'#0E0A0D',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'#1A0E16',border:'1px solid #3D1A2E',borderRadius:14,padding:36,width:'min(420px,100%)',textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16}}>⏳</div>
        <h2 style={{color:'#F5D0E8',fontSize:18,fontWeight:800,marginBottom:12}}>Cuenta pendiente</h2>
        <p style={{color:'#9B6A85',fontSize:14,lineHeight:1.6,marginBottom:8}}>
          Hola <strong style={{color:'#F5D0E8'}}>{profile?.full_name || profile?.email}</strong>,
        </p>
        <p style={{color:'#9B6A85',fontSize:14,lineHeight:1.6,marginBottom:24}}>
          Tu cuenta está registrada pero aún no fue activada por el coach. Una vez aprobada podrás ver la programación de tu track.
        </p>
        <div style={{background:'#120910',border:'1px solid #2A1220',borderRadius:8,padding:'12px 16px',marginBottom:24,fontSize:12,color:'#6B3A55'}}>
          Si ya abonaste y tu cuenta sigue pendiente, contactá al coach directamente.
        </div>
        <button
          onClick={signOut}
          style={{background:'none',border:'1px solid #3D1A2E',borderRadius:8,color:'#6B3A55',cursor:'pointer',fontSize:13,padding:'10px 24px'}}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
