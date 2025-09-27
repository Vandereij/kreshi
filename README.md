# SoulLog Astro Starter v2 (Netlify + Supabase + Tailwind + E2EE)

## Quickstart
1) Create a Supabase project and run `supabase/migrations/0001_init.sql`.
2) Set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` in `.env` (and Netlify env for deploys).
3) Install & run:
   ```bash
   npm i
   npm run dev
   ```

## Features
- **Auth**: Supabase email/password (signup passes `full_name` metadata).
- **Profiles**: Auto-created via **DB trigger** on `auth.users` → `public.profiles`.
- **E2EE**: PBKDF2-derived root key; per-entry AES-GCM DEKs; DEK wrapped with root key.
- **Daily Check-in**: `/app/checkin` — soft palette (#F8F5F1, #3A3A3A, #6B8E7D, #8C6C82), Montserrat (headers) + Inter (body); emoji slider; tags; journaling; mic icon; Log Entry.
- **Journal List**: `/app/journal` — decrypts client-side; delete items.
- **RLS**: Users can only access their own rows.
- **Netlify**: Functions scaffold (`stripe-webhook.ts`).

## Notes
- Replace PBKDF2 with Argon2 (add `argon2-browser`) for production.
- Implement proper key recovery and sharing as needed.
