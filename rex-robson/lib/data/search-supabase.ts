import { createServerSupabaseClient } from "@/lib/supabase/server";
import { tryCreateServiceRoleClient } from "@/lib/supabase/service-role";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Prefer service role for search so results work before auth; fall back to cookie client + RLS.
 */
export async function createSearchSupabaseClient(): Promise<SupabaseClient> {
  return tryCreateServiceRoleClient() ?? (await createServerSupabaseClient());
}
