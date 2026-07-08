// src/hooks/useIntervento.ts
'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase }                     from '@/lib/supabase'
import type { Intervento }              from '@/types'

// Suono di avviso urgente — 3 toni discendenti per segnalare un problema
function suonaAvviso() {
  try {
    const ctx = new AudioContext()
    const toni = [880, 660, 440]
    toni.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      const t = ctx.currentTime + i * 0.25
      gain.gain.setValueAtTime(0.4, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
      osc.start(t)
      osc.stop(t + 0.25)
    })
  } catch (e) {
    console.warn('[suonaAvviso]', e)
  }
}

export function useIntervento(
  interventoId: string | null,
  onAnnullato?: () => void
) {
  const [intervento, setIntervento] = useState<Intervento | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [errore,     setErrore]     = useState<string | null>(null)
  const caricaRef      = useRef<() => void>(() => {})
  const onAnnullatoRef = useRef(onAnnullato)
  const fasePrecRef    = useRef<string | null>(null)  // traccia la fase precedente
  onAnnullatoRef.current = onAnnullato

  caricaRef.current = async () => {
    if (!interventoId) return
    console.log('[hook intervento] carico id:', interventoId)

    const { data, error } = await supabase
      .from('interventi')
      .select('*')
      .eq('id', interventoId)
      .maybeSingle()

    console.log('[hook intervento] risposta fase:', (data as Intervento | null)?.fase)

    if (error) { setErrore(error.message); setLoading(false); return }
    if (!data)  { setErrore('Non trovato'); setLoading(false); return }

    const int = data as Intervento
    if (int.fase === 'annullato') {
      onAnnullatoRef.current?.()
      return
    }

    setIntervento(int)
    setErrore(null)
    setLoading(false)
  }

  useEffect(() => {
    if (!interventoId) {
      setIntervento(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setErrore(null)
    setIntervento(null)
    fasePrecRef.current = null
    caricaRef.current()

    let ch: ReturnType<typeof supabase.channel> | null = null
    let riconnessioneTimeout: ReturnType<typeof setTimeout> | null = null
    let attivo = true

    function creaCanale() {
      ch = supabase
        .channel(`intervento_${interventoId}`)
        .on('postgres_changes', {
          event:  'UPDATE',
          schema: 'public',
          table:  'interventi',
          filter: `id=eq.${interventoId}`,
        }, (payload) => {
          const nuovo = payload.new as Intervento
          console.log('[hook intervento] UPDATE fase:', nuovo.fase)

          if (nuovo.fase === 'annullato') {
            onAnnullatoRef.current?.()
            return
          }

          if (nuovo.fase === 'ritardo' && fasePrecRef.current === 'accettato') {
            suonaAvviso()
          }

          fasePrecRef.current = nuovo.fase
          setIntervento(nuovo)
        })
        .subscribe((status) => {
          console.log('[hook intervento] canale status:', status)
          if (status === 'SUBSCRIBED') caricaRef.current()

          // Su reti mobili (4G/5G) il WebSocket può cadere silenziosamente
          // senza generare errori visibili — senza riconnessione automatica
          // il cliente resterebbe "in attesa" per sempre senza mai ricevere
          // l'aggiornamento di fase dell'artigiano (bug osservato in demo
          // reale: funzionava su WiFi, falliva su rete mobile).
          if ((status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && attivo) {
            console.warn('[hook intervento] canale perso, riconnessione tra 2s...')
            if (ch) supabase.removeChannel(ch)
            riconnessioneTimeout = setTimeout(() => {
              if (attivo) creaCanale()
            }, 2000)
          }
        })
    }

    creaCanale()

    // Riconnessione quando la rete torna disponibile o l'app torna in foreground
    const handleOnline = () => {
      console.log('[hook intervento] rete tornata online, verifico canale...')
      if (ch) { supabase.removeChannel(ch); creaCanale() }
      caricaRef.current() // ricarica anche i dati, potremmo aver perso eventi
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        console.log('[hook intervento] app tornata in foreground, verifico canale...')
        if (ch) { supabase.removeChannel(ch); creaCanale() }
        caricaRef.current()
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
  }, [interventoId])

  return { intervento, loading, errore }
}
