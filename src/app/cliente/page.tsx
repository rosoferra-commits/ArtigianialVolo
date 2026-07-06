// src/app/cliente/page.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader }                                    from '@googlemaps/js-api-loader'
import { useArtigianiDisponibili }                   from '@/hooks/useArtigianiDisponibili'
import { useIntervento }                             from '@/hooks/useIntervento'
import { useGeolocazione }                           from '@/hooks/useGeolocazione'
import type { ArtigianoDisponibile, TipoUrgenza, FaseIntervento, Categoria } from '@/types'
import { CATEGORIE } from '@/types'

// ─── Colori ────────────────────────────────────────────────────────────────────
const C = {
  arancio:  '#D85A30',
  rosso:    '#E24B4A',
  ambra:    '#EF9F27',
  teal:     '#1D9E75',
  grigio:   '#888780',
  grigioC:  '#F1EFE8',
  bordo:    '#E5E4E0',
  testo:    '#2C2C2A',
  testoS:   '#888780',
  bianco:   '#FFFFFF',
} as const

// ─── Colore pin per tipo urgenza ───────────────────────────────────────────────
const PIN_COLORE: Record<TipoUrgenza, string> = {
  sos:     C.rosso,
  urgente: C.ambra,
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ClientePage() {
  // GPS cliente
  const { pos: posCliente, errore: erroreGps } = useGeolocazione()

  // Filtro urgenza sulla mappa (null = mostra tutti)
  const [filtro, setFiltro] = useState<TipoUrgenza | null>(null)

  // Filtro categoria (null = tutte)
  const [filtroCategoria, setFiltroCategoria] = useState<Categoria | null>(null)

  // Artigiani disponibili (realtime) — filtro urgenza + geofencing
  const { lista: artigianiRaw, loading: loadingArtigiani } = useArtigianiDisponibili(filtro, posCliente)

  // Filtro categoria applicato lato client (nessun round-trip al DB)
  const artigiani = filtroCategoria
    ? artigianiRaw.filter(a => a.categoria === filtroCategoria)
    : artigianiRaw

  // Artigiano selezionato (click sul pin → bottom sheet)
  const [selezionato, setSelezionato] = useState<ArtigianoDisponibile | null>(null)

  // ID intervento attivo — inizializzato dal localStorage se presente
  // (ripristino sessione dopo chiusura accidentale del browser)
  const [interventoId, setInterventoIdRaw] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('aav_intervento_id')
  })

  // Wrapper che sincronizza lo stato con localStorage
  const setInterventoId = (id: string | null) => {
    setInterventoIdRaw(id)
    if (id) {
      localStorage.setItem('aav_intervento_id', id)
    } else {
      localStorage.removeItem('aav_intervento_id')
    }
  }

  // Intervento realtime — quando diventa 'annullato' resetta tutto automaticamente
  const { intervento, loading: loadingInt, errore: erroreInt } = useIntervento(
    interventoId,
    () => { setInterventoId(null); setArtigianoInCoda(null) }
  )

  // Stato invio (spinner sul bottone "Chiama")
  const [invio, setInvio] = useState(false)

  // Stelle recensione
  const [stelle, setStelle] = useState(0)
  const [mostraStelle, setMostraStelle] = useState(false)

  // Mappa Google Maps
  const mapRef          = useRef<HTMLDivElement>(null)
  const mapObj          = useRef<google.maps.Map | null>(null)
  const markersRef      = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map())
  const mapReady        = useRef(false)
  const clienteMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)

  // Resetta mapReady quando torna alla mappa (interventoId → null)
  useEffect(() => {
    if (!interventoId) {
      mapReady.current = false
      mapObj.current   = null
      clienteMarkerRef.current = null
    }
  }, [interventoId])

  // ── Inizializza mappa ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapReady.current) return
    mapReady.current = true

    new Loader({
      apiKey:    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
      version:   'weekly',
      libraries: ['marker', 'places'],
    }).load().then(async () => {
      const { Map } = await google.maps.importLibrary('maps') as google.maps.MapsLibrary
      mapObj.current = new Map(mapRef.current!, {
        zoom:             15,   // più ravvicinato (era 13)
        center:           posCliente ?? { lat: 45.5416, lng: 10.2118 },
        mapId:            'artigiani_al_volo',
        disableDefaultUI: true,
        gestureHandling:  'greedy',
        clickableIcons:   false,
      })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Centra mappa + aggiorna pin posizione cliente ───────────────────────────
  useEffect(() => {
    if (!mapObj.current || !posCliente) return

    mapObj.current.panTo(posCliente)

    // Crea o aggiorna il pin della posizione del cliente
    const aggiornaPinCliente = async () => {
      const { AdvancedMarkerElement } =
        await google.maps.importLibrary('marker') as google.maps.MarkerLibrary

      // Puntino blu stile Google Maps
      const div = document.createElement('div')
      div.innerHTML = `
        <div style="
          width:18px; height:18px; border-radius:50%;
          background:#4285F4;
          border:3px solid white;
          box-shadow:0 1px 6px rgba(0,0,0,0.35);
          position:relative;
        ">
          <div style="
            position:absolute; inset:-6px; border-radius:50%;
            background:rgba(66,133,244,0.18);
            animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;
          "></div>
        </div>
      `

      if (clienteMarkerRef.current) {
        clienteMarkerRef.current.position = posCliente
      } else {
        clienteMarkerRef.current = new AdvancedMarkerElement({
          map:      mapObj.current!,
          position: posCliente,
          content:  div,
          zIndex:   5,
          title:    'La tua posizione',
        })
      }
    }

    aggiornaPinCliente()
  }, [posCliente])

  // ── Sincronizza marker artigiani ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapObj.current) return

    const aggiorna = async () => {
      const { AdvancedMarkerElement } =
        await google.maps.importLibrary('marker') as google.maps.MarkerLibrary

      const idsAttivi = new Set(artigiani.map(a => a.artigiano_id))

      // Rimuovi marker di artigiani non più disponibili
      markersRef.current.forEach((marker, id) => {
        if (!idsAttivi.has(id)) {
          marker.map = null
          markersRef.current.delete(id)
        }
      })

      // Aggiungi / aggiorna marker
      for (const art of artigiani) {
        const colore  = PIN_COLORE[art.tipo]
        const label   = art.tipo === 'sos' ? 'SOS' : '~5h'
        const media   = art.valutazione_media ?? 0
        const stelleStr = media > 0 ? `⭐ ${media.toFixed(1)}` : ''

        // Nome troncato a 10 caratteri per non sforare il pin
        const nomeBreve = art.nome.split(' ')[0].slice(0, 10)

        const altezza = media > 0 ? 96 : 80
        const rettH   = media > 0 ? 70 : 56

        const svgStr = `
          <svg xmlns="http://www.w3.org/2000/svg" width="90" height="${altezza}" viewBox="0 0 90 ${altezza}">
            <rect x="2" y="2" width="86" height="${rettH}" rx="14"
              fill="${colore}"
              filter="drop-shadow(0 3px 6px rgba(0,0,0,0.35))"/>
            <polygon points="33,${rettH} 45,${rettH + 16} 57,${rettH}" fill="${colore}"/>
            <text x="45" y="24" text-anchor="middle" dominant-baseline="middle"
              font-family="system-ui,-apple-system,sans-serif" font-size="17" font-weight="800" fill="white"
              paint-order="stroke" stroke="rgba(0,0,0,0.25)" stroke-width="3" stroke-linejoin="round">
              ${nomeBreve}
            </text>
            <rect x="10" y="35" width="70" height="16" rx="8" fill="rgba(0,0,0,0.25)"/>
            <text x="45" y="43" text-anchor="middle" dominant-baseline="middle"
              font-family="system-ui,-apple-system,sans-serif" font-size="11" font-weight="700" fill="white">
              ${label}
            </text>
            ${media > 0 ? `
            <text x="45" y="${rettH - 8}" text-anchor="middle" dominant-baseline="middle"
              font-family="system-ui,-apple-system,sans-serif" font-size="12" font-weight="700" fill="white">
              ${stelleStr}
            </text>` : ''}
          </svg>`

        const parser = new DOMParser()
        const svg    = parser.parseFromString(svgStr, 'image/svg+xml').documentElement as unknown as HTMLElement

        const existing = markersRef.current.get(art.artigiano_id)
        if (existing) {
          existing.position = { lat: art.lat, lng: art.lng }
          existing.content  = svg
        } else {
          const m = new AdvancedMarkerElement({
            map:      mapObj.current!,
            position: { lat: art.lat, lng: art.lng },
            content:  svg,
            title:    art.nome,
          })
          m.addListener('click', () => setSelezionato(art))
          markersRef.current.set(art.artigiano_id, m)
        }
      }
    }

    aggiorna()
  }, [artigiani])

  // Stato pagamento Stripe (aperto quando cliente preme "Chiama ora")
  const [mostraPagamento,   setMostraPagamento]   = useState(false)
  const [artigianoInCoda,   setArtigianoInCoda]   = useState<ArtigianoDisponibile | null>(null)

  // ── Chiama artigiano: prima apre il form carta ────────────────────────────────
  const chiamaArtigiano = useCallback((art: ArtigianoDisponibile, tipo: 'sos' | 'urgente') => {
    // Sovrascrive il tipo dell'artigiano con quello scelto dal cliente
    // (es. un artigiano SOS chiamato in modalità "in giornata")
    setArtigianoInCoda({ ...art, tipo })
    setSelezionato(null)
    setMostraPagamento(true)
  }, [])

  // ── Conferma pagamento: crea intervento + pre-autorizzazione Stripe ───────────
  const confermaPagamento = useCallback(async (
    paymentMethodId: string,
    nome: string, cognome: string, telefono: string,
    indirizzo: string, indirizzoCoords: { lat: number; lng: number } | null,
    descrizione: string
  ) => {
    if (!artigianoInCoda) return
    setInvio(true)
    try {
      // 1. Crea intervento — passa le coordinate già note (autocomplete)
      //    per evitare il geocoding server-side quando possibile
      const resInt = await fetch('/api/interventi', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          artigiano_id:     artigianoInCoda.artigiano_id,
          tipo_urgenza:     artigianoInCoda.tipo,
          cliente_nome:     nome,
          cliente_cognome:  cognome,
          cliente_telefono: telefono,
          indirizzo,
          indirizzo_lat:    indirizzoCoords?.lat ?? null,
          indirizzo_lng:    indirizzoCoords?.lng ?? null,
          descrizione,
        }),
      })
      const jsonInt = await resInt.json()
      if (!resInt.ok) { alert(jsonInt.error ?? 'Errore creazione'); return }

      const interventoId = jsonInt.id

      // 2. Pre-autorizzazione Stripe
      const resPay = await fetch('/api/pagamenti/pre-autorizza', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ intervento_id: interventoId, payment_method_id: paymentMethodId }),
      })
      const jsonPay = await resPay.json()
      if (!resPay.ok) { alert(jsonPay.error ?? 'Errore pagamento'); return }

      setMostraPagamento(false)
      setArtigianoInCoda(null)
      setInterventoId(interventoId)

    } catch (e) {
      console.error('[confermaPagamento]', e)
      alert('Errore di rete.')
    } finally {
      setInvio(false)
    }
  }, [artigianoInCoda])

  // ── Decisione ritardo ─────────────────────────────────────────────────────────
  const decidiRitardo = useCallback(async (aspetta: boolean, intId: string) => {
    if (aspetta) {
      // Abbassa il costo alla tariffa urgente e torna in fase accettato
      const nuovoCosto = artigianoInCoda?.costo_chiamata_urgente ?? 25
      await fetch(`/api/interventi/${intId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fase: 'accettato', costo_chiamata: nuovoCosto }),
      })
      // Il Realtime aggiornerà intervento.fase → accettato
    } else {
      // Aggiorna il DB e ricarica la pagina
      fetch(`/api/interventi/${intId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fase: 'annullato' }),
      }).finally(() => {
        localStorage.removeItem('aav_intervento_id')
        window.location.href = '/cliente'
      })
    }
  }, [artigianoInCoda])

  // ── Decisione sul totale proposto ─────────────────────────────────────────────
  // Accetta → approva-preventivo (fase: approvato, PI aggiornato, non catturato)
  // Rifiuta → cattura (capture solo chiamata, fase: rifiutato)
  const decidi = useCallback(async (accetta: boolean) => {
    if (!interventoId) return

    if (accetta) {
      // Cliente accetta la stima → lavoro può iniziare
      const res = await fetch('/api/pagamenti/approva-preventivo', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ intervento_id: interventoId }),
      })
      if (!res.ok) {
        const j = await res.json()
        console.error('[decidi accetta]', j.error)
      }
      // Realtime aggiornerà la fase ad 'approvato'
    } else {
      // Cliente rifiuta → cattura solo diritto di chiamata e chiude
      await fetch('/api/pagamenti/cattura', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ intervento_id: interventoId }),
      })
      localStorage.removeItem('aav_intervento_id')
      window.location.href = '/cliente'
    }
  }, [interventoId])

  // ── Cliente certifica fine lavori → cattura pagamento completo ────────────────
  const lavoroTerminato = useCallback(async () => {
    if (!interventoId) return

    const res = await fetch('/api/pagamenti/lavoro-terminato', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ intervento_id: interventoId }),
    })
    if (!res.ok) {
      const j = await res.json()
      console.error('[lavoro-terminato]', j.error)
    }
    // Pulisce localStorage — l'intervento è concluso
    localStorage.removeItem('aav_intervento_id')
    setMostraStelle(true)
  }, [interventoId])

  // ── Invia recensione ─────────────────────────────────────────────────────────
  const inviaRecensione = useCallback(async () => {
    if (stelle > 0 && interventoId) {
      await fetch(`/api/interventi/${interventoId}/recensione`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ stelle }),
      })
    }
    localStorage.removeItem('aav_intervento_id')
    window.location.href = '/cliente'
  }, [stelle, interventoId])

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════════

  // Schermata stelle — mostrata dopo "Lavoro terminato", prima del redirect
  if (mostraStelle) {
    return (
      <div style={{
        height: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: C.bianco, padding: 32, textAlign: 'center',
      }}>
        <p style={{ fontSize: 56, marginBottom: 8 }}>🏠</p>
        <p style={{ fontWeight: 800, fontSize: 22, color: C.testo, marginBottom: 8 }}>
          Lavoro completato!
        </p>
        <p style={{ fontSize: 14, color: C.testoS, marginBottom: 32, lineHeight: 1.6 }}>
          Com'è andata? Lascia una valutazione all'artigiano.<br/>
          Aiuta altri clienti a scegliere.
        </p>

        {/* Stelle */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
          {[1,2,3,4,5].map(s => (
            <button
              key={s}
              onClick={() => setStelle(s)}
              style={{
                fontSize: 44, background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, lineHeight: 1,
                opacity: s <= stelle ? 1 : 0.25,
                transition: 'opacity 0.15s, transform 0.1s',
                transform: s <= stelle ? 'scale(1.15)' : 'scale(1)',
              }}
            >
              ⭐
            </button>
          ))}
        </div>

        <button
          onClick={inviaRecensione}
          style={{
            width: '100%', maxWidth: 320, height: 54, borderRadius: 16,
            border: 'none', background: stelle > 0 ? C.arancio : C.grigioC,
            color: stelle > 0 ? C.bianco : C.testoS,
            fontWeight: 700, fontSize: 16, cursor: 'pointer',
            marginBottom: 12, transition: 'all 0.2s',
          }}
        >
          {stelle > 0 ? `Invia valutazione (${stelle} ★)` : 'Seleziona un voto'}
        </button>

        <button
          onClick={() => { window.location.href = '/cliente' }}
          style={{
            background: 'none', border: 'none',
            fontSize: 14, color: C.testoS, cursor: 'pointer',
            textDecoration: 'underline', padding: '6px 0',
          }}
        >
          Salta
        </button>
      </div>
    )
  }

  // Se c'è un intervento attivo → mostra il flusso a schermo intero
  if (interventoId) {
    return (
      <FlussoIntervento
        interventoId={interventoId}
        intervento={intervento}
        loading={loadingInt}
        errore={erroreInt}
        posCliente={posCliente}
        stelle={stelle}
        setStelle={setStelle}
        decidi={decidi}
        lavoroTerminato={lavoroTerminato}
        decidiRitardo={decidiRitardo}
        artigianoInCoda={artigianoInCoda}
        inviaRecensione={inviaRecensione}
        onAnnulla={() => setInterventoId(null)}
      />
    )
  }

  // Mappa principale
  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', background: '#e8f0e8' }}>

      {/* Mappa fullscreen */}
      <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Barra filtri in alto — ottimizzata mobile */}
      <div style={{
        position: 'absolute', top: 12, left: 10, right: 10, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {/* Riga 1 — Urgenza: bottoni alti, font grande, facili da toccare */}
        <div style={{
          background: C.bianco, borderRadius: 18, padding: 5,
          display: 'flex', gap: 5,
          boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
        }}>
          {([null, 'sos', 'urgente'] as (TipoUrgenza | null)[]).map((t) => {
            const attivo = filtro === t
            const label  = t === null ? 'Tutti' : t === 'sos' ? '🚨 SOS' : '⚡ In giornata'
            const bg     = attivo
              ? (t === 'sos' ? C.rosso : t === 'urgente' ? C.ambra : C.arancio)
              : 'transparent'
            return (
              <button key={String(t)} onClick={() => setFiltro(t)} style={{
                flex: 1, padding: '11px 4px', borderRadius: 13, border: 'none',
                background: bg,
                color:      attivo ? C.bianco : C.testo,
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                transition: 'all 0.15s',
                WebkitTapHighlightColor: 'transparent',
              }}>
                {label}
              </button>
            )
          })}
        </div>

        {/* Riga 2 — Categoria (scroll orizzontale, chip più alti) */}
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2,
          scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}>
          <button
            onClick={() => setFiltroCategoria(null)}
            style={{
              flexShrink: 0, padding: '8px 16px', borderRadius: 22, border: 'none',
              background:  filtroCategoria === null ? C.testo : C.bianco,
              color:       filtroCategoria === null ? C.bianco : C.testo,
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              boxShadow: '0 1px 8px rgba(0,0,0,0.12)',
              transition: 'all 0.15s',
              WebkitTapHighlightColor: 'transparent',
            } as React.CSSProperties}
          >
            Tutte
          </button>

          {CATEGORIE.map(({ id, emoji }) => {
            const attiva = filtroCategoria === id
            return (
              <button
                key={id}
                onClick={() => setFiltroCategoria(attiva ? null : id)}
                style={{
                  flexShrink: 0, padding: '8px 16px', borderRadius: 22, border: 'none',
                  background:  attiva ? C.arancio : C.bianco,
                  color:       attiva ? C.bianco   : C.testo,
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  boxShadow: '0 1px 8px rgba(0,0,0,0.12)',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                  WebkitTapHighlightColor: 'transparent',
                } as React.CSSProperties}
              >
                {emoji} {id}
              </button>
            )
          })}
        </div>

        {/* Errore GPS */}
        {erroreGps && (
          <div style={{
            background: '#FCEBEB', borderRadius: 12, padding: '8px 12px',
            fontSize: 12, color: C.rosso, textAlign: 'center',
          }}>
            {erroreGps}
          </div>
        )}
      </div>

      {/* Contatore artigiani */}
      {!loadingArtigiani && (
        <div style={{
          position: 'absolute', bottom: selezionato ? 320 : 20, left: 12, zIndex: 10,
          background: C.bianco, borderRadius: 12, padding: '6px 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          fontSize: 12, color: C.testo, fontWeight: 500,
          transition: 'bottom 0.3s ease',
        }}>
          {artigiani.length === 0
            ? 'Nessun artigiano disponibile'
            : `${artigiani.length} artigian${artigiani.length === 1 ? 'o' : 'i'} online`}
        </div>
      )}

      {/* Bottom sheet artigiano selezionato */}
      {selezionato && (
        <BottomSheet
          artigiano={selezionato}
          onChiudi={() => setSelezionato(null)}
          onChiama={(tipo) => chiamaArtigiano(selezionato, tipo)}
          invio={invio}
        />
      )}

      {/* Modal pagamento Stripe */}
      {mostraPagamento && artigianoInCoda && (
        <PagamentoModal
          artigiano={artigianoInCoda}
          onConferma={confermaPagamento}
          onAnnulla={() => { setMostraPagamento(false); setArtigianoInCoda(null) }}
          loading={invio}
        />
      )}
    </div>
  )
}

