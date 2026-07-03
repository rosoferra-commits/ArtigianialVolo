// src/lib/supabase-server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies }            from 'next/headers'
import type { CookieOptions }  from '@supabase/ssr'

export async function supabaseServer() {
  const jar = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (cs: { name: string; value: string; options?: CookieOptions }[]) =>
          cs.forEach(({ name, value, options }) => jar.set(name, value, options)),
      },
    }
  )
}