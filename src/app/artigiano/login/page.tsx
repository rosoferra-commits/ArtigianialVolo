'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const S = {
  bg: '#111111', card: 'rgba(255,255,255,0.04)',
  bordo: 'rgba(255,255,255,0.10)', input: 'rgba(255,255,255,0.06)',
  arancio: '#E03A1E', bianco: '#fff',
  testoS: 'rgba(255,255,255,0.4)', rosso: '#FF6B6B',
}

export default function LoginArtigiano() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [errore,   setErrore]   = useState('')

  async function accedi() {
    setErrore('')
    if (!email.trim() || !password.trim()) { setErrore('Inserisci email e password'); return }
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: password.trim() })
    if (error || !data.user) { setErrore('Email o password non corretti'); setLoading(false); return }
    const { data: art } = await supabase.from('artigiani').select('onboarding_completo').eq('auth_id', data.user.id).maybeSingle()
    setLoading(false)
    router.push(art?.onboarding_completo ? '/artigiano/dashboard' : '/artigiano/onboarding')
  }

  return (
    <div style={{ minHeight: '100dvh', background: S.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(224,58,30,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Icona */}
      <div style={{ width: 72, height: 72, borderRadius: 22, background: 'linear-gradient(135deg, #E03A1E, #B52E16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, marginBottom: 20, boxShadow: '0 8px 24px rgba(224,58,30,0.4)' }}>🔧</div>
      <p style={{ fontWeight: 800, fontSize: 24, color: S.bianco, margin: '0 0 6px' }}>ArtigianiAlVolo</p>
      <p style={{ fontSize: 14, color: S.testoS, margin: '0 0 36px' }}>Area artigiani</p>

      <div style={{ width: '100%', maxWidth: 360 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: S.testoS, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && accedi()} placeholder="mario@esempio.it"
          style={{ width: '100%', height: 50, borderRadius: 14, border: `1.5px solid ${S.bordo}`, background: S.input, padding: '0 16px', fontSize: 15, color: S.bianco, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />

        <label style={{ fontSize: 11, fontWeight: 600, color: S.testoS, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && accedi()} placeholder="••••••••"
          style={{ width: '100%', height: 50, borderRadius: 14, border: `1.5px solid ${S.bordo}`, background: S.input, padding: '0 16px', fontSize: 15, color: S.bianco, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />

        {errore && <p style={{ fontSize: 12, color: S.rosso, marginBottom: 12 }}>{errore}</p>}

        <button onClick={accedi} disabled={loading}
          style={{ width: '100%', height: 52, borderRadius: 16, border: 'none', background: loading ? '#333' : 'linear-gradient(135deg, #E03A1E, #D85A30)', color: S.bianco, fontWeight: 800, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 8, boxShadow: loading ? 'none' : '0 6px 20px rgba(224,58,30,0.4)' }}>
          {loading ? 'Accesso…' : 'Entra →'}
        </button>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: S.testoS, marginBottom: 10 }}>Non hai ancora un account?</p>
          <button onClick={() => router.push('/artigiano/registrati')}
            style={{ width: '100%', height: 50, borderRadius: 16, border: `1.5px solid ${S.bordo}`, background: 'rgba(255,255,255,0.04)', color: S.bianco, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            Registrati come artigiano →
          </button>
        </div>
      </div>
    </div>
  )
}