// ─── Modal pagamento carta ────────────────────────────────────────────────────
// Raccoglie il numero carta via Stripe.js puro (no React Stripe Elements
// per evitare dipendenze aggiuntive). In produzione sostituire con
// @stripe/react-stripe-js + <PaymentElement />.

function PagamentoModal({
  artigiano, onConferma, onAnnulla, loading,
}: {
  artigiano:   ArtigianoDisponibile
  onConferma:  (
    paymentMethodId: string,
    nome: string, cognome: string, telefono: string,
    indirizzo: string, indirizzoCoords: { lat: number; lng: number } | null,
    descrizione: string
  ) => void
  onAnnulla:   () => void
  loading:     boolean
}) {
  const [nome,        setNome]        = useState('')
  const [cognome,     setCognome]     = useState('')
  const [telefono,    setTelefono]    = useState('')
  const [indirizzo,   setIndirizzo]   = useState('')
  const [indirizzoCoords, setIndirizzoCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [descrizione, setDescrizione] = useState('')
  const [carta,       setCarta]       = useState('')
  const [scadenza,    setScadenza]    = useState('')
  const [cvv,         setCvv]         = useState('')
  const [accettaTermini, setAccettaTermini] = useState(false)
  const [errore,      setErrore]      = useState('')
  const costo = artigiano.tipo === 'sos'
    ? artigiano.costo_chiamata_sos
    : artigiano.costo_chiamata_urgente

  async function procedi() {
    setErrore('')
    if (!nome.trim())                        { setErrore('Inserisci il tuo nome'); return }
    if (!cognome.trim())                     { setErrore('Inserisci il tuo cognome'); return }
    if (!indirizzo.trim())                   { setErrore('Inserisci l\'indirizzo dell\'intervento'); return }
    if (!telefono.trim())                    { setErrore('Inserisci il tuo numero di telefono'); return }
    if (!descrizione.trim())                 { setErrore('Descrivi brevemente il problema'); return }
    if (carta.replace(/\s/g,'').length < 16) { setErrore('Numero carta non valido'); return }
    if (!scadenza.includes('/'))             { setErrore('Scadenza non valida'); return }
    if (!accettaTermini)                     { setErrore('Devi accettare i Termini e Condizioni per procedere'); return }

    const fakePaymentMethodId = `pm_test_${Date.now()}`
    onConferma(fakePaymentMethodId, nome.trim(), cognome.trim(), telefono.trim(), indirizzo.trim(), indirizzoCoords, descrizione.trim())
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div style={{
        width: '100%', background: C.bianco,
        borderRadius: '20px 20px 0 0',
        padding: '12px 20px 36px',
        maxHeight: '90dvh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.bordo, margin: '0 auto 20px' }}/>

        <p style={{ fontWeight: 700, fontSize: 18, color: C.testo, marginBottom: 4 }}>
          Autorizza il pagamento
        </p>
        <p style={{ fontSize: 13, color: C.testoS, marginBottom: 20 }}>
          Pre-autorizziamo <strong>€ {costo}</strong> (diritto di chiamata).<br/>
          Non verrà addebitato nulla fino alla fine del lavoro.
        </p>

        {/* Nome + Cognome */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.testoS, display: 'block', marginBottom: 6 }}>
              NOME *
            </label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Mario"
              style={{ width: '100%', height: 46, borderRadius: 12, border: `1px solid ${C.bordo}`, padding: '0 14px', fontSize: 15, boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.testoS, display: 'block', marginBottom: 6 }}>
              COGNOME *
            </label>
            <input type="text" value={cognome} onChange={e => setCognome(e.target.value)}
              placeholder="Rossi"
              style={{ width: '100%', height: 46, borderRadius: 12, border: `1px solid ${C.bordo}`, padding: '0 14px', fontSize: 15, boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Indirizzo — con autocomplete Google Places */}
        <label style={{ fontSize: 11, fontWeight: 600, color: C.testoS, display: 'block', marginBottom: 6 }}>
          INDIRIZZO DELL'INTERVENTO *
        </label>
        <InputIndirizzo
          value={indirizzo}
          onChange={setIndirizzo}
          onSelezionato={(coords) => setIndirizzoCoords(coords)}
        />
        <p style={{ fontSize: 11, color: C.testoS, marginBottom: 16, marginTop: 4 }}>
          L'artigiano vedrà solo questo indirizzo finché non accetta la richiesta.
        </p>

        {/* Descrizione problema */}
        <label style={{ fontSize: 11, fontWeight: 600, color: C.testoS, display: 'block', marginBottom: 6 }}>
          DESCRIVI IL PROBLEMA * (max 200 caratteri)
        </label>
        <textarea
          value={descrizione}
          onChange={e => setDescrizione(e.target.value.slice(0, 200))}
          placeholder="Es: rubinetto del bagno che perde acqua dal raccordo sotto il lavandino…"
          rows={3}
          style={{
            width: '100%', borderRadius: 12, border: `1px solid ${C.bordo}`,
            padding: '10px 14px', fontSize: 14, marginBottom: 4,
            boxSizing: 'border-box', resize: 'none', outline: 'none',
            fontFamily: 'system-ui, sans-serif',
          }}
        />
        <p style={{ fontSize: 11, color: C.testoS, marginBottom: 16, textAlign: 'right' }}>
          {descrizione.length}/200
        </p>

        {/* Telefono */}
        <label style={{ fontSize: 11, fontWeight: 600, color: C.testoS, display: 'block', marginBottom: 6 }}>
          IL TUO NUMERO DI TELEFONO *
        </label>
        <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
          placeholder="+39 333 1234567"
          style={{ width: '100%', height: 46, borderRadius: 12, border: `1px solid ${C.bordo}`, padding: '0 14px', fontSize: 15, marginBottom: 4, boxSizing: 'border-box' }}
        />
        <p style={{ fontSize: 11, color: C.testoS, marginBottom: 16 }}>
          Visibile all'artigiano solo dopo che avrà accettato la richiesta.
        </p>

        {/* Carta */}
        <label style={{ fontSize: 11, fontWeight: 600, color: C.testoS, display: 'block', marginBottom: 6 }}>
          NUMERO CARTA *
        </label>
        <input type="tel" inputMode="numeric" value={carta}
          onChange={e => setCarta(e.target.value.replace(/\D/g,'').replace(/(\d{4})/g,'$1 ').trim().slice(0,19))}
          placeholder="0000 0000 0000 0000" maxLength={19}
          style={{ width: '100%', height: 46, borderRadius: 12, border: `1px solid ${C.bordo}`, padding: '0 14px', fontSize: 16, letterSpacing: 2, marginBottom: 16, boxSizing: 'border-box' }}
        />

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.testoS, display: 'block', marginBottom: 6 }}>SCADENZA *</label>
            <input type="tel" value={scadenza}
              onChange={e => {
                let v = e.target.value.replace(/\D/g,'')
                if (v.length > 2) v = v.slice(0,2) + '/' + v.slice(2,4)
                setScadenza(v)
              }}
              placeholder="MM/YY" maxLength={5}
              style={{ width: '100%', height: 46, borderRadius: 12, border: `1px solid ${C.bordo}`, padding: '0 14px', fontSize: 16, boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.testoS, display: 'block', marginBottom: 6 }}>CVV *</label>
            <input type="tel" value={cvv}
              onChange={e => setCvv(e.target.value.replace(/\D/g,'').slice(0,4))}
              placeholder="123" maxLength={4}
              style={{ width: '100%', height: 46, borderRadius: 12, border: `1px solid ${C.bordo}`, padding: '0 14px', fontSize: 16, letterSpacing: 4, boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {errore && (
          <p style={{ fontSize: 13, color: C.rosso, marginBottom: 12 }}>{errore}</p>
        )}

        <div style={{ background: C.grigioC, borderRadius: 10, padding: '8px 12px', fontSize: 11, color: C.testoS, marginBottom: 16, lineHeight: 1.5 }}>
          🔒 Pagamento sicuro. I dati della carta sono gestiti da Stripe e non vengono
          mai salvati sui nostri server.
        </div>

        {/* Checkbox T&C — obbligatoria */}
        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          marginBottom: 16, cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={accettaTermini}
            onChange={e => setAccettaTermini(e.target.checked)}
            style={{ width: 20, height: 20, marginTop: 2, flexShrink: 0, cursor: 'pointer', accentColor: C.arancio }}
          />
          <span style={{ fontSize: 12, color: C.testoS, lineHeight: 1.6 }}>
            Ho letto e accetto i{' '}
            <a
              href="/termini-e-condizioni"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: C.arancio, fontWeight: 600, textDecoration: 'underline' }}
              onClick={e => e.stopPropagation()}
            >
              Termini e Condizioni d'Uso
            </a>
            {' '}e l'
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: C.arancio, fontWeight: 600, textDecoration: 'underline' }}
              onClick={e => e.stopPropagation()}
            >
              Informativa Privacy
            </a>
            , inclusa la procedura di pre-autorizzazione della carta e il meccanismo
            di pagamento tramite il pulsante "Lavoro terminato".
          </span>
        </label>

        <button onClick={procedi} disabled={loading || !accettaTermini} style={{
          width: '100%', height: 52, borderRadius: 14, border: 'none',
          background: (loading || !accettaTermini) ? '#ccc' : C.arancio,
          color: C.bianco, fontWeight: 700, fontSize: 15,
          cursor: (loading || !accettaTermini) ? 'not-allowed' : 'pointer', marginBottom: 10,
        }}>
          {loading ? 'Elaborazione…' : `🔧 Chiama ora — Autorizza € ${costo}`}
        </button>
        <button onClick={onAnnulla} style={{
          width: '100%', background: 'none', border: 'none',
          fontSize: 13, color: C.testoS, cursor: 'pointer', padding: '6px 0',
        }}>
          Annulla
        </button>
      </div>
    </div>
  )
}

