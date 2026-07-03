// src/app/api/artigiano/route.ts
// GET  — legge profilo artigiano loggato
// POST — crea/aggiorna profilo (onboarding)
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer }            from '@/lib/supabase-server'

export async function GET() {
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data, error } = await sb
    .from('artigiani')
    .select('*')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ artigiano: data })
}

export async function POST(req: NextRequest) {
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const {
    nome, telefono, categoria, indirizzo,
    partita_iva, iban,
    costo_chiamata_sos, costo_chiamata_urgente, costo_orario,
  } = await req.json()

  if (!nome || !telefono || !categoria) {
    return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
  }

  const { error } = await sb.from('artigiani').upsert({
    auth_id:                user.id,
    nome,
    telefono,
    categoria,
    indirizzo:              indirizzo   ?? null,
    partita_iva:            partita_iva ?? null,
    iban:                   iban        ?? null,
    costo_chiamata_sos:     Number(costo_chiamata_sos)     || 50,
    costo_chiamata_urgente: Number(costo_chiamata_urgente) || 25,
    costo_orario:           Number(costo_orario)           || 60,
    onboarding_completo:    true,
  }, { onConflict: 'auth_id' })

  if (error) {
    console.error('[artigiano POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}