// src/app/api/interventi/[id]/concludi/route.ts
//
// Chiamata quando l'ARTIGIANO preme "Lavoro concluso" — segnale
// indipendente dalla conferma del cliente. Apre una finestra di 48 ore
// durante la quale il cliente può confermare o contestare. Se non fa
// nulla, un job pg_cron cattura automaticamente il pagamento.
//
// Vedi anche: /api/interventi/[id]/conferma-cliente
//             /api/interventi/[id]/contesta-cliente
//             /api/cron/chiudi-interventi-scaduti (job pg_cron)

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer }            from '@/lib/supabase-server'

// Finestra di conferma: 48 ore.
// ⚠️ Da verificare contro la scadenza reale delle pre-autorizzazioni Stripe
// prima del collegamento Stripe definitivo (vedi nota nella spec originale).
const ORE_FINESTRA_CONFERMA = 48

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sb = await supabaseServer()

    const { data: int, error: intErr } = await sb
      .from('interventi')
      .select('fase, artigiano_id')
      .eq('id', id)
      .maybeSingle()

    if (intErr || !int) {
      return NextResponse.json({ error: 'Intervento non trovato' }, { status: 404 })
    }

    if (int.fase !== 'approvato') {
      return NextResponse.json(
        { error: `Fase non valida per questa operazione: ${int.fase}` },
        { status: 422 }
      )
    }

    const ora = new Date()
    const scadeConfermaAt = new Date(ora.getTime() + ORE_FINESTRA_CONFERMA * 60 * 60 * 1000)

    const { error: updErr } = await sb
      .from('interventi')
      .update({
        fase:                   'finestra_conferma',
        artigiano_concluso_at:  ora.toISOString(),
        scade_conferma_at:      scadeConfermaAt.toISOString(),
      })
      .eq('id', id)

    if (updErr) {
      console.error('[concludi]', updErr)
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      scade_conferma_at: scadeConfermaAt.toISOString(),
    })

  } catch (e) {
    console.error('[concludi] eccezione:', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