// ─── BottomSheet ──────────────────────────────────────────────────────────────

function BottomSheet({
  artigiano, onChiudi, onChiama, invio,
}: {
  artigiano: ArtigianoDisponibile
  onChiudi:  () => void
  onChiama:  (tipo: 'sos' | 'urgente') => void
  invio:     boolean
}) {
  const isSos = artigiano.tipo === 'sos'
  const dist  = artigiano.distanza_km != null ? `📍 ${artigiano.distanza_km.toFixed(1)} km` : ''
  // Se è SOS mostriamo entrambe le opzioni, se è solo urgente solo quella
  const coloreHeader = isSos ? C.rosso : C.ambra

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
      background: C.bianco,
      borderRadius: '24px 24px 0 0',
      padding: '10px 20px 40px',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
    }}>
      {/* Handle */}
      <div style={{ width: 40, height: 5, borderRadius: 3, background: C.bordo, margin: '0 auto 18px' }} />

      {/* Header artigiano */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
        <Iniziali nome={artigiano.nome} colore={coloreHeader} size="lg" />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: C.testo, lineHeight: 1.2 }}>
            {artigiano.nome}
          </div>
          <div style={{ fontSize: 14, color: C.testoS, marginTop: 4 }}>
            {artigiano.categoria}
            {artigiano.valutazione_media > 0 && (
              <span style={{ color: '#F5A623', fontWeight: 700, marginLeft: 8 }}>
                ⭐ {artigiano.valutazione_media.toFixed(1)}
              </span>
            )}
            {dist && <span style={{ color: coloreHeader, fontWeight: 600, marginLeft: 8 }}>{dist}</span>}
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: C.bordo, marginBottom: 16 }} />

      {/* Costo orario */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: C.grigioC, borderRadius: 12, padding: '10px 16px', marginBottom: 16,
      }}>
        <div>
          <p style={{ fontSize: 13, color: C.testo, fontWeight: 600 }}>Costo orario</p>
          <p style={{ fontSize: 11, color: C.testoS, marginTop: 2 }}>Minimo 30 minuti</p>
        </div>
        <p style={{ fontSize: 20, fontWeight: 800, color: C.testo }}>€ {artigiano.costo_orario}/h</p>
      </div>

      {/* Scelta tipo intervento */}
      <p style={{ fontSize: 12, fontWeight: 600, color: C.testoS, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
        Scegli quando vuoi che arrivi
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>

        {/* Opzione SOS — sempre visibile se l'artigiano è SOS */}
        {isSos && (
          <button
            onClick={() => onChiama('sos')}
            disabled={invio}
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 16, border: 'none',
              background: invio ? '#ccc' : C.rosso,
              color: C.bianco, cursor: invio ? 'not-allowed' : 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              WebkitTapHighlightColor: 'transparent',
            } as React.CSSProperties}
          >
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>🚨 SOS — entro 2 ore</p>
              <p style={{ fontSize: 12, opacity: 0.85, marginTop: 3 }}>Diritto di chiamata</p>
            </div>
            <span style={{ fontSize: 26, fontWeight: 900 }}>€ {artigiano.costo_chiamata_sos}</span>
          </button>
        )}

        {/* Opzione In giornata — sempre visibile */}
        <button
          onClick={() => onChiama('urgente')}
          disabled={invio}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 16, border: 'none',
            background: invio ? '#ccc' : C.ambra,
            color: C.bianco, cursor: invio ? 'not-allowed' : 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            WebkitTapHighlightColor: 'transparent',
          } as React.CSSProperties}
        >
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>⚡ In giornata — entro 5 ore</p>
            <p style={{ fontSize: 12, opacity: 0.85, marginTop: 3 }}>Diritto di chiamata</p>
          </div>
          <span style={{ fontSize: 26, fontWeight: 900 }}>€ {artigiano.costo_chiamata_urgente}</span>
        </button>
      </div>

      <div style={{
        background: '#E1F5EE', borderRadius: 12, padding: '10px 14px',
        fontSize: 12, color: '#1D5C42', lineHeight: 1.6, marginBottom: 16,
      }}>
        🔒 Addebitiamo solo il diritto di chiamata adesso.
        Al termine il costo del lavoro viene concordato con te.
      </div>

      <button onClick={onChiudi} style={{
        width: '100%', background: 'none', border: 'none',
        fontSize: 15, color: C.testoS, cursor: 'pointer', padding: '6px 0',
        WebkitTapHighlightColor: 'transparent',
      } as React.CSSProperties}>
        Annulla
      </button>
    </div>
  )
}
// ─── Flusso intervento ────────────────────────────────────────────────────────

