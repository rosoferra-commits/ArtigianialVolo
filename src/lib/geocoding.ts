// src/lib/geocoding.ts
// Converte un indirizzo testuale in lat/lng usando Google Geocoding API

export async function geocodificaIndirizzo(
  indirizzo: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(indirizzo)}&key=${apiKey}`
    const res  = await fetch(url)
    const data = await res.json()

    if (data.status !== 'OK' || !data.results?.[0]) {
      console.warn('[geocoding] indirizzo non trovato:', indirizzo, data.status)
      return null
    }

    const loc = data.results[0].geometry.location
    return { lat: loc.lat, lng: loc.lng }

  } catch (e) {
    console.error('[geocoding] errore:', e)
    return null
  }
}
