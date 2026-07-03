// src/lib/supabase.ts
// Client unico per tutto il frontend.
// Non usare createClient() multipli — importa sempre da qui.

import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