function FlussoIntervento({
  interventoId, intervento, loading, errore,
  posCliente, stelle, setStelle,
  decidi, lavoroTerminato, decidiRitardo, inviaRecensione, onAnnulla,
}: {
  interventoId:    string
  intervento:      ReturnType<typeof useIntervento>['intervento']
  loading:         boolean
  errore:          string | null
  posCliente:      { lat: number; lng: number } | null
  stelle:          number
  setStelle:       (n: number) => void
  decidi:          (accetta: boolean) => void
  lavoroTerminato: () => void
  decidiRitardo:   (aspetta: boolean, interventoId: string) => void
  artigianoInCoda: ArtigianoDisponibile | null
  inviaRecensione: () => void
  onAnnulla:       () => void
}) {
  // Loading iniziale
  if (loading) {
    return (
      <Centrata>
        <Pallini />
        <p style={{ fontSize: 13, color: C.testoS, marginTop: 12 }}>Connessione…</p>
      </Centrata>
    )
  }

  // Errore
  if (errore) {
    return (
      <Centrata>
        <p style={{ fontSize: 36 }}>⚠️</p>
        <p style={{ fontWeight: 700, fontSize: 15, marginTop: 8, color: C.testo }}>Errore</p>
        <p style={{ fontSize: 13, color: C.rosso, marginTop: 4, maxWidth: 280, textAlign: 'center' }}>{errore}</p>
        <div style={{ marginTop: 20 }}>
          <Bottone label="Torna alla mappa" colore={C.grigio} onClick={onAnnulla} />
        </div>
      </Centrata>
    )
  }

  // Stato non ancora arrivato
  if (!intervento) {
    return (
      <Centrata>
        <AnelliRicerca />
        <p style={{ fontWeight: 700, fontSize: 18, marginTop: 20, color: C.testo }}>Sto cercando un artigiano…</p>
        <p style={{ fontSize: 13, color: C.testoS, marginTop: 8, maxWidth: 280, textAlign: 'center' }}>
          Contatterò i professionisti vicini a te disponibili adesso.
        </p>
        <div style={{ marginTop: 24 }}>
          <Pallini />
        </div>
      </Centrata>
    )
  }

  const fase = intervento.fase as FaseIntervento

  // ── FSM ──────────────────────────────────────────────────────────────────────
  switch (fase) {

    case 'richiesto':
      return (
        <Centrata>
          <AnelliRicerca />
          <p style={{ fontWeight: 700, fontSize: 18, marginTop: 20, color: C.testo }}>Cerco il tuo artigiano…</p>
          <p style={{ fontSize: 13, color: C.testoS, marginTop: 8, maxWidth: 280, textAlign: 'center' }}>
            Sto contattando i professionisti disponibili vicini a te.
          </p>
          <div style={{ marginTop: 20 }}>
            <Pallini />
          </div>
          <button onClick={onAnnulla} style={{
            marginTop: 24, background: 'none', border: 'none',
            fontSize: 13, color: C.testoS, cursor: 'pointer', textDecoration: 'underline',
          }}>
            Annulla richiesta
          </button>
        </Centrata>
      )

    case 'accettato': {
      const hasGps = intervento.artigiano_lat !== null && intervento.artigiano_lng !== null
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: C.bianco }}>
          {/* Mappa tracking */}
          <div style={{ flex: 1, position: 'relative' }}>
            {hasGps ? (
              <MappaTracking
                clienteLat={posCliente?.lat ?? 0}
                clienteLng={posCliente?.lng ?? 0}
                artigianoLat={intervento.artigiano_lat!}
                artigianoLng={intervento.artigiano_lng!}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: C.grigioC, gap: 10,
              }}>
                <Pallini />
                <p style={{ fontSize: 13, color: C.testoS }}>Localizzo l'artigiano…</p>
              </div>
            )}
          </div>
          {/* Card info */}
          <div style={{ padding: '16px 20px 28px', borderTop: `1px solid ${C.bordo}` }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: C.testo }}>✅ L'artigiano sta arrivando</p>
            <p style={{ fontSize: 13, color: C.testoS, marginTop: 4 }}>
              Il pin 🔧 si aggiorna in tempo reale mentre si avvicina.
            </p>
          </div>
        </div>
      )
    }

    case 'ritardo': {
      const costoSos     = intervento.costo_chiamata
      // Costo reale in giornata salvato al momento della creazione dell'intervento
      const costoUrgente = intervento.costo_chiamata_urgente ?? Math.round(costoSos * 0.5)
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: C.bianco }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.bordo}` }}>
            <p style={{ fontWeight: 700, fontSize: 16, color: C.ambra }}>⏰ L'artigiano fa tardi</p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={{ background: '#FAEEDA', borderRadius: 14, padding: 16, border: `1.5px solid ${C.ambra}` }}>
              <p style={{ fontSize: 14, color: '#854F0B', lineHeight: 1.6 }}>
                L'artigiano ha avuto un imprevisto e non può arrivare entro i tempi SOS.
                Cosa vuoi fare?
              </p>
            </div>

            <Riquadro titolo="Le tue opzioni">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* Opzione 1: aspetto */}
                <div style={{ background: C.grigioC, borderRadius: 12, padding: 14 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: C.testo, marginBottom: 4 }}>
                    ⚡ Aspetto — passo a "In giornata"
                  </p>
                  <p style={{ fontSize: 12, color: C.testoS, marginBottom: 10, lineHeight: 1.5 }}>
                    L'artigiano verrà lo stesso ma con tempi più lunghi.
                    Il diritto di chiamata scende da <strong>€ {costoSos}</strong> a <strong>€ {costoUrgente}</strong>.
                  </p>
                  <Bottone
                    label={`Aspetto — Autorizza € ${costoUrgente}`}
                    colore={C.ambra}
                    onClick={() => decidiRitardo(true, intervento.id)}
                  />
                </div>

                {/* Opzione 2: cerco qualcun altro */}
                <div style={{ background: C.grigioC, borderRadius: 12, padding: 14 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: C.testo, marginBottom: 4 }}>
                    🔍 Cerco un altro artigiano
                  </p>
                  <p style={{ fontSize: 12, color: C.testoS, marginBottom: 10, lineHeight: 1.5 }}>
                    La pre-autorizzazione viene annullata e torni alla mappa.
                    Non ti viene addebitato nulla.
                  </p>
                  <Bottone
                    label="Annulla e cerca qualcun altro"
                    colore={C.grigio}
                    onClick={() => decidiRitardo(false, intervento.id)}
                  />
                </div>
              </div>
            </Riquadro>
          </div>
        </div>
      )
    }

    case 'valutazione': {
      const costo   = intervento.costo_chiamata
      const lavoro  = intervento.totale_proposto ?? 0
      const totale  = costo + lavoro
      const hasTot  = lavoro > 0
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: C.bianco }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.bordo}` }}>
            <p style={{ fontWeight: 700, fontSize: 16, color: C.testo }}>Proposta dell'artigiano</p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Riquadro titolo="Riepilogo costi">
              <RigaVoce label="Diritto di chiamata" valore={`€ ${costo}`} />
              <RigaVoce
                label="Lavoro svolto"
                valore={hasTot ? `€ ${lavoro}` : 'In attesa…'}
              />
              <div style={{ height: 1, background: C.bordo }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: C.testo }}>Totale</span>
                <span style={{ fontWeight: 800, fontSize: 26, color: C.arancio }}>
                  {hasTot ? `€ ${totale}` : '—'}
                </span>
              </div>
            </Riquadro>
            <div style={{
              background: C.grigioC, borderRadius: 12, padding: '10px 14px',
              fontSize: 12, color: C.testoS, lineHeight: 1.6,
            }}>
              Se <strong>rifiuti</strong>, paghi solo il diritto di chiamata (€ {costo})
              e l'intervento si chiude.
            </div>
          </div>
          <div style={{ padding: '16px 20px 32px', borderTop: `1px solid ${C.bordo}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Bottone
              label={`✅ Accetto — Paga € ${hasTot ? totale : '—'}`}
              colore={C.arancio}
              disabled={!hasTot}
              onClick={() => decidi(true)}
            />
            <Bottone
              label={`Rifiuto — Paga solo chiamata € ${costo}`}
              colore={C.grigio}
              onClick={() => decidi(false)}
            />
          </div>
        </div>
      )
    }

    // ── APPROVATO: cliente ha accettato la stima, lavoro in corso ─────────────
    case 'approvato': {
      const costo  = intervento.costo_chiamata
      const lavoro = intervento.totale_proposto ?? 0
      const totale = costo + lavoro

      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: C.bianco }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.bordo}` }}>
            <p style={{ fontWeight: 700, fontSize: 16, color: '#1D9E75' }}>✅ Preventivo accettato</p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Stato lavoro */}
            <div style={{ background: '#E1F5EE', borderRadius: 16, padding: 16, border: '1.5px solid #1D9E75' }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#1D5C42' }}>
                🔧 L'artigiano sta lavorando
              </p>
              <p style={{ fontSize: 13, color: '#2D7A5A', marginTop: 6, lineHeight: 1.6 }}>
                Quando il lavoro sarà completato e sei soddisfatto,
                premi il bottone qui sotto per confermare e pagare.
              </p>
            </div>

            {/* Riepilogo importo */}
            <Riquadro titolo="Importo da pagare a fine lavori">
              <RigaVoce label="Diritto di chiamata" valore={`€ ${costo}`} />
              <RigaVoce label="Lavoro concordato"   valore={`€ ${lavoro}`} />
              <div style={{ height: 1, background: C.bordo }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: C.testo }}>Totale</span>
                <span style={{ fontWeight: 800, fontSize: 28, color: C.arancio }}>€ {totale}</span>
              </div>
            </Riquadro>

            <div style={{
              background: C.grigioC, borderRadius: 12, padding: '10px 14px',
              fontSize: 12, color: C.testoS, lineHeight: 1.6,
            }}>
              💳 Il pagamento avverrà <strong>solo quando premi "Lavoro terminato"</strong>.
              Finché non lo premi, nessun importo viene addebitato.
            </div>

          </div>

          {/* Bottone principale — grande, impossibile non vederlo */}
          <div style={{ padding: '16px 20px 40px', borderTop: `1px solid ${C.bordo}` }}>
            <button
              onClick={lavoroTerminato}
              style={{
                width: '100%', height: 64, borderRadius: 18, border: 'none',
                background: '#1D9E75', color: C.bianco,
                fontWeight: 800, fontSize: 20, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(29,158,117,0.35)',
              }}
            >
              ✅ Lavoro terminato — Paga € {totale}
            </button>
            <p style={{ fontSize: 11, color: C.testoS, textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>
              Premi solo quando sei soddisfatto del lavoro svolto.
            </p>
          </div>
        </div>
      )
    }

    // ── ANNULLATO PER CONCORRENZA: un altro cliente ha "battuto sul tempo" ────
    case 'annullato_concorrenza': {
      return (
        <Centrata>
          <p style={{ fontSize: 52 }}>⏱️</p>
          <p style={{ fontWeight: 700, fontSize: 20, marginTop: 12, color: C.testo }}>
            Artigiano non più disponibile
          </p>
          <p style={{ fontSize: 13, color: C.testoS, marginTop: 6, maxWidth: 300, textAlign: 'center', lineHeight: 1.6 }}>
            Un altro cliente ha contattato questo artigiano poco prima di te
            e lui ha accettato la sua richiesta.
          </p>
          <div style={{
            background: '#E1F5EE', borderRadius: 12, padding: '10px 16px', marginTop: 16,
            fontSize: 12, color: '#1D5C42', maxWidth: 300, textAlign: 'center', lineHeight: 1.5,
          }}>
            🔒 Non ti è stato addebitato nulla.
          </div>
          <div style={{ marginTop: 24, width: '100%', maxWidth: 320 }}>
            <Bottone label="Cerca un altro artigiano" colore={C.arancio} onClick={onAnnulla} />
          </div>
        </Centrata>
      )
    }

    case 'pagato':
    case 'rifiutato': {
      const completato = fase === 'pagato'
      return (
        <Centrata>
          <p style={{ fontSize: 52 }}>{completato ? '🏠' : 'ℹ️'}</p>
          <p style={{ fontWeight: 700, fontSize: 20, marginTop: 12, color: C.testo }}>
            {completato ? 'Lavoro completato!' : 'Intervento chiuso'}
          </p>
          <p style={{ fontSize: 13, color: C.testoS, marginTop: 6, maxWidth: 280, textAlign: 'center' }}>
            {completato
              ? 'Com\'è andata? Lascia una valutazione all\'artigiano.'
              : `Addebitato solo il diritto di chiamata: € ${intervento.costo_chiamata}.`}
          </p>

          {completato && (
            <div style={{ marginTop: 24 }}>
              {/* Stelle secche */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setStelle(s)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 40, opacity: s <= stelle ? 1 : 0.25,
                    transition: 'opacity 0.1s',
                  }}>★</button>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320 }}>
            {completato && stelle > 0 && (
              <Bottone label="Invia valutazione" colore={C.arancio} onClick={inviaRecensione} />
            )}
            <Bottone label="Torna alla mappa" colore={C.grigio} onClick={inviaRecensione} />
          </div>
        </Centrata>
      )
    }

    default:
      return (
        <Centrata>
          <p style={{ fontSize: 36 }}>🎉</p>
          <p style={{ fontWeight: 700, fontSize: 18, marginTop: 12, color: C.testo }}>Fatto!</p>
          <div style={{ marginTop: 20 }}>
            <Bottone label="Torna alla mappa" colore={C.grigio} onClick={inviaRecensione} />
          </div>
        </Centrata>
      )
  }
}

