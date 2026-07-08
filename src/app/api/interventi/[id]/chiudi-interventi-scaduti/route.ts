// src/app/api/cron/chiudi-interventi-scaduti/route.ts
//
// Chiamata da un job pg_cron (via pg_net) ogni 5 minuti — stesso pattern
// già in uso per la pulizia degli artigiani disconnessi.
//
// Trova tutti gli interventi in 'finestra_conferma' con
// scade_conferma_at < now() e cattura automaticamente il pagamento.
//
// ⚠️ Protetta da un secret condiviso (CRON_SECRET) per evitare che
// chiunque scopra l'URL e forzi chiusure premature.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin }             from '@/lib/supabase-admin'
import { calcolaCommissione }        from '@/types'
// import { stripe } from '@/lib/stripe'  // ← decommentare quando Stripe è attivo

export async function POST(req: NextRequest) {
  try {
    // Verifica il secret condiviso — solo pg_cron (o noi manualmente
    // per test) deve poter chiamare questa route.
    const secret = req.headers.get('x-cron-secret')
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const ora = new Date().toISOString()

    const { data: scaduti, error: selErr } = await supabaseAdmin
      .from('interventi')
      .select('id, costo_chiamata, totale_proposto, stripe_payment_intent')
      .eq('fase', 'finestra_conferma')
      .lt('scade_conferma_at', ora)

    if (selErr) {
      console.error('[cron chiudi-interventi] select:', selErr)
      return NextResponse.json({ error: selErr.message }, { status: 500 })
    }

    if (!scaduti || scaduti.length === 0) {
      return NextResponse.json({ ok: true, chiusi: 0 })
    }

    let chiusiConSuccesso = 0

    for (const int of scaduti) {
      const totaleFinale = int.costo_chiamata + (int.totale_proposto ?? 0)
      const commissione   = calcolaCommissione('lavoro_accettato', totaleFinale * 100)

      // ── Stripe (attivare quando pronto) ────────────────────────────────
      // if (int.stripe_payment_intent) {
      //   await stripe.paymentIntents.update(int.stripe_payment_intent, {
      //     application_fee_amount: commissione,
      //   })
      //   await stripe.paymentIntents.capture(int.stripe_payment_intent)
      // }
      // ────────────────────────────────────────────────────────────────────

      const { error: updErr } = await supabaseAdmin
        .from('interventi')
        .update({
          fase:                'pagato',
          commissione_app:     commissione,
          chiusura_automatica: true,
        })
        .eq('id', int.id)

      if (updErr) {
        console.error(`[cron chiudi-interventi] update fallito per ${int.id}:`, updErr)
      } else {
        chiusiConSuccesso++
      }
    }

    console.log(`[cron chiudi-interventi] chiusi automaticamente: ${chiusiConSuccesso}/${scaduti.length}`)

    return NextResponse.json({ ok: true, chiusi: chiusiConSuccesso, totali: scaduti.length })

  } catch (e) {
    console.error('[cron chiudi-interventi] eccezione:', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
