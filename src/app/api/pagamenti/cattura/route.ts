// src/app/api/pagamenti/cattura/route.ts
//
// Chiamata quando il cliente RIFIUTA la stima dell'artigiano.
// In questo caso viene catturato solo il diritto di chiamata (non il lavoro).
//
// Se il cliente ACCETTA → usa /api/pagamenti/approva-preventivo
// Se il lavoro è finito → usa /api/pagamenti/lavoro-terminato

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer }            from '@/lib/supabase-server'
import { calcolaCommissione }        from '@/types'
// import { stripe } from '@/lib/stripe'  // ← decommentare quando Stripe è attivo

export async function POST(req: NextRequest) {
  try {
    const sb = await supabaseServer()
    const { intervento_id } = await req.json()

    if (!intervento_id) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
    }

    const { data: int, error: intErr } = await sb
      .from('interventi')
      .select('costo_chiamata, stripe_payment_intent, fase')
      .eq('id', intervento_id)
      .maybeSingle()

    if (intErr || !int) {
      return NextResponse.json({ error: 'Intervento non trovato' }, { status: 404 })
    }

    if (int.fase !== 'valutazione') {
      return NextResponse.json(
        { error: `Fase non valida: ${int.fase}` },
        { status: 422 }
      )
    }

    const chiamataCents = int.costo_chiamata * 100
    const commissione   = calcolaCommissione('solo_chiamata', chiamataCents)

    // ── Stripe (attivare quando pronto) ──────────────────────────────────────
    // Cattura solo il diritto di chiamata:
    //
    // if (int.stripe_payment_intent) {
    //   await stripe.paymentIntents.update(int.stripe_payment_intent, {
    //     amount: chiamataCents,
    //     application_fee_amount: commissione,
    //   })
    //   await stripe.paymentIntents.capture(int.stripe_payment_intent)
    // }
    // ─────────────────────────────────────────────────────────────────────────

    const { error: updErr } = await sb
      .from('interventi')
      .update({
        fase:            'rifiutato',
        cliente_accetta: false,
        commissione_app: commissione,
      })
      .eq('id', intervento_id)

    if (updErr) {
      console.error('[cattura-rifiuto]', updErr)
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, addebitato: int.costo_chiamata })

  } catch (e) {
    console.error('[cattura] eccezione:', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
