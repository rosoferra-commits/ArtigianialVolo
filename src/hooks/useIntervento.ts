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

    const ch = supabase
      .channel(`intervento_${interventoId}`)
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'interventi',
        filter: `id=eq.${interventoId}`,
      }, (payload) => {
        const nuovo = payload.new as Intervento
        console.log('[hook intervento] UPDATE fase:', nuovo.fase)

        // Annullato → reset immediato
        if (nuovo.fase === 'annullato') {
          onAnnullatoRef.current?.()
          return
        }

        // Suono di avviso quando l'artigiano segnala ritardo
        // (solo se la fase precedente era 'accettato', non ad ogni render)
        if (nuovo.fase === 'ritardo' && fasePrecRef.current === 'accettato') {
          suonaAvviso()
        }

        fasePrecRef.current = nuovo.fase
        setIntervento(nuovo)
      })
      .subscribe((status) => {
        console.log('[hook intervento] canale status:', status)
        if (status === 'SUBSCRIBED') caricaRef.current()
      })

    return () => { supabase.removeChannel(ch) }
  }, [interventoId])

  return { intervento, loading, errore }
}