import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { tryCreateServiceRoleClient } from "@/lib/supabase/service-role";
import type {
  WorkspaceContactPageRow,
  WorkspaceContactsPageResult,
} from "@/lib/data/workspace-contacts.types";
import {
  WORKSPACE_CONTACTS_PAGE_SIZE_MAX,
} from "@/lib/data/workspace-contacts.types";

export type { WorkspaceContactPageRow, WorkspaceContactsPageResult };
export {
  WORKSPACE_CONTACTS_PAGE_SIZE_DEFAULT,
  WORKSPACE_CONTACTS_PAGE_SIZE_MAX,
} from "@/lib/data/workspace-contacts.types";

function parseRpcPayload(data: unknown): WorkspaceContactsPageResult {
  if (data == null || typeof data !== "object") {
    return { rows: [], total: 0 };
  }
  const o = data as { total?: unknown; rows?: unknown };
  const total = typeof o.total === "number" && Number.isFinite(o.total) ? o.total : 0;
  const rowsRaw = Array.isArray(o.rows) ? o.rows : [];
  const rows: WorkspaceContactPageRow[] = rowsRaw.map((r) => {
    const x = r as Record<string, unknown>;
    return {
      id: String(x.id ?? ""),
      name: String(x.name ?? ""),
      contact_type: x.contact_type == null ? null : String(x.contact_type),
      sector: x.sector == null ? null : String(x.sector),
      role: x.role == null ? null : String(x.role),
      geography: x.geography == null ? null : String(x.geography),
      last_contact_date:
        x.last_contact_date == null ? null : String(x.last_contact_date),
      organisation_id:
        x.organisation_id == null ? null : String(x.organisation_id),
      organisation_name:
        x.organisation_name == null ? null : String(x.organisation_name),
      organisation_type:
        x.organisation_type == null ? null : String(x.organisation_type),
    };
  });
  return { rows, total };
}

/**
 * Older `workspace_contacts_page` RPCs omit `contact_type` / `sector`. Merge from `contacts`
 * so the list UI can show Geography · Type · Sector without requiring a DB migration replay.
 */
async function mergeContactTypeAndSectorFromTable(
  client: SupabaseClient,
  rows: WorkspaceContactPageRow[],
): Promise<WorkspaceContactPageRow[]> {
  if (rows.length === 0) return rows;
  const ids = rows.map((r) => r.id).filter((id) => id.length > 0);
  const { data, error } = await client
    .from("contacts")
    .select("id,contact_type,sector")
    .in("id", ids);
  if (error) {
    // Column missing or RLS — keep RPC rows (42703 = undefined_column)
    const code = (error as { code?: string }).code;
    if (code === "42703" || code === "PGRST204") return rows;
    throw error;
  }
  if (!data?.length) return rows;
  const byId = new Map(
    data.map((d) => [
      String(d.id),
      {
        contact_type:
          d.contact_type == null ? null : String(d.contact_type).trim() || null,
        sector: d.sector == null ? null : String(d.sector).trim() || null,
      },
    ]),
  );
  return rows.map((r) => {
    const extra = byId.get(r.id);
    if (!extra) return r;
    return {
      ...r,
      contact_type: extra.contact_type ?? r.contact_type,
      sector: extra.sector ?? r.sector,
    };
  });
}

export async function fetchWorkspaceContactsPageWithClient(
  client: SupabaseClient,
  params: {
    search: string | null;
    page: number;
    pageSize: number;
    role: string | null;
    organisationType: string | null;
  },
): Promise<WorkspaceContactsPageResult> {
  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.min(
    WORKSPACE_CONTACTS_PAGE_SIZE_MAX,
    Math.max(1, Math.floor(params.pageSize)),
  );

  const { data, error } = await client.rpc("workspace_contacts_page", {
    p_search: params.search ?? "",
    p_page: page,
    p_page_size: pageSize,
    p_role: params.role ?? "",
    p_organisation_type: params.organisationType ?? "",
  });

  if (error) {
    throw error;
  }

  const parsed = parseRpcPayload(data);
  const rows = await mergeContactTypeAndSectorFromTable(client, parsed.rows);
  return { rows, total: parsed.total };
}

/**
 * Server-side contacts page (search + pagination). Prefer service role when set.
 */
export async function getWorkspaceContactsPage(params: {
  search: string | null;
  page: number;
  pageSize: number;
  role: string | null;
  organisationType: string | null;
}): Promise<WorkspaceContactsPageResult> {
  const service = tryCreateServiceRoleClient();
  const userScoped = await createServerSupabaseClient();
  const client = service ?? userScoped;
  return fetchWorkspaceContactsPageWithClient(client, params);
}
