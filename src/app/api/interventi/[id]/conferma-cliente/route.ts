// src/app/api/interventi/[id]/conferma-cliente/route.ts
//
// Il cliente conferma esplicitamente il lavoro durante la finestra
// di 48 ore aperta da /api/interventi/[id]/concludi. Cattura immediata
// del pagamento (quando Stripe sarà collegato — vedi §10 manuale).

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer }            from '@/lib/supabase-server'
import { calcolaCommissione }        from '@/types'
// import { stripe } from '@/lib/stripe'  // ← decommentare quando Stripe è attivo

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sb = await supabaseServer()

    const { data: int, error: intErr } = await sb
      .from('interventi')
      .select('fase, costo_chiamata, totale_proposto, stripe_payment_intent')
      .eq('id', id)
      .maybeSingle()

    if (intErr || !int) {
      return NextResponse.json({ error: 'Intervento non trovato' }, { status: 404 })
    }

    if (int.fase !== 'finestra_conferma') {
      return NextResponse.json(
        { error: `Fase non valida per questa operazione: ${int.fase}` },
        { status: 422 }
      )
    }

    const totaleFinale = int.costo_chiamata + (int.totale_proposto ?? 0)
    const commissione   = calcolaCommissione('lavoro_accettato', totaleFinale * 100)

    // ── Stripe (attivare quando pronto) ──────────────────────────────────────
    // if (int.stripe_payment_intent) {
    //   await stripe.paymentIntents.update(int.stripe_payment_intent, {
    //     application_fee_amount: commissione,
    //   })
    //   await stripe.paymentIntents.capture(int.stripe_payment_intent)
    // }
    // ─────────────────────────────────────────────────────────────────────────

    const { error: updErr } = await sb
      .from('interventi')
      .update({
        fase:            'pagato',
        commissione_app: commissione,
        chiusura_automatica: false,
      })
      .eq('id', id)

    if (updErr) {
      console.error('[conferma-cliente]', updErr)
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, totale_finale: totaleFinale, commissione })

  } catch (e) {
    console.error('[conferma-cliente] eccezione:', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
