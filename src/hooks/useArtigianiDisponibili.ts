// src/hooks/useArtigianiDisponibili.ts
'use client'

import { useEffect, useState } from 'react'
import { supabase }            from '@/lib/supabase'
import type { ArtigianoDisponibile, TipoUrgenza, Categoria } from '@/types'

// Raggi geofencing fissi
const RAGGIO_KM: Record<TipoUrgenza, number> = {
  sos:     10,  // SOS → entro 10 km
  urgente: 30,  // In giornata → entro 30 km
}

// Formula di Haversine — distanza in km tra due coordinate
function distanzaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R   = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a   = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export function useArtigianiDisponibili(
  filtro:     TipoUrgenza | null,
  posCliente: { lat: number; lng: number } | null
) {
  const [lista,   setLista]   = useState<ArtigianoDisponibile[]>([])
  const [loading, setLoading] = useState(true)

  async function carica() {
    console.log('[hook artigiani] carico lista, filtro:', filtro)

    const { data, error } = await supabase
      .from('artigiani_disponibili')
      .select(`
        artigiano_id,
        tipo,
        lat,
        lng,
        attivato_at,
        artigiani!artigiano_id (
          nome,
          categoria,
          costo_chiamata_sos,
          costo_chiamata_urgente,
          costo_orario,
          valutazione_media
        )
      `)

    console.log('[hook artigiani] risposta DB:', data, error)

    if (error) {
      console.error('[hook artigiani] errore:', error.message)
      setLoading(false)
      return
    }

    const risultati: ArtigianoDisponibile[] = (data ?? [])
      .filter(r => {
        // Filtro per tipo urgenza
        if (filtro !== null && r.tipo !== filtro) return false

        // Geofencing: se abbiamo la posizione del cliente, filtra per raggio
        if (posCliente) {
          const tipo   = r.tipo as TipoUrgenza
          const raggio = RAGGIO_KM[tipo]
          const dist   = distanzaKm(posCliente.lat, posCliente.lng, r.lat, r.lng)
          if (dist > raggio) return false
        }

        return true
      })
      .map(r => {
        // Supabase può restituire il join come array anche per relazioni 1:1
        // a seconda della versione del client — normalizziamo qui
        const artRaw = Array.isArray(r.artigiani) ? r.artigiani[0] : r.artigiani
        const art = artRaw as unknown as {
          nome: string
          categoria: Categoria
          costo_chiamata_sos: number
          costo_chiamata_urgente: number
          costo_orario: number
          valutazione_media: number | null
        } | null

        // Calcola distanza dal cliente (se disponibile)
        const distanza = posCliente
          ? distanzaKm(posCliente.lat, posCliente.lng, r.lat, r.lng)
          : undefined

        return {
          artigiano_id:           r.artigiano_id,
          tipo:                   r.tipo as TipoUrgenza,
          lat:                    r.lat,
          lng:                    r.lng,
          attivato_at:            r.attivato_at,
          distanza_km:            distanza ? Math.round(distanza * 10) / 10 : undefined,
          nome:                   art?.nome                   ?? 'Artigiano',
          categoria:              (art?.categoria              ?? 'Tuttofare') as Categoria,
          costo_chiamata_sos:     art?.costo_chiamata_sos     ?? 50,
          costo_chiamata_urgente: art?.costo_chiamata_urgente ?? 25,
          costo_orario:           art?.costo_orario            ?? 60,
          valutazione_media:      art?.valutazione_media       ?? 0,
        }
      })
      // Ordina per distanza crescente
      .sort((a, b) => (a.distanza_km ?? 999) - (b.distanza_km ?? 999))

    setLista(risultati)
    setLoading(false)
  }

  useEffect(() => {
    carica()

    let ch: ReturnType<typeof supabase.channel> | null = null
    let riconnessioneTimeout: ReturnType<typeof setTimeout> | null = null
    let attivo = true

    function creaCanale() {
      ch = supabase
        .channel('artigiani_disponibili_live')
        .on('postgres_changes', {
          event:  '*',
          schema: 'public',
          table:  'artigiani_disponibili',
        }, () => {
          console.log('[hook artigiani] cambio rilevato, ricarico')
          carica()
        })
        .subscribe((status) => {
          console.log('[hook artigiani] stato canale:', status)

          // Su reti mobili instabili il WebSocket può cadere silenziosamente.
          // Senza riconnessione automatica, il cliente continuerebbe a vedere
          // la mappa "ferma" (pin non aggiornati) senza nessun errore visibile.
          if ((status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && attivo) {
            console.warn('[hook artigiani] canale perso, riconnessione tra 2s...')
            if (ch) supabase.removeChannel(ch)
            riconnessioneTimeout = setTimeout(() => {
              if (attivo) creaCanale()
            }, 2000)
          }
        })
    }

    creaCanale()

    const handleOnline = () => {
      console.log('[hook artigiani] rete tornata online, verifico canale...')
      if (ch) { supabase.removeChannel(ch); creaCanale() }
      carica()
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        console.log('[hook artigiani] app tornata in foreground, verifico canale...')
        if (ch) { supabase.removeChannel(ch); creaCanale() }
        carica()
      }
    }
    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      attivo = false
      if (riconnessioneTimeout) clearTimeout(riconnessioneTimeout)
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (ch) supabase.removeChannel(ch)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro, posCliente?.lat, posCliente?.lng])

  return { lista, loading }
}
