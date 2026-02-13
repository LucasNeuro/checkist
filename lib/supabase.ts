/**
 * Cliente Supabase no browser (só front + Supabase, sem backend).
 * Use a chave anon no .env — nunca a service_role no front.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;
