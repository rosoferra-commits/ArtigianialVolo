// src/app/api/interventi/accetta-e-annulla-altri/route.ts
//
// Risolve la race condition: due clienti chiamano lo stesso artigiano
// quasi contemporaneamente. Quando l'artigiano accetta UNO dei due
// interventi, questa route:
//
//   1. Porta l'intervento accettato a fase 'accettato'
//   2. Trova TUTTI gli altri interventi pendenti (fase 'richiesto')
//      dello stesso artigiano e li porta a 'annullato_concorrenza'
//      così il cliente perdente vede subito un messaggio chiaro
//      invece di aspettare il timeout silenzioso dei 5 minuti.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer }            from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const sb = await supabaseServer()
    const { intervento_id, artigiano_id } = await req.json()

    if (!intervento_id || !artigiano_id) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
    }

    // 1. Accetta l'intervento scelto
    const { error: accettaErr } = await sb
      .from('interventi')
      .update({ fase: 'accettato' })
      .eq('id', intervento_id)
      .eq('fase', 'richiesto') // difesa extra: solo se ancora in attesa

    if (accettaErr) {
      console.error('[accetta-e-annulla-altri] accetta:', accettaErr)
      return NextResponse.json({ error: accettaErr.message }, { status: 500 })
    }

    // 2. Trova e annulla tutti gli ALTRI interventi pendenti dello stesso artigiano
    const { data: altriPendenti, error: selErr } = await sb
      .from('interventi')
      .select('id')
      .eq('artigiano_id', artigiano_id)
      .eq('fase', 'richiesto')
      .neq('id', intervento_id)

    if (selErr) {
      console.error('[accetta-e-annulla-altri] select altri:', selErr)
    }

    if (altriPendenti && altriPendenti.length > 0) {
      const idsDaAnnullare = altriPendenti.map(i => i.id)
      const { error: annullaErr } = await sb
        .from('interventi')
        .update({ fase: 'annullato_concorrenza' })
        .in('id', idsDaAnnullare)

      if (annullaErr) {
        console.error('[accetta-e-annulla-altri] annulla altri:', annullaErr)
      } else {
        console.log(`[accetta-e-annulla-altri] annullati ${idsDaAnnullare.length} interventi concorrenti`)
      }
    }

    return NextResponse.json({
      ok: true,
      altri_annullati: altriPendenti?.length ?? 0,
    })

  } catch (e) {
    console.error('[accetta-e-annulla-altri] eccezione:', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
