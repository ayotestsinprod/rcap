import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "./env";

/**
 * Server-only client that bypasses RLS. Use for trusted aggregates (e.g. homepage counts)
 * when no user session exists yet. Returns null if SUPABASE_SERVICE_ROLE_KEY is unset.
 */
export function tryCreateServiceRoleClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(getSupabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
