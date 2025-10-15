// src/lib/supabase/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClientRoute() {
  const store = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return store.getAll().map((c) => ({
            name: c.name,
            value: c.value,
          }));
        },
        async setAll(
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[]
        ) {
          for (const { name, value, options } of cookiesToSet) {
            store.set({ name, value, ...options });
          }
        },
      },
    }
  );
}
