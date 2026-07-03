// src/app/artigiano/dashboard/page.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase }  from '@/lib/supabase'
import type { Artigiano, Intervento, TipoUrgenza } from '@/types'

const C = {
  arancio: '#D85A30', rosso: '#E24B4A', ambra: '#EF9F27',
  teal: '#1D9E75', grigio: '#888780', grigioC: '#F1EFE8',
  bordo: '#E5E4E0', testo: '#2C2C2A', testoS: '#888780', bianco: '#FFFFFF',
}

// ─── Timer 3 minuti ───────────────────────────────────────────────────────────
function Timer({ scadeAt, onScaduto }: { scadeAt: string; onScaduto: () => void }) {
  const [secondi, setSecondi] = useState(() =>
    Math.max(0, Math.floor((new Date(scadeAt).getTime() - Date.now()) / 1000))
  )

  useEffect(() => {
    if (secondi <= 0) { onScaduto(); return }
    const id = setInterval(() => setSecondi(s => {
      if (s <= 1) { onScaduto(); clearInterval(id); return 0 }
      return s - 1
    }), 1000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const min = Math.floor(secondi / 60)
  const sec = secondi % 60
  const pct = (secondi / 180) * 100
  const urgente = secondi < 60

  // Cerchio SVG
  const r = 38, circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 100, height: 100 }}>
        <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="#E5E4E0" strokeWidth="6"/>
          <circle cx="50" cy="50" r={r} fill="none"
            stroke={urgente ? C.rosso : C.ambra}
            strokeWidth="6"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontSize: 24, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
            color: urgente ? '#FF6B6B' : '#ffffff',
          }}>
            {min}:{String(sec).padStart(2, '0')}
          </span>
        </div>
      </div>
      {urgente && (
        <p style={{ fontSize: 12, color: C.rosso, fontWeight: 600 }}>
          ⚡ Rispondi subito!
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardArtigiano() {
  const [artigiano,     setArtigiano]     = useState<Artigiano | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [online,        setOnline]        = useState(false)
  const [tipoOnline,    setTipoOnline]    = useState<TipoUrgenza>('sos')
  const [switching,     setSwitching]     = useState(false)
  const [intervento,    setIntervento]    = useState<Intervento | null>(null)
  const [totaleInput,   setTotaleInput]   = useState('')
  const [inviando,      setInviando]      = useState(false)
  const [errore,        setErrore]        = useState('')
  const gpsWatchRef = useRef<number | null>(null)

  // ── Carica profilo artigiano + ripristina intervento attivo ────────────────
  useEffect(() => {
    fetch('/api/artigiano')
      .then(r => r.json())
      .then(async j => {
        if (!j.artigiano) { setLoading(false); return }

        const art = j.artigiano
        setArtigiano(art)

        // Cerca un intervento attivo per questo artigiano
        // (fasi in cui l'artigiano deve ancora fare qualcosa)
        const { data: intAttivo } = await supabase
          .from('interventi')
          .select('*')
          .eq('artigiano_id', art.id)
          .in('fase', ['richiesto', 'accettato', 'ritardo', 'valutazione', 'approvato'])
          .order('creato_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (intAttivo) {
          // Ripristina l'intervento — l'artigiano era nel mezzo di qualcosa
          console.log('[dashboard] ripristino intervento:', intAttivo.id, intAttivo.fase)
          setIntervento(intAttivo as Intervento)
          // Se era in viaggio, riavvia il GPS
          if (intAttivo.fase === 'accettato') {
            setOnline(true)
          }
        } else {
          // Nessun intervento attivo — reset OFFLINE pulito
          await supabase
            .from('artigiani_disponibili')
            .delete()
            .eq('artigiano_id', art.id)
          setOnline(false)
        }

        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Controllo sessione ───────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) window.location.href = '/artigiano/login'
    })
  }, [])

  // ── Subscriptions Realtime su interventi ─────────────────────────────────
  useEffect(() => {
    if (!artigiano) return

    const ch = supabase
      .channel('interventi_artigiano')
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'interventi',
        filter: `artigiano_id=eq.${artigiano.id}`,
      }, (payload) => {
        console.log('[dashboard] nuovo intervento:', payload.new)
        setIntervento(payload.new as Intervento)
        // Notifica sonora — beep urgente
        try {
          const ctx = new AudioContext()
          const suonaSin = (freq: number, start: number, dur: number) => {
            const osc  = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain); gain.connect(ctx.destination)
            osc.frequency.value = freq
            osc.type = 'sine'
            gain.gain.setValueAtTime(0.4, ctx.currentTime + start)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
            osc.start(ctx.currentTime + start)
            osc.stop(ctx.currentTime + start + dur)
          }
          // Tre beep crescenti
          suonaSin(880, 0.0, 0.15)
          suonaSin(880, 0.2, 0.15)
          suonaSin(1100, 0.4, 0.25)
        } catch (e) {
          console.warn('[beep]', e)
        }
      })
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'interventi',
        filter: `artigiano_id=eq.${artigiano.id}`,
      }, (payload) => {
        console.log('[dashboard] update intervento:', payload.new)
        setIntervento(payload.new as Intervento)
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [artigiano])

  // ── GPS tracking (solo quando online e fase = accettato) ─────────────────
  const avviaGps = useCallback((interventoId: string) => {
    if (!navigator.geolocation) return
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        // Aggiorna posizione sull'intervento
        await fetch(`/api/interventi/${interventoId}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artigiano_lat: pos.coords.latitude,
            artigiano_lng: pos.coords.longitude,
          }),
        })
        // Aggiorna attivato_at su artigiani_disponibili
        // così il job pg_cron sa che l'artigiano è ancora connesso
        if (artigiano) {
          await supabase
            .from('artigiani_disponibili')
            .update({ attivato_at: new Date().toISOString() })
            .eq('artigiano_id', artigiano.id)
        }
      },
      (e) => console.warn('[GPS]', e.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    )
  }, [artigiano])

  const fermaGps = useCallback(() => {
    if (gpsWatchRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchRef.current)
      gpsWatchRef.current = null
    }
  }, [])

  useEffect(() => {
    if (intervento?.fase === 'accettato') {
      avviaGps(intervento.id)
    } else {
      fermaGps()
    }
    return () => fermaGps()
  }, [intervento?.fase, intervento?.id, avviaGps, fermaGps])

  // ── Heartbeat: aggiorna attivato_at ogni 3 minuti quando online in attesa ──
  // Mantiene vivo il pin sulla mappa anche quando l'artigiano aspetta
  // richieste senza fare interventi (GPS fermo → attivato_at non si aggiorna).
  // Il valore 3 minuti è deliberatamente < 10 minuti (soglia del pg_cron)
  // per garantire che il pin non sparisca mai per un artigiano connesso.
  useEffect(() => {
    if (!online || !artigiano) return

    const INTERVALLO_HEARTBEAT_MS = 3 * 60 * 1000 // 3 minuti

    const id = setInterval(async () => {
      // Aggiorna solo se in attesa (non durante un intervento — lì ci pensa il GPS)
      if (!intervento || ['pagato', 'rifiutato', 'annullato'].includes(intervento.fase ?? '')) {
        await supabase
          .from('artigiani_disponibili')
          .update({ attivato_at: new Date().toISOString() })
          .eq('artigiano_id', artigiano.id)
      }
    }, INTERVALLO_HEARTBEAT_MS)

    return () => clearInterval(id)
  }, [online, artigiano, intervento?.fase])

  // ── Switch ON/OFF ────────────────────────────────────────────────────────
  async function toggleOnline() {
    if (!artigiano) return
    setSwitching(true)
    setErrore('')

    if (online) {
      // Va OFFLINE: rimuove da artigiani_disponibili
      await supabase
        .from('artigiani_disponibili')
        .delete()
        .eq('artigiano_id', artigiano.id)
      setOnline(false)
    } else {
      // Va ONLINE: ha bisogno del GPS
      if (!navigator.geolocation) {
        setErrore('GPS non disponibile sul browser')
        setSwitching(false)
        return
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { error } = await supabase
            .from('artigiani_disponibili')
            .upsert({
              artigiano_id: artigiano.id,
              tipo:         tipoOnline,
              lat:          pos.coords.latitude,
              lng:          pos.coords.longitude,
            }, { onConflict: 'artigiano_id' })

          if (error) {
            console.error('[toggle online]', error)
            setErrore('Errore attivazione')
          } else {
            setOnline(true)
          }
          setSwitching(false)
        },
        (e) => {
          setErrore('Abilita il GPS per apparire sulla mappa')
          console.error('[GPS]', e)
          setSwitching(false)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
      return
    }
    setSwitching(false)
  }

  // ── Accetta richiesta ────────────────────────────────────────────────────
  async function accetta() {
    if (!intervento) return
    setInviando(true)
    await fetch(`/api/interventi/${intervento.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ fase: 'accettato' }),
    })
    // Rimuovi dalla mappa — non disponibile durante l'intervento
    if (artigiano) {
      await supabase
        .from('artigiani_disponibili')
        .delete()
        .eq('artigiano_id', artigiano.id)
      setOnline(false)
    }
    setInviando(false)
  }

  // ── Avvisa cliente del ritardo ───────────────────────────────────────────
  async function faccioTardi() {
    if (!intervento) return
    setInviando(true)
    await fetch(`/api/interventi/${intervento.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ fase: 'ritardo' }),
    })
    setInviando(false)
  }

  // ── Rifiuta / timer scaduto ──────────────────────────────────────────────
  async function rifiuta() {
    if (!intervento) return
    const intId = intervento.id
    // Ricarica subito, la fetch va in background
    fetch(`/api/interventi/${intId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ fase: 'rifiutato' }),
    })
    window.location.reload()
  }

  // ── Proponi totale al cliente ─────────────────────────────────────────────
  async function proponiTotale() {
    if (!intervento || !totaleInput) return
    const totale = parseInt(totaleInput, 10)
    if (isNaN(totale) || totale <= 0) {
      setErrore('Inserisci un importo valido')
      return
    }
    setInviando(true)
    await fetch(`/api/interventi/${intervento.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ fase: 'valutazione', totale_proposto: totale }),
    })
    setInviando(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/artigiano/login'
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%', background: C.arancio,
              animation: 'bounce 1s ease-in-out infinite',
              animationDelay: `${i*150}ms`,
            }}/>
          ))}
        </div>
      </div>
    )
  }

  if (!artigiano) {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 36 }}>⚠️</p>
        <p style={{ fontWeight: 700, marginTop: 12 }}>Profilo non trovato</p>
        <button
          onClick={() => window.location.href = '/artigiano/onboarding'}
          style={{ marginTop: 20, padding: '12px 24px', borderRadius: 12, border: 'none', background: C.arancio, color: '#fff', fontWeight: 700, cursor: 'pointer' }}
        >
          Completa il profilo →
        </button>
      </div>
    )
  }

  // ── Render principale ────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: '#111111', display: 'flex', flexDirection: 'column', color: '#fff' }}>

      {/* Header scuro */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.03)',
      }}>
        <div>
          <p style={{ fontWeight: 800, fontSize: 17, color: '#fff', margin: 0 }}>{artigiano.nome}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{artigiano.categoria}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            background: online ? 'rgba(29,158,117,0.2)' : 'rgba(226,75,74,0.15)',
            color:      online ? '#4CD9A8' : '#FF6B6B',
            fontSize: 11, fontWeight: 700,
            padding: '5px 12px', borderRadius: 20,
            border: `1px solid ${online ? 'rgba(76,217,168,0.3)' : 'rgba(255,107,107,0.3)'}`,
          }}>
            {online ? '● ONLINE' : '○ OFFLINE'}
          </div>
          <button
            onClick={() => window.location.href = '/artigiano/onboarding'}
            style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '4px' }}
            title="Modifica profilo"
          >
            ✏️
          </button>
          <button
            onClick={logout}
            style={{ background: 'none', border: 'none', fontSize: 12, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontWeight: 600 }}
          >
            Esci
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>

        {/* ── MESSAGGI STATO FINALE (priorità massima) ── */}
        {intervento?.fase === 'rifiutato' && (
          <div style={{ background: 'rgba(226,75,74,0.12)', borderRadius: 16, padding: 20, marginBottom: 20, border: '1px solid rgba(226,75,74,0.3)' }}>
            <p style={{ fontWeight: 700, fontSize: 18, color: '#FF6B6B' }}>ℹ️ Il cliente ha rifiutato</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 8, lineHeight: 1.6 }}>
              Il cliente non ha accettato il totale proposto.<br/>
              Riceverai comunque il diritto di chiamata.
            </p>
            <button onClick={() => window.location.reload()} style={{
              marginTop: 16, width: '100%', height: 50, borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#fff',
              fontWeight: 700, fontSize: 15, cursor: 'pointer',
            }}>
              Torna alla dashboard
            </button>
          </div>
        )}

        {intervento?.fase === 'annullato' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, marginBottom: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontWeight: 700, fontSize: 18, color: '#fff' }}>🔍 Intervento annullato</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 8, lineHeight: 1.6 }}>
              Il cliente ha scelto di cercare un altro artigiano.<br/>
              Nessun addebito.
            </p>
            <button onClick={() => window.location.reload()} style={{
              marginTop: 16, width: '100%', height: 50, borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#fff',
              fontWeight: 700, fontSize: 15, cursor: 'pointer',
            }}>
              Torna alla dashboard
            </button>
          </div>
        )}

        {/* ── NESSUN INTERVENTO ATTIVO: switch e selezione tipo ── */}
        {(!intervento || ['pagato', 'rifiutato'].includes(intervento.fase)) && (
          <>
            {/* Selezione tipo SOS / In giornata (visibile solo se offline) */}
            {!online && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  Con che disponibilità vuoi attivarti?
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(['sos', 'urgente'] as TipoUrgenza[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setTipoOnline(t)}
                      style={{
                        flex: 1, padding: '16px 8px', borderRadius: 16,
                        border: `2px solid ${tipoOnline === t
                          ? (t === 'sos' ? '#E03A1E' : '#D4841A')
                          : 'rgba(255,255,255,0.1)'}`,
                        background: tipoOnline === t
                          ? (t === 'sos' ? 'rgba(224,58,30,0.15)' : 'rgba(212,132,26,0.12)')
                          : 'rgba(255,255,255,0.04)',
                        cursor: 'pointer', textAlign: 'center',
                      }}
                    >
                      <p style={{ fontSize: 22, margin: 0 }}>{t === 'sos' ? '🚨' : '⚡'}</p>
                      <p style={{ fontWeight: 800, fontSize: 14, color: t === 'sos' ? '#FF6B6B' : '#FFB347', marginTop: 6, margin: '6px 0 2px' }}>
                        {t === 'sos' ? 'SOS' : 'In giornata'}
                      </p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                        {t === 'sos' ? 'entro 2 ore' : 'entro 4-6 ore'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Switch ON/OFF — grande, impattante */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 28 }}>
              <button
                onClick={toggleOnline}
                disabled={switching}
                style={{
                  width: 140, height: 140, borderRadius: '50%', border: 'none',
                  background: switching
                    ? '#333'
                    : online
                      ? 'linear-gradient(135deg, #1DB888 0%, #15906A 100%)'
                      : 'linear-gradient(135deg, #E03A1E 0%, #B52E16 100%)',
                  color: '#fff', fontWeight: 800, fontSize: 15,
                  cursor: switching ? 'not-allowed' : 'pointer',
                  boxShadow: online
                    ? '0 0 0 16px rgba(29,184,136,0.12), 0 8px 32px rgba(29,184,136,0.4)'
                    : '0 0 0 16px rgba(224,58,30,0.1), 0 8px 32px rgba(224,58,30,0.35)',
                  transition: 'all 0.3s ease',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}
              >
                <span style={{ fontSize: 36 }}>⏻</span>
                <span style={{ fontSize: 13 }}>{switching ? '…' : (online ? 'ONLINE' : 'OFFLINE')}</span>
              </button>

              {online && (
                <p style={{ fontSize: 14, color: '#4CD9A8', fontWeight: 600, textAlign: 'center', lineHeight: 1.5 }}>
                  Visibile come {tipoOnline === 'sos' ? '🚨 SOS' : '⚡ In giornata'}<br/>
                  <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
                    I clienti possono contattarti
                  </span>
                </p>
              )}
              {!online && (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
                  Premi per renderti disponibile sulla mappa
                </p>
              )}
            </div>

            {errore && (
              <div style={{ background: 'rgba(226,75,74,0.12)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#FF6B6B', marginBottom: 16, border: '1px solid rgba(226,75,74,0.3)' }}>
                {errore}
              </div>
            )}

            {/* Info costi */}
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                I tuoi costi di chiamata
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, background: 'rgba(224,58,30,0.1)', borderRadius: 12, padding: '12px 14px', textAlign: 'center', border: '1px solid rgba(224,58,30,0.2)' }}>
                  <p style={{ fontSize: 11, color: '#FF6B6B', fontWeight: 600, margin: 0 }}>🚨 SOS</p>
                  <p style={{ fontSize: 24, fontWeight: 800, color: '#FF6B6B', marginTop: 6, margin: '6px 0 0' }}>€ {artigiano.costo_chiamata_sos}</p>
                </div>
                <div style={{ flex: 1, background: 'rgba(212,132,26,0.1)', borderRadius: 12, padding: '12px 14px', textAlign: 'center', border: '1px solid rgba(212,132,26,0.2)' }}>
                  <p style={{ fontSize: 11, color: '#FFB347', fontWeight: 600, margin: 0 }}>⚡ In giornata</p>
                  <p style={{ fontSize: 24, fontWeight: 800, color: '#FFB347', marginTop: 6, margin: '6px 0 0' }}>€ {artigiano.costo_chiamata_urgente}</p>
                </div>
              </div>
              <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Costo orario (min. 30 min)</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>€ {(artigiano as unknown as { costo_orario?: number }).costo_orario ?? 60}/h</p>
              </div>
            </div>

            {/* Storico lavori */}
            <StoricoArtigiano artigianoId={artigiano.id} />

            {/* Cliente ha rifiutato il totale */}
            {intervento && intervento.fase === 'rifiutato' && (
              <div style={{ background: '#FCEBEB', borderRadius: 12, padding: 16, marginTop: 16 }}>
                <p style={{ fontWeight: 700, fontSize: 16, color: C.rosso }}>
                  ℹ️ Il cliente ha rifiutato
                </p>
                <p style={{ fontSize: 13, color: C.testoS, marginTop: 6, lineHeight: 1.5 }}>
                  Il cliente non ha accettato il totale proposto. Riceverai comunque il diritto di chiamata.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    marginTop: 14, width: '100%', height: 46, borderRadius: 12,
                    border: 'none', background: C.testo, color: C.bianco,
                    fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Torna alla dashboard
                </button>
              </div>
            )}

            {/* Cliente ha annullato la richiesta */}
            {intervento && intervento.fase === 'annullato' && (
              <div style={{ background: C.grigioC, borderRadius: 12, padding: 16, marginTop: 16 }}>
                <p style={{ fontWeight: 700, fontSize: 16, color: C.testo }}>
                  🔍 Intervento annullato
                </p>
                <p style={{ fontSize: 13, color: C.testoS, marginTop: 6, lineHeight: 1.5 }}>
                  Il cliente ha scelto di cercare un altro artigiano. Nessun addebito.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    marginTop: 14, width: '100%', height: 46, borderRadius: 12,
                    border: 'none', background: C.testo, color: C.bianco,
                    fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Torna alla dashboard
                </button>
              </div>
            )}

            {/* Completato */}
            {intervento && intervento.fase === 'pagato' && (
              <div style={{ background: '#E1F5EE', borderRadius: 12, padding: 14, marginTop: 16 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: C.teal }}>
                  ✅ Intervento completato!
                </p>
                <p style={{ fontSize: 13, color: C.testoS, marginTop: 4 }}>
                  Il pagamento è in arrivo sul tuo IBAN.
                </p>
              </div>
            )}
          </>
        )}

        {/* ── RICHIESTA IN ARRIVO (fase: richiesto, timer 5 min) ── */}
        {intervento?.fase === 'richiesto' && (
          <div>
            <div style={{
              background: '#FCEBEB', borderRadius: 16, padding: 16, marginBottom: 20,
              border: `1.5px solid ${C.rosso}`,
            }}>
              <p style={{ fontWeight: 700, fontSize: 16, color: C.rosso }}>
                🔔 Nuova richiesta!
              </p>
              <p style={{ fontSize: 13, color: C.testoS, marginTop: 4 }}>
                Hai 5 minuti per rispondere prima che la richiesta venga annullata.
              </p>
            </div>

            {intervento.scade_at && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <Timer scadeAt={intervento.scade_at} onScaduto={rifiuta} />
              </div>
            )}

            {/* Mappa statica della zona dell'intervento */}
            {intervento.indirizzo_lat && intervento.indirizzo_lng && (
              <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 14, border: `1px solid ${C.bordo}` }}>
                <img
                  src={`https://maps.googleapis.com/maps/api/staticmap?center=${intervento.indirizzo_lat},${intervento.indirizzo_lng}&zoom=15&size=600x280&scale=2&markers=color:0xD85A30%7C${intervento.indirizzo_lat},${intervento.indirizzo_lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`}
                  alt="Posizione intervento"
                  style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                />
              </div>
            )}

            {/* Indirizzo */}
            {intervento.indirizzo && (
              <div style={{ background: C.grigioC, borderRadius: 14, padding: 16, marginBottom: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>📍</span>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: C.testoS, marginBottom: 4 }}>
                    INDIRIZZO INTERVENTO
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: C.testo, lineHeight: 1.4 }}>
                    {intervento.indirizzo}
                  </p>
                </div>
              </div>
            )}

            {/* Dettagli richiesta */}
            <div style={{ background: C.grigioC, borderRadius: 14, padding: 16, marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: C.testoS, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Dettagli richiesta
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: C.testoS }}>Tipo</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: intervento.tipo_urgenza === 'sos' ? C.rosso : C.ambra }}>
                  {intervento.tipo_urgenza === 'sos' ? '🚨 SOS' : '⚡ In giornata'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: intervento.descrizione ? 12 : 0 }}>
                <span style={{ fontSize: 13, color: C.testoS }}>Costo chiamata</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: C.arancio }}>€ {intervento.costo_chiamata}</span>
              </div>
              {intervento.descrizione && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.bordo}` }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: C.testoS, marginBottom: 6 }}>
                    PROBLEMA SEGNALATO DAL CLIENTE
                  </p>
                  <p style={{ fontSize: 14, color: C.testo, lineHeight: 1.6 }}>
                    💬 {intervento.descrizione}
                  </p>
                </div>
              )}
              <p style={{ fontSize: 11, color: C.testoS, marginTop: 10, lineHeight: 1.5 }}>
                🔒 Nome e numero di telefono del cliente saranno visibili
                solo dopo che avrai accettato la richiesta.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={rifiuta}
                style={{
                  flex: 1, height: 50, borderRadius: 14, border: `1.5px solid ${C.bordo}`,
                  background: C.bianco, color: C.testoS, fontWeight: 700, fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Rifiuta
              </button>
              <button
                onClick={accetta}
                disabled={inviando}
                style={{
                  flex: 2, height: 50, borderRadius: 14, border: 'none',
                  background: inviando ? '#ccc' : C.teal,
                  color: C.bianco, fontWeight: 700, fontSize: 14,
                  cursor: inviando ? 'not-allowed' : 'pointer',
                }}
              >
                {inviando ? 'Accettando…' : '✅ Accetta'}
              </button>
            </div>
          </div>
        )}

        {/* ── IN VIAGGIO (fase: accettato) ── */}
        {intervento?.fase === 'accettato' && (
          <div>
            <div style={{ background: '#E1F5EE', borderRadius: 16, padding: 16, marginBottom: 20, border: `1.5px solid ${C.teal}` }}>
              <p style={{ fontWeight: 700, fontSize: 16, color: C.teal }}>🚗 Intervento accettato</p>
              <p style={{ fontSize: 13, color: C.testoS, marginTop: 4 }}>
                Il cliente vede la tua posizione in tempo reale sulla mappa.
                Il GPS si aggiorna automaticamente.
              </p>
            </div>

            {/* Riferimenti cliente — sbloccati dopo l'accettazione */}
            {intervento.cliente_telefono && (
              <div style={{ background: C.grigioC, borderRadius: 14, padding: 16, marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: C.testoS, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  Riferimenti cliente
                </p>

                {(intervento.cliente_nome || intervento.cliente_cognome) && (
                  <div style={{ background: C.bianco, borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                    <p style={{ fontSize: 12, color: C.testoS }}>Cliente</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: C.testo }}>
                      {intervento.cliente_nome} {intervento.cliente_cognome}
                    </p>
                  </div>
                )}

                <a
                  href={`tel:${intervento.cliente_telefono}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: C.bianco, borderRadius: 10, padding: '10px 14px',
                    textDecoration: 'none', color: C.testo, marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 20 }}>📞</span>
                  <div>
                    <p style={{ fontSize: 12, color: C.testoS }}>Chiama il cliente</p>
                    <p style={{ fontSize: 15, fontWeight: 700 }}>{intervento.cliente_telefono}</p>
                  </div>
                </a>

                {intervento.indirizzo && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(intervento.indirizzo)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: C.bianco, borderRadius: 10, padding: '10px 14px',
                      textDecoration: 'none', color: C.testo,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>📍</span>
                    <div>
                      <p style={{ fontSize: 12, color: C.testoS }}>Apri in Google Maps</p>
                      <p style={{ fontSize: 14, fontWeight: 600 }}>{intervento.indirizzo}</p>
                    </div>
                  </a>
                )}
              </div>
            )}

            {/* Pulsante faccio tardi */}
            <div style={{ background: '#FAEEDA', borderRadius: 14, padding: 16, marginBottom: 20, border: `1.5px solid ${C.ambra}` }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: '#854F0B', marginBottom: 6 }}>
                ⚠️ Hai un imprevisto?
              </p>
              <p style={{ fontSize: 12, color: '#854F0B', marginBottom: 12, lineHeight: 1.5 }}>
                Se sei bloccato nel traffico o hai un problema, avvisa il cliente.
                Potrà scegliere se aspettarti (passando a "In giornata") o cercare qualcun altro.
              </p>
              <button
                onClick={faccioTardi}
                disabled={inviando}
                style={{
                  width: '100%', height: 46, borderRadius: 12, border: 'none',
                  background: inviando ? '#ccc' : C.ambra,
                  color: C.bianco, fontWeight: 700, fontSize: 14,
                  cursor: inviando ? 'not-allowed' : 'pointer',
                }}
              >
                {inviando ? 'Invio…' : '⏰ Avvisa: faccio tardi'}
              </button>
            </div>

            {/* Form stima costo */}
            <div style={{ background: C.bianco, border: `1px solid ${C.bordo}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: C.testoS, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Proponi il costo del lavoro
              </p>
              <p style={{ fontSize: 13, color: C.testoS, marginBottom: 14, lineHeight: 1.5 }}>
                Una volta sul posto, inserisci il totale stimato.
                Il cliente deciderà se accettare.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: C.testoS }}>€</span>
                <input
                  type="number"
                  min="0"
                  value={totaleInput}
                  onChange={e => setTotaleInput(e.target.value)}
                  placeholder="150"
                  style={{
                    flex: 1, height: 54, borderRadius: 12,
                    border: `1.5px solid ${totaleInput ? C.arancio : C.bordo}`,
                    padding: '0 14px', fontSize: 26, fontWeight: 800,
                    color: C.arancio, outline: 'none', boxSizing: 'border-box',
                    textAlign: 'center',
                  }}
                />
              </div>
              {totaleInput && (
                <p style={{ fontSize: 12, color: C.testoS, marginBottom: 14 }}>
                  Il cliente pagherà: € {intervento.costo_chiamata} (chiamata) + € {totaleInput} (lavoro)
                  {' '}= <strong>€ {intervento.costo_chiamata + parseInt(totaleInput || '0', 10)}</strong>
                </p>
              )}
              <button
                onClick={proponiTotale}
                disabled={inviando || !totaleInput}
                style={{
                  width: '100%', height: 48, borderRadius: 12, border: 'none',
                  background: (inviando || !totaleInput) ? '#ccc' : C.arancio,
                  color: C.bianco, fontWeight: 700, fontSize: 14,
                  cursor: (inviando || !totaleInput) ? 'not-allowed' : 'pointer',
                }}
              >
                {inviando ? 'Invio…' : 'Invia proposta al cliente →'}
              </button>
            </div>

            {errore && (
              <p style={{ fontSize: 12, color: C.rosso }}>{errore}</p>
            )}
          </div>
        )}

        {/* ── IN ATTESA RISPOSTA CLIENTE (fase: valutazione) ── */}
        {intervento?.fase === 'valutazione' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 20px' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(239,159,39,0.12)', animation: 'ping 1.4s cubic-bezier(0,0,.2,1) infinite' }}/>
              <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', background: 'rgba(239,159,39,0.2)', animation: 'ping 1.4s cubic-bezier(0,0,.2,1) infinite', animationDelay: '.4s' }}/>
              <div style={{ position: 'absolute', inset: 20, borderRadius: '50%', background: C.ambra, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⏳</div>
            </div>
            <p style={{ fontWeight: 700, fontSize: 18, color: C.testo }}>In attesa del cliente</p>
            <p style={{ fontSize: 13, color: C.testoS, marginTop: 8, lineHeight: 1.6 }}>
              Hai proposto <strong>€ {intervento.totale_proposto}</strong> per il lavoro.<br/>
              Il cliente riceverà una notifica.
            </p>
          </div>
        )}

        {/* ── LAVORO IN CORSO (fase: approvato) ── */}
        {intervento?.fase === 'approvato' && (
          <div>
            <div style={{ background: '#E1F5EE', borderRadius: 16, padding: 16, marginBottom: 20, border: '1.5px solid #1D9E75' }}>
              <p style={{ fontWeight: 700, fontSize: 16, color: '#1D5C42' }}>
                ✅ Preventivo accettato — al lavoro!
              </p>
              <p style={{ fontSize: 13, color: '#2D7A5A', marginTop: 6, lineHeight: 1.6 }}>
                Il cliente ha accettato la stima di <strong>€ {intervento.totale_proposto}</strong>.
                Il pagamento sarà confermato quando il cliente premerà "Lavoro terminato".
              </p>
            </div>

            {/* Riepilogo importo atteso */}
            <div style={{ background: C.grigioC, borderRadius: 14, padding: 16, marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: C.testoS, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Importo che riceverai
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: C.testoS }}>Diritto di chiamata</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.testo }}>€ {intervento.costo_chiamata}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: C.testoS }}>Lavoro concordato</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.testo }}>€ {intervento.totale_proposto}</span>
              </div>
              <div style={{ height: 1, background: C.bordo, marginBottom: 8 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.testo }}>Totale</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: C.arancio }}>
                  € {intervento.costo_chiamata + (intervento.totale_proposto ?? 0)}
                </span>
              </div>
            </div>

            {/* Possibilità di rifare proposta */}
            <div style={{ background: C.bianco, border: `1px solid ${C.bordo}`, borderRadius: 14, padding: 16 }}>
              <p style={{ fontSize: 13, color: C.testoS, marginBottom: 14, lineHeight: 1.5 }}>
                Se il lavoro richiede più del previsto, puoi proporre un nuovo importo.
                Il cliente dovrà approvare nuovamente prima che tu possa procedere.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: C.testoS }}>€</span>
                <input
                  type="number"
                  min="0"
                  value={totaleInput}
                  onChange={e => setTotaleInput(e.target.value)}
                  placeholder="Nuovo importo"
                  style={{
                    flex: 1, height: 50, borderRadius: 12,
                    border: `1.5px solid ${totaleInput ? C.arancio : C.bordo}`,
                    padding: '0 14px', fontSize: 22, fontWeight: 800,
                    color: C.arancio, outline: 'none', boxSizing: 'border-box',
                    textAlign: 'center',
                  }}
                />
              </div>
              <button
                onClick={proponiTotale}
                disabled={inviando || !totaleInput}
                style={{
                  width: '100%', height: 46, borderRadius: 12, border: 'none',
                  background: (inviando || !totaleInput) ? '#ccc' : C.ambra,
                  color: C.bianco, fontWeight: 700, fontSize: 14,
                  cursor: (inviando || !totaleInput) ? 'not-allowed' : 'pointer',
                }}
              >
                {inviando ? 'Invio…' : '📝 Invia nuova proposta al cliente'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Storico lavori ───────────────────────────────────────────────────────────

function StoricoArtigiano({ artigianoId }: { artigianoId: string }) {
  const [storico,  setStorico]  = useState<{
    id: string; tipo_urgenza: string; costo_chiamata: number;
    totale_proposto: number | null; stelle_cliente: number | null; creato_at: string
  }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('interventi')
      .select('id, tipo_urgenza, costo_chiamata, totale_proposto, stelle_cliente, creato_at')
      .eq('artigiano_id', artigianoId)
      .eq('fase', 'pagato')
      .order('creato_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setStorico(data ?? [])
        setLoading(false)
      })
  }, [artigianoId])

  const totaleGuadagnato = storico.reduce((acc, i) =>
    acc + i.costo_chiamata + (i.totale_proposto ?? 0), 0)

  if (loading || storico.length === 0) return null

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
          Ultimi lavori
        </p>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#4CD9A8', margin: 0 }}>
          Totale: € {totaleGuadagnato}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {storico.map(i => (
          <div key={i.id} style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '10px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>
                {i.tipo_urgenza === 'sos' ? '🚨 SOS' : '⚡ In giornata'}
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                {new Date(i.creato_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                {i.stelle_cliente ? ` · ${'★'.repeat(i.stelle_cliente)}` : ''}
              </p>
            </div>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#FFB347', margin: 0 }}>
              € {i.costo_chiamata + (i.totale_proposto ?? 0)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
