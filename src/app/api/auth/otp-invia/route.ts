// src/app/api/auth/otp-invia/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer }            from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { telefono } = await req.json()
  if (!telefono) return NextResponse.json({ error: 'Numero mancante' }, { status: 400 })

  const sb = await supabaseServer()
  const { error } = await sb.auth.signInWithOtp({
    phone:   telefono,
    options: { shouldCreateUser: true },
  })

  if (error) {
    console.error('[otp-invia]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
