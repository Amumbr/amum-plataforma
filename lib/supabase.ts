import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Lazy Supabase client — inicializado apenas no browser, nunca no servidor.
 * Retorna null se não estiver no browser ou se as env vars estiverem ausentes.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!url.startsWith('https://') || key.length < 20) return null;

  if (!_client) _client = createClient(url, key);
  return _client;
}
