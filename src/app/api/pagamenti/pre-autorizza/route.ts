// src/app/api/pagamenti/pre-autorizza/route.ts
// In modalità test bypassa Stripe e porta l'intervento in fase 'richiesto'.
// NON tocca scade_at — è già stato impostato a +5 minuti da POST /api/interventi.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer }            from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const sb = await supabaseServer()
    const { intervento_id } = await req.json()

    if (!intervento_id) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
    }

    const { error } = await sb
      .from('interventi')
      .update({ fase: 'richiesto' })
      .eq('id', intervento_id)

    if (error) {
      console.error('[pre-autorizza]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, test_mode: true })

  } catch (e) {
    console.error('[pre-autorizza] eccezione:', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}