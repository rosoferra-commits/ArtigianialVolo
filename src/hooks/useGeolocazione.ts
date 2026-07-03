// src/hooks/useGeolocazione.ts
'use client'

import { useEffect, useState } from 'react'

export function useGeolocazione() {
  const [pos,    setPos]    = useState<{ lat: number; lng: number } | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setErrore('GPS non supportato dal browser')
      return
    }

    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => {
        if (e.code === e.PERMISSION_DENIED)
          setErrore('Abilita il GPS per vedere gli artigiani vicini')
        else
          setErrore('GPS non disponibile')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )

    return () => navigator.geolocation.clearWatch(id)
  }, [])

  return { pos, errore }
}
