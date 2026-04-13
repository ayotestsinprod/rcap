import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createInboundEmailDataset,
  type RexEmailExtractionRow,
  type RexInboundEmailAttachmentRow,
  type RexInboundEmailRow,
} from "./factories";

const DUMMY = "00000000-0000-0000-0000-000000000000";

const CHUNK = 100;

async function deleteAllInboundEmails(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase
    .from("rex_inbound_emails")
    .delete()
    .neq("id", DUMMY);
  if (error) throw error;
}

async function insertChunkedTable<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: "rex_inbound_emails" | "rex_email_extractions" | "rex_inbound_email_attachments",
  rows: T[],
): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from(table).insert(slice);
    if (error) throw error;
  }
}

export type SeedInboundEmailOptions = {
  count: number;
  append: boolean;
  callLogsOnly?: boolean;
  callLogRatio?: number;
};

export type SeedInboundEmailResult = {
  emails: RexInboundEmailRow[];
  extractions: RexEmailExtractionRow[];
  attachments: RexInboundEmailAttachmentRow[];
};

/**
 * Inserts rex_inbound_emails and optional rex_email_extractions / rex_inbound_email_attachments.
 * Clearing removes all inbound rows (CASCADE drops children).
 */
export async function seedInboundEmails(
  supabase: SupabaseClient,
  options: SeedInboundEmailOptions,
): Promise<SeedInboundEmailResult> {
  const { count, append, callLogsOnly, callLogRatio } = options;

  if (count <= 0) {
    return { emails: [], extractions: [], attachments: [] };
  }

  if (!append) {
    await deleteAllInboundEmails(supabase);
  }

  const { emails, extractions, attachments } = createInboundEmailDataset(count, {
    callLogsOnly,
    callLogRatio,
  });

  await insertChunkedTable(supabase, "rex_inbound_emails", emails);
  if (extractions.length > 0) {
    await insertChunkedTable(supabase, "rex_email_extractions", extractions);
  }
  if (attachments.length > 0) {
    await insertChunkedTable(supabase, "rex_inbound_email_attachments", attachments);
  }

  return { emails, extractions, attachments };
}
