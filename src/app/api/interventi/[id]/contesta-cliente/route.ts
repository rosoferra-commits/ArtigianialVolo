// src/app/api/interventi/[id]/contesta-cliente/route.ts
//
// Il cliente segnala un problema durante la finestra di conferma.
// Blocca la cattura automatica e sposta l'intervento in revisione
// manuale (richiede intervento dello staff/admin — vedi §5 spec:
// per l'MVP basta anche solo una vista Supabase per la revisione).

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer }            from '@/lib/supabase-server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { motivo } = await req.json()
    const sb = await supabaseServer()

    if (!motivo || !motivo.trim()) {
      return NextResponse.json({ error: 'Specifica il motivo della contestazione' }, { status: 400 })
    }

    const { data: int, error: intErr } = await sb
      .from('interventi')
      .select('fase')
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

    const { error: updErr } = await sb
      .from('interventi')
      .update({
        fase:                 'in_contestazione',
        motivo_contestazione: motivo.trim(),
      })
      .eq('id', id)

    if (updErr) {
      console.error('[contesta-cliente]', updErr)
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    // Nessuna cattura pagamento qui — resta bloccato fino a revisione manuale.
    return NextResponse.json({ ok: true })

  } catch (e) {
    console.error('[contesta-cliente] eccezione:', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