// ─── Mappa tracking (componente separato, carica Maps solo quando serve) ───────

function MappaTracking({ clienteLat, clienteLng, artigianoLat, artigianoLng }: {
  clienteLat: number; clienteLng: number
  artigianoLat: number; artigianoLng: number
}) {
  const divRef  = useRef<HTMLDivElement>(null)
  const mapRef  = useRef<google.maps.Map | null>(null)
  const artRef  = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const cliRef  = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const lineRef = useRef<google.maps.Polyline | null>(null)

  useEffect(() => {
    if (!divRef.current) return

    new Loader({
      apiKey:    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
      version:   'weekly',
      libraries: ['marker', 'places'],
    }).load().then(async () => {
      const { Map }                 = await google.maps.importLibrary('maps')   as google.maps.MapsLibrary
      const { AdvancedMarkerElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary

      const bounds = new google.maps.LatLngBounds()
      bounds.extend({ lat: clienteLat,   lng: clienteLng })
      bounds.extend({ lat: artigianoLat, lng: artigianoLng })

      mapRef.current = new Map(divRef.current!, {
        mapId: 'artigiani_tracking', disableDefaultUI: true,
        gestureHandling: 'cooperative',
      })
      mapRef.current.fitBounds(bounds, 60)

      // Punto cliente
      const cliDiv = document.createElement('div')
      cliDiv.style.cssText = 'width:14px;height:14px;background:#185FA5;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 4px rgba(24,95,165,0.2)'
      cliRef.current = new AdvancedMarkerElement({ map: mapRef.current, position: { lat: clienteLat, lng: clienteLng }, content: cliDiv })

      // Punto artigiano
      const artDiv = document.createElement('div')
      artDiv.style.cssText = 'width:34px;height:34px;background:#D85A30;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(216,90,48,0.4)'
      artDiv.textContent = '🔧'
      artRef.current = new AdvancedMarkerElement({ map: mapRef.current, position: { lat: artigianoLat, lng: artigianoLng }, content: artDiv, zIndex: 10 })

      // Linea tratteggiata
      lineRef.current = new google.maps.Polyline({
        path: [{ lat: artigianoLat, lng: artigianoLng }, { lat: clienteLat, lng: clienteLng }],
        strokeOpacity: 0,
        icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3, strokeColor: '#D85A30' }, offset: '0', repeat: '16px' }],
        map: mapRef.current,
      })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Aggiorna posizione artigiano in realtime
  useEffect(() => {
    if (!artRef.current || !mapRef.current || !lineRef.current) return
    const pos = { lat: artigianoLat, lng: artigianoLng }
    artRef.current.position = pos
    lineRef.current.setPath([pos, { lat: clienteLat, lng: clienteLng }])
    const b = new google.maps.LatLngBounds()
    b.extend(pos)
    b.extend({ lat: clienteLat, lng: clienteLng })
    mapRef.current.fitBounds(b, 60)
  }, [artigianoLat, artigianoLng, clienteLat, clienteLng])

  return <div ref={divRef} style={{ width: '100%', height: '100%' }} />
}

// ─── Componenti UI minimali ────────────────────────────────────────────────────

function Centrata({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: C.bianco, padding: 24, textAlign: 'center',
    }}>
      {children}
    </div>
  )
}

