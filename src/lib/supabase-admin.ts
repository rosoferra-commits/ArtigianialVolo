// src/lib/supabase-admin.ts
//
// Client con permessi di amministratore (service_role), usato SOLO
// server-side per operazioni che devono bypassare la RLS — ad esempio
// quando il sistema deve modificare dati per conto di un cliente
// anonimo (non autenticato), come rimuovere un artigiano dalla mappa
// quando arriva una richiesta.
//
// ⚠️ MAI importare questo file in un componente client ('use client').
// La chiave service_role ha accesso completo al database, ignora
// qualsiasi policy RLS. Usare solo in API routes (server-side).

import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  }
)
