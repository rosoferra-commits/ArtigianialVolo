'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const S = {
  bg: '#111111', bordo: 'rgba(255,255,255,0.10)', input: 'rgba(255,255,255,0.06)',
  arancio: '#E03A1E', bianco: '#fff', testoS: 'rgba(255,255,255,0.4)', rosso: '#FF6B6B',
}

export default function RegistratiArtigiano() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [errore,   setErrore]   = useState('')

  async function registrati() {
    setErrore('')
    if (!email.trim())        { setErrore('Inserisci la tua email'); return }
    if (password.length < 6)  { setErrore('La password deve avere almeno 6 caratteri'); return }
    if (password !== confirm)  { setErrore('Le password non corrispondono'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email: email.trim(), password: password.trim() })
    setLoading(false)
    if (error) { setErrore(error.message === 'User already registered' ? 'Email già registrata. Accedi invece.' : error.message); return }
    router.push('/artigiano/onboarding')
  }

  const inp = (v: string, set: (s:string)=>void, type='text', ph='') => (
    <input type={type} value={v} onChange={e => set(e.target.value)} onKeyDown={e => e.key==='Enter' && registrati()} placeholder={ph}
      style={{ width:'100%', height:50, borderRadius:14, border:`1.5px solid ${S.bordo}`, background:S.input, padding:'0 16px', fontSize:15, color:S.bianco, outline:'none', boxSizing:'border-box' as const, marginBottom:16 }} />
  )

  return (
    <div style={{ minHeight:'100dvh', background:S.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 20px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:-200, left:'50%', transform:'translateX(-50%)', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(224,58,30,0.15) 0%, transparent 70%)', pointerEvents:'none' }} />

      <div style={{ width:72, height:72, borderRadius:22, background:'linear-gradient(135deg, #E03A1E, #B52E16)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:34, marginBottom:20, boxShadow:'0 8px 24px rgba(224,58,30,0.4)' }}>🔧</div>
      <p style={{ fontWeight:800, fontSize:24, color:S.bianco, margin:'0 0 6px' }}>Crea il tuo account</p>
      <p style={{ fontSize:14, color:S.testoS, margin:'0 0 36px' }}>Inizia a ricevere lavori vicino a te</p>

      <div style={{ width:'100%', maxWidth:360 }}>
        {[['Email','email','mario@esempio.it',email,setEmail],['Password','password','Minimo 6 caratteri',password,setPassword],['Conferma password','password','Ripeti la password',confirm,setConfirm]].map(([label,type,ph,val,set]) => (
          <div key={label as string}>
            <label style={{ fontSize:11, fontWeight:600, color:S.testoS, display:'block', marginBottom:8, textTransform:'uppercase' as const, letterSpacing:'0.08em' }}>{label as string}</label>
            {inp(val as string, set as (s:string)=>void, type as string, ph as string)}
          </div>
        ))}

        {errore && <p style={{ fontSize:12, color:S.rosso, marginBottom:12 }}>{errore}</p>}

        <button onClick={registrati} disabled={loading}
          style={{ width:'100%', height:52, borderRadius:16, border:'none', background:loading?'#333':'linear-gradient(135deg, #E03A1E, #D85A30)', color:S.bianco, fontWeight:800, fontSize:16, cursor:loading?'not-allowed':'pointer', boxShadow:loading?'none':'0 6px 20px rgba(224,58,30,0.4)' }}>
          {loading ? 'Registrazione…' : 'Crea account →'}
        </button>

        <button onClick={() => router.push('/artigiano/login')}
          style={{ width:'100%', marginTop:14, background:'none', border:'none', fontSize:13, color:S.testoS, cursor:'pointer', textDecoration:'underline' }}>
          Hai già un account? Accedi
        </button>
      </div>
    </div>
  )
}
