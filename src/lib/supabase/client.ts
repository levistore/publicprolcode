import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/** True bila kredensial Supabase tersedia. Kalau tidak, app jalan mode lokal. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

let cached: SupabaseClient | null = null

/**
 * Client Supabase sisi browser.
 * Hanya ANON key yang dipakai — service-role key tidak pernah masuk client.
 */
export function createClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  if (cached) return cached
  cached = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  return cached
}

export { createClient as getBrowserClient }
