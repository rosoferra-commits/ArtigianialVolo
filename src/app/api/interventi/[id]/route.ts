// src/app/api/interventi/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer }            from '@/lib/supabase-server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body   = await req.json()
    const sb     = await supabaseServer()

    const aggiornamento: Record<string, unknown> = {}

    if (body.fase                    !== undefined) aggiornamento.fase                    = body.fase
    if (body.artigiano_lat           !== undefined) aggiornamento.artigiano_lat           = body.artigiano_lat
    if (body.artigiano_lng           !== undefined) aggiornamento.artigiano_lng           = body.artigiano_lng
    if (body.totale_proposto         !== undefined) aggiornamento.totale_proposto         = body.totale_proposto
    if (body.cliente_accetta         !== undefined) aggiornamento.cliente_accetta         = body.cliente_accetta
    if (body.scade_at                !== undefined) aggiornamento.scade_at                = body.scade_at
    if (body.costo_chiamata          !== undefined) aggiornamento.costo_chiamata          = body.costo_chiamata
    if (body.costo_chiamata_urgente  !== undefined) aggiornamento.costo_chiamata_urgente  = body.costo_chiamata_urgente

    if (Object.keys(aggiornamento).length === 0) {
      return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })
    }

    const { error } = await sb
      .from('interventi')
      .update(aggiornamento)
      .eq('id', id)

    if (error) {
      console.error('[PATCH /api/interventi/:id]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })

  } catch (e) {
    console.error('[PATCH /api/interventi/:id] eccezione:', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
