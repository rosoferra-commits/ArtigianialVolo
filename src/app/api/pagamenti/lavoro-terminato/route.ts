// src/app/api/pagamenti/lavoro-terminato/route.ts
//
// Chiamata quando il cliente certifica che il lavoro è stato completato
// in modo soddisfacente.
//
// Effetti:
//   1. Cattura il PaymentIntent Stripe (addebito reale).
//   2. Porta la fase a 'pagato'.
//
// A questo punto il denaro (diritto di chiamata + lavoro approvato)
// viene effettivamente addebitato sulla carta del cliente e trasferito
// all'artigiano tramite Stripe Connect, al netto della commissione
// di piattaforma.

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
      .select('costo_chiamata, totale_proposto, stripe_payment_intent, fase')
      .eq('id', intervento_id)
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

    const totaleFinale  = int.costo_chiamata + (int.totale_proposto ?? 0)
    const totaleCents   = totaleFinale * 100
    const commissione   = calcolaCommissione('lavoro_accettato', totaleCents)

    // ── Stripe (attivare quando pronto) ──────────────────────────────────────
    // Quando Stripe sarà collegato, questa sezione cattura il pagamento:
    //
    // if (int.stripe_payment_intent) {
    //   // Aggiorna la commissione prima della cattura
    //   await stripe.paymentIntents.update(int.stripe_payment_intent, {
    //     application_fee_amount: commissione,
    //   })
    //   // Cattura effettiva — denaro addebitato sulla carta del cliente
    //   await stripe.paymentIntents.capture(int.stripe_payment_intent)
    // }
    // ─────────────────────────────────────────────────────────────────────────

    // Porta la fase a 'pagato'
    const { error: updErr } = await sb
      .from('interventi')
      .update({
        fase:           'pagato',
        commissione_app: commissione,
      })
      .eq('id', intervento_id)

    if (updErr) {
      console.error('[lavoro-terminato]', updErr)
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, totale_finale: totaleFinale, commissione })

  } catch (e) {
    console.error('[lavoro-terminato] eccezione:', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
