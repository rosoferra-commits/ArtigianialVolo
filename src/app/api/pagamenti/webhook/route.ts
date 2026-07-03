// src/app/api/pagamenti/webhook/route.ts
// Stripe webhook: gestisce eventi asincroni (rimborsi, fallimenti, ecc.)
import { NextRequest, NextResponse } from 'next/server'
import { stripe }                    from '@/lib/stripe'
import { supabaseServer }            from '@/lib/supabase-server'

export const runtime = 'edge' // Body raw necessario per la firma Stripe

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''

  let event: ReturnType<typeof stripe.webhooks.constructEvent>
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (e) {
    console.error('[webhook] firma non valida', e)
    return NextResponse.json({ error: 'Firma non valida' }, { status: 400 })
  }

  const sb = await supabaseServer()

  switch (event.type) {
    case 'payment_intent.payment_failed': {
      const pi = event.data.object
      const interventoId = pi.metadata?.intervento_id
      if (interventoId) {
        await sb.from('interventi')
          .update({ fase: 'rifiutato' })
          .eq('id', interventoId)
      }
      break
    }
    // Aggiungi altri eventi se necessario
    default:
      break
  }

  return NextResponse.json({ received: true })
}
