import { createServerSupabaseClient } from "@/lib/supabase/server";
import { tryCreateServiceRoleClient } from "@/lib/supabase/service-role";

const LIST_LIMIT = 80;

export type WorkspaceOrganisationRow = {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
};

export type WorkspaceDealRow = {
  id: string;
  title: string;
  size: number | null;
  deal_type: string | null;
  sector: string | null;
  structure: string | null;
  status: string | null;
};

export type WorkspaceSuggestionRow = {
  id: string;
  title: string | null;
  body: string | null;
  status: string;
};

export type WorkspaceLists = {
  organisations: WorkspaceOrganisationRow[];
  deals: WorkspaceDealRow[];
  suggestions: WorkspaceSuggestionRow[];
};

const empty: WorkspaceLists = {
  organisations: [],
  deals: [],
  suggestions: [],
};

/**
 * Loads recent rows for sidebar surfaces. Uses service role when set (same as dashboard counts)
 * so lists work before auth; otherwise anon + RLS (typically empty until login).
 */
export async function getWorkspaceLists(): Promise<WorkspaceLists> {
  const service = tryCreateServiceRoleClient();
  const userScoped = await createServerSupabaseClient();
  const client = service ?? userScoped;

  if (process.env.NODE_ENV === "development" && !service) {
    console.warn(
      "[rex-robson] Supabase: no service role key — workspace lists use anon + RLS and will be empty without an authenticated session. Set SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }

  try {
    const [orgsRes, dealsRes, suggestionsRes] = await Promise.all([
      client
        .from("organisations")
        .select("id,name,type,description")
        .order("created_at", { ascending: false })
        .limit(LIST_LIMIT),
      client
        .from("deals")
        .select("id,title,size,deal_type,sector,structure,status")
        .or("status.is.null,status.not.in.(passed,closed)")
        .order("created_at", { ascending: false })
        .limit(LIST_LIMIT),
      client
        .from("suggestions")
        .select("id,title,body,status")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(LIST_LIMIT),
    ]);

    if (orgsRes.error) throw orgsRes.error;
    if (dealsRes.error) throw dealsRes.error;
    if (suggestionsRes.error) throw suggestionsRes.error;

    return {
      organisations: (orgsRes.data ?? []) as WorkspaceOrganisationRow[],
      deals: (dealsRes.data ?? []) as WorkspaceDealRow[],
      suggestions: (suggestionsRes.data ?? []) as WorkspaceSuggestionRow[],
    };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[rex-robson] getWorkspaceLists failed:", err);
    }
    return empty;
  }
}
