import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { tryCreateServiceRoleClient } from "@/lib/supabase/service-role";
import type {
  WorkspaceEmailAttachmentRow,
  WorkspaceEmailDetail,
  WorkspaceEmailListRow,
  WorkspaceEmailsPageResult,
} from "@/lib/data/workspace-emails.types";
import { WORKSPACE_EMAILS_PAGE_SIZE_MAX } from "@/lib/data/workspace-emails.types";

export type {
  WorkspaceEmailAttachmentRow,
  WorkspaceEmailDetail,
  WorkspaceEmailListRow,
  WorkspaceEmailsPageResult,
};
export {
  WORKSPACE_EMAILS_PAGE_SIZE_DEFAULT,
  WORKSPACE_EMAILS_PAGE_SIZE_MAX,
} from "@/lib/data/workspace-emails.types";

function mapListRow(r: Record<string, unknown>): WorkspaceEmailListRow {
  return {
    id: String(r.id ?? ""),
    fromName: r.from_name == null ? null : String(r.from_name),
    fromAddress: String(r.from_address ?? ""),
    subject: String(r.subject ?? ""),
    snippet: r.snippet == null ? null : String(r.snippet),
    receivedAt:
      r.received_at == null ? "" : String(r.received_at),
  };
}

function mapAttachmentRow(r: Record<string, unknown>): WorkspaceEmailAttachmentRow {
  const size = r.size_bytes;
  let sizeBytes: number | null = null;
  if (typeof size === "number" && Number.isFinite(size)) {
    sizeBytes = size;
  } else if (typeof size === "string") {
    const n = Number.parseInt(size, 10);
    sizeBytes = Number.isFinite(n) ? n : null;
  }
  return {
    id: String(r.id ?? ""),
    filename: String(r.filename ?? ""),
    contentType: r.content_type == null ? null : String(r.content_type),
    sizeBytes,
    storageBucket: r.storage_bucket == null ? null : String(r.storage_bucket),
    storagePath: r.storage_path == null ? null : String(r.storage_path),
  };
}

export async function fetchWorkspaceEmailsPageWithClient(
  client: SupabaseClient,
  params: { search: string | null; page: number; pageSize: number },
): Promise<WorkspaceEmailsPageResult> {
  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.min(
    WORKSPACE_EMAILS_PAGE_SIZE_MAX,
    Math.max(1, Math.floor(params.pageSize)),
  );
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  let q = client
    .from("rex_inbound_emails")
    .select("id,from_name,from_address,subject,snippet,received_at", {
      count: "exact",
    })
    .order("received_at", { ascending: false });

  if (params.search) {
    const s = params.search.replace(/,/g, " ").trim();
    if (s.length > 0) {
      const pat = `%${s}%`;
      q = q.or(
        `subject.ilike.${pat},from_address.ilike.${pat},snippet.ilike.${pat}`,
      );
    }
  }

  const { data, error, count } = await q.range(start, end);

  if (error) throw error;

  const rowsRaw = Array.isArray(data) ? data : [];
  const rows: WorkspaceEmailListRow[] = rowsRaw.map((r) =>
    mapListRow(r as Record<string, unknown>),
  );
  const total =
    typeof count === "number" && Number.isFinite(count) ? count : rows.length;

  return { rows, total };
}

export async function getWorkspaceEmailsPage(params: {
  search: string | null;
  page: number;
  pageSize: number;
}): Promise<WorkspaceEmailsPageResult> {
  const service = tryCreateServiceRoleClient();
  const userScoped = await createServerSupabaseClient();
  const client = service ?? userScoped;
  return fetchWorkspaceEmailsPageWithClient(client, params);
}

export async function fetchWorkspaceEmailDetailWithClient(
  client: SupabaseClient,
  id: string,
): Promise<WorkspaceEmailDetail | null> {
  const { data: email, error: e1 } = await client
    .from("rex_inbound_emails")
    .select(
      "id,received_at,from_name,from_address,to_addresses,subject,body_text,body_html,snippet",
    )
    .eq("id", id)
    .maybeSingle();

  if (e1) throw e1;
  if (!email) return null;

  const row = email as Record<string, unknown>;

  const { data: atts, error: e2 } = await client
    .from("rex_inbound_email_attachments")
    .select("id,filename,content_type,size_bytes,storage_bucket,storage_path")
    .eq("email_id", id)
    .order("created_at", { ascending: true });

  if (e2) throw e2;

  const toRaw = row.to_addresses;
  const toAddresses = Array.isArray(toRaw)
    ? toRaw.map((x) => String(x))
    : [];

  const attachments: WorkspaceEmailAttachmentRow[] = (Array.isArray(atts)
    ? atts
    : []
  ).map((a) => mapAttachmentRow(a as Record<string, unknown>));

  return {
    id: String(row.id ?? ""),
    receivedAt:
      row.received_at == null ? "" : String(row.received_at),
    fromName: row.from_name == null ? null : String(row.from_name),
    fromAddress: String(row.from_address ?? ""),
    toAddresses,
    subject: String(row.subject ?? ""),
    bodyText: row.body_text == null ? null : String(row.body_text),
    bodyHtml: row.body_html == null ? null : String(row.body_html),
    snippet: row.snippet == null ? null : String(row.snippet),
    attachments,
  };
}

export async function fetchWorkspaceEmailDetail(
  id: string,
): Promise<WorkspaceEmailDetail | null> {
  const service = tryCreateServiceRoleClient();
  const userScoped = await createServerSupabaseClient();
  const client = service ?? userScoped;
  return fetchWorkspaceEmailDetailWithClient(client, id);
}

export async function fetchWorkspaceEmailAttachmentMeta(
  client: SupabaseClient,
  emailId: string,
  attachmentId: string,
): Promise<WorkspaceEmailAttachmentRow | null> {
  const { data, error } = await client
    .from("rex_inbound_email_attachments")
    .select("id,filename,content_type,size_bytes,storage_bucket,storage_path")
    .eq("id", attachmentId)
    .eq("email_id", emailId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapAttachmentRow(data as Record<string, unknown>);
}
