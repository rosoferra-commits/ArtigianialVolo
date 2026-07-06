// src/app/api/interventi/route.ts
// POST: crea intervento, geocodifica l'indirizzo, imposta timer 5 min
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer }            from '@/lib/supabase-server'
import { geocodificaIndirizzo }      from '@/lib/geocoding'

export async function POST(req: NextRequest) {
  try {
    const {
      artigiano_id, tipo_urgenza,
      cliente_nome, cliente_cognome, cliente_telefono,
      indirizzo, indirizzo_lat, indirizzo_lng, descrizione,
    } = await req.json()

    if (!artigiano_id || !tipo_urgenza)
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })

    if (!['sos', 'urgente'].includes(tipo_urgenza))
      return NextResponse.json({ error: 'tipo_urgenza non valido' }, { status: 400 })

    if (!cliente_nome || !cliente_cognome || !indirizzo)
      return NextResponse.json({ error: 'Nome, cognome e indirizzo sono obbligatori' }, { status: 400 })

    const sb = await supabaseServer()

    const { data: art, error: artErr } = await sb
      .from('artigiani')
      .select('costo_chiamata_sos, costo_chiamata_urgente')
      .eq('id', artigiano_id)
      .maybeSingle()

    if (artErr || !art)
      return NextResponse.json({ error: 'Artigiano non trovato' }, { status: 404 })

    const costo_chiamata = tipo_urgenza === 'sos'
      ? art.costo_chiamata_sos
      : art.costo_chiamata_urgente

    // Se il cliente ha già selezionato un suggerimento dall'autocomplete,
    // le coordinate arrivano già pronte — niente bisogno di geocodificare.
    let coords: { lat: number; lng: number } | null =
      (typeof indirizzo_lat === 'number' && typeof indirizzo_lng === 'number')
        ? { lat: indirizzo_lat, lng: indirizzo_lng }
        : null

    if (!coords) {
      coords = await geocodificaIndirizzo(indirizzo)
    }

    if (!coords) {
      return NextResponse.json(
        { error: 'Indirizzo non trovato. Prova a selezionarlo dal menu a tendina mentre digiti.' },
        { status: 422 }
      )
    }

    // scade_at = ora + 5 minuti (timer risposta artigiano)
    const scade_at = new Date(Date.now() + 5 * 60_000).toISOString()

    const { data: intervento, error: intErr } = await sb
      .from('interventi')
      .insert({
        artigiano_id,
        tipo_urgenza,
        costo_chiamata,
        costo_chiamata_urgente: art.costo_chiamata_urgente,
        fase:             'richiesto',
        scade_at,
        cliente_nome,
        cliente_cognome,
        cliente_telefono: cliente_telefono ?? null,
        indirizzo,
        indirizzo_lat:    coords.lat,
        indirizzo_lng:    coords.lng,
        descrizione:      descrizione ?? null,
      })
      .select('id, scade_at')
      .single()

    if (intErr) {
      console.error('[POST /api/interventi]', intErr)
      return NextResponse.json({ error: intErr.message }, { status: 500 })
    }

    // Rimuove SUBITO l'artigiano dalla mappa — non deve essere cliccabile
    // da altri clienti mentre sta valutando questa richiesta (5 minuti).
    // Senza questo, due clienti potrebbero cliccare sullo stesso pin quasi
    // in contemporanea prima che l'artigiano risponda. Se l'artigiano
    // rifiuta o il timer scade, la dashboard artigiano lo re-inserisce
    // automaticamente (vedi funzione rifiuta() in dashboard/page.tsx).
    const { error: rimuoviErr } = await sb
      .from('artigiani_disponibili')
      .delete()
      .eq('artigiano_id', artigiano_id)

    if (rimuoviErr) {
      console.error('[POST /api/interventi] rimozione da disponibili fallita:', rimuoviErr)
    }

    return NextResponse.json({ id: intervento.id, scade_at: intervento.scade_at })

  } catch (e) {
    console.error('[POST /api/interventi] eccezione:', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
