import { signOut } from './supabase'

export default function PendingScreen({ profile }) {
  return (
    <div style={{minHeight:'100vh',background:'#DCE3E8',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'#EEF2F0',border:'1px solid #C4CDD4',borderRadius:14,padding:36,width:'min(420px,100%)',textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16}}>⏳</div>
        <h2 style={{color:'#1F3A4A',fontSize:18,fontWeight:800,marginBottom:12}}>Cuenta pendiente</h2>
        <p style={{color:'#5A7286',fontSize:14,lineHeight:1.6,marginBottom:8}}>
          Hola <strong style={{color:'#1F3A4A'}}>{profile?.full_name || profile?.email}</strong>,
        </p>
        <p style={{color:'#5A7286',fontSize:14,lineHeight:1.6,marginBottom:24}}>
          Tu cuenta está registrada pero aún no fue activada por el coach. Una vez aprobada podrás ver la programación.
        </p>
        <div style={{background:'#E2E8EA',border:'1px solid #C4CDD4',borderRadius:8,padding:'12px 16px',marginBottom:24,fontSize:12,color:'#7A8FA0'}}>
          Si ya abonaste y tu cuenta sigue pendiente, contactá al coach directamente.
        </div>
        <button onClick={signOut}
          style={{background:'none',border:'1px solid #AEB9C0',borderRadius:8,color:'#7A8FA0',cursor:'pointer',fontSize:13,padding:'10px 24px'}}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
