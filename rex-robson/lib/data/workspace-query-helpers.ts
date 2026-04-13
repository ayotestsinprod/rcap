import type { SupabaseClient } from "@supabase/supabase-js";

/** Strip LIKE wildcards; cap length. Returns null if nothing left to search. */
export function safeIlikePattern(raw: string): string | null {
  const t = raw
    .trim()
    .slice(0, 200)
    .replace(/%/g, "")
    .replace(/_/g, "")
    .trim();
  if (!t) return null;
  return `%${t}%`;
}

function uniqueById<T extends { id: string }>(rows: (T | null | undefined)[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    if (!r?.id || seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out;
}

function take<T>(rows: T[], n: number): T[] {
  return rows.slice(0, n);
}

export async function fetchContactsByPattern(
  supabase: SupabaseClient,
  pattern: string,
  limit: number,
): Promise<Record<string, unknown>[]> {
  const cap = Math.min(Math.max(1, limit), 25);
  const [cn, cr, cnotes, cgeo] = await Promise.all([
    supabase
      .from("contacts")
      .select("id,name,role,notes,organisation_id,geography")
      .ilike("name", pattern)
      .limit(cap),
    supabase
      .from("contacts")
      .select("id,name,role,notes,organisation_id,geography")
      .ilike("role", pattern)
      .limit(cap),
    supabase
      .from("contacts")
      .select("id,name,role,notes,organisation_id,geography")
      .ilike("notes", pattern)
      .limit(cap),
    supabase
      .from("contacts")
      .select("id,name,role,notes,organisation_id,geography")
      .ilike("geography", pattern)
      .limit(cap),
  ]);
  return take(
    uniqueById([
      ...(cn.data ?? []),
      ...(cr.data ?? []),
      ...(cnotes.data ?? []),
      ...(cgeo.data ?? []),
    ]),
    cap,
  ) as Record<string, unknown>[];
}

export async function fetchOrganisationsByPattern(
  supabase: SupabaseClient,
  pattern: string,
  limit: number,
): Promise<Record<string, unknown>[]> {
  const cap = Math.min(Math.max(1, limit), 25);
  const [on, od, ot] = await Promise.all([
    supabase
      .from("organisations")
      .select("id,name,type,description")
      .ilike("name", pattern)
      .limit(cap),
    supabase
      .from("organisations")
      .select("id,name,type,description")
      .ilike("description", pattern)
      .limit(cap),
    supabase
      .from("organisations")
      .select("id,name,type,description")
      .ilike("type", pattern)
      .limit(cap),
  ]);
  return take(
    uniqueById([...(on.data ?? []), ...(od.data ?? []), ...(ot.data ?? [])]),
    cap,
  ) as Record<string, unknown>[];
}

export async function fetchDealsByPattern(
  supabase: SupabaseClient,
  pattern: string,
  limit: number,
): Promise<Record<string, unknown>[]> {
  const cap = Math.min(Math.max(1, limit), 25);
  const [dt, dn, ds, dst, ddt] = await Promise.all([
    supabase
      .from("deals")
      .select("id,title,size,deal_type,sector,structure,status,notes")
      .ilike("title", pattern)
      .limit(cap),
    supabase
      .from("deals")
      .select("id,title,size,deal_type,sector,structure,status,notes")
      .ilike("notes", pattern)
      .limit(cap),
    supabase
      .from("deals")
      .select("id,title,size,deal_type,sector,structure,status,notes")
      .ilike("sector", pattern)
      .limit(cap),
    supabase
      .from("deals")
      .select("id,title,size,deal_type,sector,structure,status,notes")
      .ilike("structure", pattern)
      .limit(cap),
    supabase
      .from("deals")
      .select("id,title,size,deal_type,sector,structure,status,notes")
      .ilike("deal_type", pattern)
      .limit(cap),
  ]);
  return take(
    uniqueById([
      ...(dt.data ?? []),
      ...(dn.data ?? []),
      ...(ds.data ?? []),
      ...(dst.data ?? []),
      ...(ddt.data ?? []),
    ]),
    cap,
  ) as Record<string, unknown>[];
}

export async function fetchPendingSuggestionsByPattern(
  supabase: SupabaseClient,
  pattern: string,
  limit: number,
): Promise<Record<string, unknown>[]> {
  const cap = Math.min(Math.max(1, limit), 25);
  const [st, sb] = await Promise.all([
    supabase
      .from("suggestions")
      .select("id,title,body,status")
      .eq("status", "pending")
      .ilike("title", pattern)
      .limit(cap),
    supabase
      .from("suggestions")
      .select("id,title,body,status")
      .eq("status", "pending")
      .ilike("body", pattern)
      .limit(cap),
  ]);
  return take(
    uniqueById([...(st.data ?? []), ...(sb.data ?? [])]),
    cap,
  ) as Record<string, unknown>[];
}
