import type { SupabaseClient } from "@supabase/supabase-js";
import { seedInboundEmails } from "./emailSeed";

export type SeedCallLogsOptions = {
  count: number;
  append: boolean;
};

/**
 * Seeds meeting-note / transcript style emails for the Call Logs surface.
 * Data lands in rex_inbound_emails (same source table as Emails).
 */
export async function seedCallLogs(
  supabase: SupabaseClient,
  options: SeedCallLogsOptions,
) {
  return seedInboundEmails(supabase, {
    count: options.count,
    append: options.append,
    callLogsOnly: true,
  });
}
