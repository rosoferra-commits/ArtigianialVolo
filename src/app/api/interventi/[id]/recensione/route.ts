// src/app/api/interventi/[id]/recensione/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer }            from '@/lib/supabase-server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }   = await params
    const { stelle } = await req.json()

    if (!stelle || stelle < 1 || stelle > 5) {
      return NextResponse.json({ error: 'Stelle non valide (1-5)' }, { status: 400 })
    }

    const sb = await supabaseServer()

    // Salva le stelle sull'intervento
    const { error: intErr } = await sb
      .from('interventi')
      .update({ stelle_cliente: stelle })
      .eq('id', id)

    if (intErr) {
      console.error('[recensione]', intErr)
      return NextResponse.json({ error: intErr.message }, { status: 500 })
    }

    // Aggiorna la media sull'artigiano
    const { data: intervento } = await sb
      .from('interventi')
      .select('artigiano_id')
      .eq('id', id)
      .maybeSingle()

    if (intervento?.artigiano_id) {
      const { data: recensioni } = await sb
        .from('interventi')
        .select('stelle_cliente')
        .eq('artigiano_id', intervento.artigiano_id)
        .not('stelle_cliente', 'is', null)

      if (recensioni && recensioni.length > 0) {
        const media = recensioni.reduce((acc, r) => acc + (r.stelle_cliente ?? 0), 0) / recensioni.length
        await sb
          .from('artigiani')
          .update({ valutazione_media: Math.round(media * 10) / 10 })
          .eq('id', intervento.artigiano_id)
      }
    }

    return NextResponse.json({ ok: true })

  } catch (e) {
    console.error('[recensione] eccezione:', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