function Riquadro({ children, titolo }: { children: React.ReactNode; titolo?: string }) {
  return (
    <div style={{ border: `1px solid ${C.bordo}`, borderRadius: 14, padding: 16 }}>
      {titolo && (
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.testoS, marginBottom: 12 }}>
          {titolo}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  )
}

function RigaVoce({ label, valore }: { label: string; valore: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 13, color: C.testoS }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.testo }}>{valore}</span>
    </div>
  )
}

function Iniziali({ nome, colore, size = 'md' }: { nome: string; colore: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 60 : size === 'sm' ? 40 : 52
  const fs  = size === 'lg' ? 22 : size === 'sm' ? 14 : 18
  const rad = size === 'lg' ? 16 : 12
  const init = nome.trim().split(/\s+/).slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase() || '?'
  return (
    <div style={{
      width: dim, height: dim, borderRadius: rad,
      background: colore, color: C.bianco,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: fs, flexShrink: 0,
    }}>
      {init}
    </div>
  )
}

function Bottone({ label, colore, onClick, disabled = false }: {
  label: string; colore: string; onClick: () => void; disabled?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', height: 50, borderRadius: 14, border: 'none',
      background: disabled ? '#ccc' : colore,
      color: C.bianco, fontWeight: 700, fontSize: 14,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'opacity 0.15s',
    }}>
      {label}
    </button>
  )
}

