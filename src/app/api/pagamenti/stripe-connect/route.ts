// src/app/api/pagamenti/stripe-connect/route.ts
// Crea un account Stripe Connect Express per l'artigiano
// e restituisce il link di onboarding per inserire i dati bancari (IBAN).
import { NextRequest, NextResponse } from 'next/server'
import { stripe }                    from '@/lib/stripe'
import { supabaseServer }            from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { artigiano_id } = await req.json()

  // Crea account Express Stripe
  const account = await stripe.accounts.create({
    type:    'express',
    country: 'IT',
    capabilities: {
      transfers: { requested: true },
      // SEPA per accettare bonifici su IBAN
      sepa_debit_payments: { requested: true },
    },
    metadata: { artigiano_id },
  })

  // Salva stripe_account_id sull'artigiano
  await sb
    .from('artigiani')
    .update({ stripe_account_id: account.id })
    .eq('id', artigiano_id)

  // Link di onboarding Stripe (inserimento IBAN, documenti)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!
  const link = await stripe.accountLinks.create({
    account:     account.id,
    refresh_url: `${baseUrl}/artigiano/dashboard?stripe=refresh`,
    return_url:  `${baseUrl}/artigiano/dashboard?stripe=ok`,
    type:        'account_onboarding',
  })

  return NextResponse.json({ url: link.url })
}
