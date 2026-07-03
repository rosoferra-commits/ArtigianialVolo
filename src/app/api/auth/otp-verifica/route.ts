// src/app/api/auth/otp-verifica/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer }            from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { telefono, codice } = await req.json()
  if (!telefono || !codice)
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })

  const sb = await supabaseServer()
  const { data, error } = await sb.auth.verifyOtp({
    phone: telefono,
    token: codice,
    type:  'sms',
  })

  if (error) {
    console.error('[otp-verifica]', error)
    return NextResponse.json({ error: 'Codice non valido' }, { status: 401 })
  }

  // Controlla se esiste già il profilo artigiano
  const { data: art } = await sb
    .from('artigiani')
    .select('onboarding_completo')
    .eq('auth_id', data.user!.id)
    .maybeSingle()

  return NextResponse.json({
    ok:                  true,
    onboarding_completo: art?.onboarding_completo ?? false,
  })
}