function Pallini() {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: '50%', background: C.arancio,
          animation: `bounce 1s ease-in-out infinite`,
          animationDelay: `${i * 150}ms`,
        }} />
      ))}
    </div>
  )
}

function AnelliRicerca() {
  return (
    <div style={{ position: 'relative', width: 88, height: 88 }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(216,90,48,0.12)', animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite' }} />
      <span style={{ position: 'absolute', inset: 10, borderRadius: '50%', background: 'rgba(216,90,48,0.2)', animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite', animationDelay: '0.4s' }} />
      <span style={{ position: 'absolute', inset: 20, borderRadius: '50%', background: C.arancio, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🔍</span>
    </div>
  )
}

// ─── Input indirizzo con autocomplete Google Places ────────────────────────────
// Mostra suggerimenti a tendina mentre l'utente digita.
// Quando seleziona un suggerimento, restituisce anche lat/lng già pronti
// (zero chiamate di geocoding lato server).

function InputIndirizzo({
  value, onChange, onSelezionato,
}: {
  value:         string
  onChange:      (v: string) => void
  onSelezionato: (coords: { lat: number; lng: number }) => void
}) {
  const inputRef     = useRef<HTMLInputElement>(null)
  const autocompRef  = useRef<google.maps.places.Autocomplete | null>(null)
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    if (!inputRef.current || autocompRef.current) return

    new Loader({
      apiKey:    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
      version:   'weekly',
      libraries: ['marker', 'places'],
    }).load().then(async () => {
      const { Autocomplete } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary

      autocompRef.current = new Autocomplete(inputRef.current!, {
        types:           ['address'],
        componentRestrictions: { country: 'it' },
        fields:          ['formatted_address', 'geometry'],
      })

      autocompRef.current.addListener('place_changed', () => {
        const place = autocompRef.current!.getPlace()
        if (place.formatted_address) {
          onChange(place.formatted_address)
        }
        if (place.geometry?.location) {
          onSelezionato({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          })
        }
      })

      setPronto(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={pronto ? 'Inizia a digitare l\'indirizzo…' : 'Caricamento…'}
      autoComplete="off"
      style={{
        width: '100%', height: 46, borderRadius: 12,
        border: `1px solid ${C.bordo}`, padding: '0 14px',
        fontSize: 15, boxSizing: 'border-box',
      }}
    />
  )
}
