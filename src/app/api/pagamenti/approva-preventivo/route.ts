// src/app/api/pagamenti/approva-preventivo/route.ts
//
// Chiamata quando il cliente accetta la stima proposta dall'artigiano.
//
// Effetti:
//   1. Aggiorna il PaymentIntent Stripe all'importo totale
//      (diritto di chiamata + lavoro stimato) — ancora in capture manuale,
//      nessun addebito reale ancora.
//   2. Porta la fase a 'approvato'.
//
// Il denaro verrà effettivamente addebitato solo quando il cliente
// premerà "Lavoro terminato" (/api/pagamenti/lavoro-terminato).

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer }            from '@/lib/supabase-server'
// import { stripe } from '@/lib/stripe'  // ← decommentare quando Stripe è attivo

export async function POST(req: NextRequest) {
  try {
    const sb = await supabaseServer()
    const { intervento_id } = await req.json()

    if (!intervento_id) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
    }

    // Legge i dati necessari dal DB
    const { data: int, error: intErr } = await sb
      .from('interventi')
      .select('costo_chiamata, totale_proposto, stripe_payment_intent, fase')
      .eq('id', intervento_id)
      .maybeSingle()

    if (intErr || !int) {
      return NextResponse.json({ error: 'Intervento non trovato' }, { status: 404 })
    }

    if (int.fase !== 'valutazione') {
      return NextResponse.json(
        { error: `Fase non valida per questa operazione: ${int.fase}` },
        { status: 422 }
      )
    }

    if (!int.totale_proposto) {
      return NextResponse.json(
        { error: 'Nessun preventivo proposto dall\'artigiano' },
        { status: 422 }
      )
    }

    const totaleFinale = int.costo_chiamata + int.totale_proposto

    // ── Stripe (attivare quando pronto) ──────────────────────────────────────
    // Quando Stripe sarà collegato, questa sezione aggiorna l'importo del
    // PaymentIntent all'importo totale (chiamata + lavoro), mantenendo
    // il capture manuale — il denaro rimane bloccato ma non addebitato.
    //
    // if (int.stripe_payment_intent) {
    //   await stripe.paymentIntents.update(int.stripe_payment_intent, {
    //     amount: totaleFinale * 100,  // in centesimi
    //   })
    // }
    // ─────────────────────────────────────────────────────────────────────────

    // Porta la fase ad 'approvato'
    const { error: updErr } = await sb
      .from('interventi')
      .update({
        fase:            'approvato',
        cliente_accetta: true,
      })
      .eq('id', intervento_id)

    if (updErr) {
      console.error('[approva-preventivo]', updErr)
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, totale_finale: totaleFinale })

  } catch (e) {
    console.error('[approva-preventivo] eccezione:', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
