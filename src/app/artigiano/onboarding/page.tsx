// src/app/artigiano/onboarding/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { CATEGORIE }           from '@/types'
import type { Categoria }      from '@/types'

const C = {
  arancio: '#D85A30', testo: '#2C2C2A', testoS: '#888780',
  bordo: '#E5E4E0', grigioC: '#F1EFE8', bianco: '#FFFFFF',
  rosso: '#E24B4A', teal: '#1D9E75',
}

function Campo({
  label, value, onChange, type = 'text', placeholder, required = false
}: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; required?: boolean
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        fontSize: 11, fontWeight: 600, color: C.testoS,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        display: 'block', marginBottom: 6,
      }}>
        {label}{required && ' *'}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', height: 46, borderRadius: 12,
          border: `1px solid ${C.bordo}`, padding: '0 14px',
          fontSize: 15, color: C.testo, outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

export default function OnboardingArtigiano() {
  const router = useRouter()

  const [nome,           setNome]           = useState('')
  const [telefono,       setTelefono]       = useState('')
  const [categoria,      setCategoria]      = useState<Categoria | ''>('')
  const [indirizzo,      setIndirizzo]      = useState('')
  const [partitaIva,     setPartitaIva]     = useState('')
  const [iban,           setIban]           = useState('')
  const [costoSos,       setCostoSos]       = useState('50')
  const [costoUrgente,   setCostoUrgente]   = useState('25')
  const [costoOrario,    setCostoOrario]    = useState('60')
  const [loading,        setLoading]        = useState(false)
  const [caricando,      setCaricando]      = useState(true)
  const [errore,         setErrore]         = useState('')
  const [accettaTermini, setAccettaTermini] = useState(false)
  const [isModifica,     setIsModifica]     = useState(false)

  // Carica dati esistenti se il profilo è già compilato (modifica)
  useEffect(() => {
    fetch('/api/artigiano')
      .then(r => r.json())
      .then(j => {
        const art = j.artigiano
        if (art && art.onboarding_completo) {
          setIsModifica(true)
          setNome(art.nome           ?? '')
          setTelefono(art.telefono   ?? '')
          setCategoria(art.categoria ?? '')
          setIndirizzo(art.indirizzo ?? '')
          setPartitaIva(art.partita_iva ?? '')
          setIban(art.iban           ?? '')
          setCostoSos(String(art.costo_chiamata_sos      ?? 50))
          setCostoUrgente(String(art.costo_chiamata_urgente ?? 25))
          setCostoOrario(String(art.costo_orario         ?? 60))
          setAccettaTermini(true) // già accettati in precedenza
        }
        setCaricando(false)
      })
      .catch(() => setCaricando(false))
  }, [])

  async function salva() {
    setErrore('')
    if (!nome || !telefono || !categoria) {
      setErrore('Nome, telefono e categoria sono obbligatori')
      return
    }
    if (!iban.trim()) {
      setErrore('Inserisci il tuo IBAN per ricevere i pagamenti')
      return
    }
    if (!accettaTermini) {
      setErrore('Devi accettare i Termini e Condizioni per procedere')
      return
    }

    setLoading(true)
    const res = await fetch('/api/artigiano', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome, telefono, categoria, indirizzo, partita_iva: partitaIva, iban,
        costo_chiamata_sos:     Number(costoSos),
        costo_chiamata_urgente: Number(costoUrgente),
        costo_orario:           Number(costoOrario),
      }),
    })
    const json = await res.json()
    setLoading(false)

    if (!res.ok) { setErrore(json.error ?? 'Errore salvataggio'); return }
    router.push('/artigiano/dashboard')
  }

  if (caricando) return (
    <div style={{ height:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'#111111' }}>
      <p style={{ color:'rgba(255,255,255,0.4)' }}>Caricamento…</p>
    </div>
  )

  const B = 'rgba(255,255,255,0.10)', INP = 'rgba(255,255,255,0.06)'

  return (
    <div style={{ minHeight:'100dvh', background:'#111111', display:'flex', flexDirection:'column', color:'#fff' }}>

      {/* Header */}
      <div style={{ padding:'20px 20px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:12, background:'rgba(255,255,255,0.03)' }}>
        {isModifica && (
          <button onClick={() => router.push('/artigiano/dashboard')} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#fff' }}>←</button>
        )}
        <div>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>
            {isModifica ? 'Modifica profilo' : 'Configurazione profilo'}
          </p>
          <p style={{ fontWeight:800, fontSize:20, color:'#fff', margin:'4px 0 2px' }}>
            {isModifica ? 'Aggiorna i tuoi dati' : 'Completa il tuo profilo'}
          </p>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', margin:0 }}>
            {isModifica ? 'Le modifiche vengono applicate immediatamente.' : 'Fatto questo, sarai visibile ai clienti sulla mappa.'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div style={{ flex:1, overflowY:'auto', padding:'24px 20px' }}>

        {/* Nome */}
        <label style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.4)', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.08em' }}>Nome e Cognome *</label>
        <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Mario Rossi"
          style={{ width:'100%', height:48, borderRadius:14, border:`1.5px solid ${B}`, background:INP, padding:'0 16px', fontSize:15, color:'#fff', outline:'none', boxSizing:'border-box', marginBottom:16 }} />

        {/* Telefono */}
        <label style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.4)', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.08em' }}>Telefono *</label>
        <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+39 333 1234567"
          style={{ width:'100%', height:48, borderRadius:14, border:`1.5px solid ${B}`, background:INP, padding:'0 16px', fontSize:15, color:'#fff', outline:'none', boxSizing:'border-box', marginBottom:16 }} />

        {/* Categoria */}
        <label style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.4)', display:'block', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.08em' }}>Categoria *</label>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
          {CATEGORIE.map(({ id, emoji }) => (
            <button key={id} onClick={() => setCategoria(id)} style={{
              display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:14,
              border:`1.5px solid ${categoria===id ? '#E03A1E' : B}`,
              background:categoria===id ? 'rgba(224,58,30,0.12)' : INP,
              cursor:'pointer', textAlign:'left',
            }}>
              <span style={{ fontSize:22 }}>{emoji}</span>
              <span style={{ fontWeight:600, fontSize:14, color:categoria===id ? '#FF8C6B' : '#fff' }}>{id}</span>
              {categoria===id && <span style={{ marginLeft:'auto', color:'#E03A1E' }}>✓</span>}
            </button>
          ))}
        </div>

        {/* Indirizzo */}
        <label style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.4)', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.08em' }}>Indirizzo</label>
        <input value={indirizzo} onChange={e => setIndirizzo(e.target.value)} placeholder="Via Roma 1, Brescia"
          style={{ width:'100%', height:48, borderRadius:14, border:`1.5px solid ${B}`, background:INP, padding:'0 16px', fontSize:15, color:'#fff', outline:'none', boxSizing:'border-box', marginBottom:16 }} />

        {/* P.IVA */}
        <label style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.4)', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.08em' }}>Partita IVA</label>
        <input value={partitaIva} onChange={e => setPartitaIva(e.target.value)} placeholder="12345678901"
          style={{ width:'100%', height:48, borderRadius:14, border:`1.5px solid ${B}`, background:INP, padding:'0 16px', fontSize:15, color:'#fff', outline:'none', boxSizing:'border-box', marginBottom:16 }} />

        {/* IBAN */}
        <label style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.4)', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.08em' }}>IBAN *</label>
        <input value={iban} onChange={e => setIban(e.target.value)} placeholder="IT60 X054 2811 1010 0000 0123 456"
          style={{ width:'100%', height:48, borderRadius:14, border:`1.5px solid ${B}`, background:INP, padding:'0 16px', fontSize:15, color:'#fff', outline:'none', boxSizing:'border-box', marginBottom:16 }} />

        {/* Costi chiamata */}
        <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:16, padding:16, marginBottom:16, border:'1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.4)', marginBottom:14, textTransform:'uppercase', letterSpacing:'0.08em' }}>Costi fissi di chiamata</p>
          <div style={{ display:'flex', gap:12 }}>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:11, fontWeight:600, color:'#FF6B6B', display:'block', marginBottom:6 }}>🚨 SOS (€)</label>
              <input type="number" min="0" value={costoSos} onChange={e => setCostoSos(e.target.value)}
                style={{ width:'100%', height:48, borderRadius:12, border:'1.5px solid rgba(255,107,107,0.3)', background:'rgba(255,107,107,0.08)', padding:'0 12px', fontSize:20, fontWeight:800, color:'#FF6B6B', textAlign:'center', outline:'none', boxSizing:'border-box' }} />
            </div>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:11, fontWeight:600, color:'#FFB347', display:'block', marginBottom:6 }}>⚡ In giornata (€)</label>
              <input type="number" min="0" value={costoUrgente} onChange={e => setCostoUrgente(e.target.value)}
                style={{ width:'100%', height:48, borderRadius:12, border:'1.5px solid rgba(255,179,71,0.3)', background:'rgba(255,179,71,0.08)', padding:'0 12px', fontSize:20, fontWeight:800, color:'#FFB347', textAlign:'center', outline:'none', boxSizing:'border-box' }} />
            </div>
          </div>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:10, lineHeight:1.5 }}>Importo pre-autorizzato sul cliente al momento della richiesta.</p>
        </div>

        {/* Costo orario */}
        <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:16, padding:16, marginBottom:16, border:'1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.4)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.08em' }}>Costo orario</p>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:12, lineHeight:1.5 }}>Mostrato al cliente. Minimo 30 minuti.</p>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:20, color:'rgba(255,255,255,0.4)' }}>€</span>
            <input type="number" min="0" value={costoOrario} onChange={e => setCostoOrario(e.target.value)}
              style={{ width:100, height:52, borderRadius:12, border:`1.5px solid ${B}`, background:INP, padding:'0 12px', fontSize:22, fontWeight:800, color:'#fff', textAlign:'center', outline:'none', boxSizing:'border-box' }} />
            <span style={{ fontSize:14, color:'rgba(255,255,255,0.4)' }}>/ora</span>
          </div>
        </div>

        {errore && (
          <div style={{ background:'rgba(255,107,107,0.1)', borderRadius:12, padding:'10px 14px', fontSize:13, color:'#FF6B6B', marginBottom:16, border:'1px solid rgba(255,107,107,0.25)' }}>
            {errore}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding:'16px 20px 32px', borderTop:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.3)' }}>
        {!isModifica && (
          <label style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:16, cursor:'pointer' }}>
            <input type="checkbox" checked={accettaTermini} onChange={e => setAccettaTermini(e.target.checked)}
              style={{ width:20, height:20, marginTop:2, flexShrink:0, cursor:'pointer', accentColor:'#E03A1E' }} />
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)', lineHeight:1.6 }}>
              Ho letto e accetto i{' '}
              <a href="/termini-e-condizioni" target="_blank" rel="noopener noreferrer" style={{ color:'#FF8C6B', fontWeight:600, textDecoration:'underline' }}>Termini e Condizioni</a>
              {' '}e l'<a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color:'#FF8C6B', fontWeight:600, textDecoration:'underline' }}>Informativa Privacy</a>.
            </span>
          </label>
        )}
        <button onClick={salva} disabled={loading || (!isModifica && !accettaTermini)}
          style={{ width:'100%', height:54, borderRadius:16, border:'none', background:(loading || (!isModifica && !accettaTermini)) ? '#333' : 'linear-gradient(135deg, #E03A1E, #D85A30)', color:'#fff', fontWeight:800, fontSize:16, cursor:(loading || (!isModifica && !accettaTermini)) ? 'not-allowed' : 'pointer', boxShadow:(loading || (!isModifica && !accettaTermini)) ? 'none' : '0 6px 20px rgba(224,58,30,0.4)' }}>
          {loading ? 'Salvataggio…' : isModifica ? '✅ Aggiorna profilo' : '✅ Salva e vai alla dashboard'}
        </button>
      </div>
    </div>
  )
}
