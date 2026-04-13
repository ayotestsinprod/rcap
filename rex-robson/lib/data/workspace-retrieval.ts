import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchContactsByPattern,
  fetchDealsByPattern,
  fetchOrganisationsByPattern,
  fetchPendingSuggestionsByPattern,
  safeIlikePattern,
} from "./workspace-query-helpers";

const PER_TABLE = 10;

/**
 * Full deterministic scan (same ILIKE strategy as tool handlers), formatted for reconciliation.
 */
export async function buildWorkspaceRetrievalContext(
  supabase: SupabaseClient,
  query: string,
): Promise<string> {
  const pattern = safeIlikePattern(query);
  if (!pattern) {
    return [
      "## Deterministic workspace retrieval",
      "",
      "No searchable text after sanitizing the query (empty or only wildcards).",
      "Tell the user to enter a name, company, deal title, or keyword.",
    ].join("\n");
  }

  const [contacts, orgs, deals, suggestions] = await Promise.all([
    fetchContactsByPattern(supabase, pattern, PER_TABLE),
    fetchOrganisationsByPattern(supabase, pattern, PER_TABLE),
    fetchDealsByPattern(supabase, pattern, PER_TABLE),
    fetchPendingSuggestionsByPattern(supabase, pattern, PER_TABLE),
  ]);

  const lines: string[] = [
    "## Deterministic workspace retrieval",
    "",
    "Independent full-scan on the user’s exact query (fixed ILIKE on known columns). Use this as a baseline for reconciliation.",
    "",
  ];

  lines.push(`### Contacts (${contacts.length})`);
  if (contacts.length === 0) {
    lines.push("_None matched._");
  } else {
    for (const c of contacts) {
      const bits = [
        `id=${c.id}`,
        `name=${c.name}`,
        c.role ? `role=${c.role}` : null,
        c.geography ? `geography=${c.geography}` : null,
        c.organisation_id ? `organisation_id=${c.organisation_id}` : null,
        c.notes ? `notes=${String(c.notes).slice(0, 280)}` : null,
      ].filter(Boolean);
      lines.push(`- ${bits.join(" | ")}`);
    }
  }
  lines.push("");

  lines.push(`### Organisations (${orgs.length})`);
  if (orgs.length === 0) {
    lines.push("_None matched._");
  } else {
    for (const o of orgs) {
      const bits = [
        `id=${o.id}`,
        `name=${o.name}`,
        o.type ? `type=${o.type}` : null,
        o.description
          ? `description=${String(o.description).slice(0, 280)}`
          : null,
      ].filter(Boolean);
      lines.push(`- ${bits.join(" | ")}`);
    }
  }
  lines.push("");

  lines.push(`### Deals (${deals.length})`);
  if (deals.length === 0) {
    lines.push("_None matched._");
  } else {
    for (const d of deals) {
      const bits = [
        `id=${d.id}`,
        `title=${d.title}`,
        d.status ? `status=${d.status}` : null,
        d.sector ? `sector=${d.sector}` : null,
        d.structure ? `structure=${d.structure}` : null,
        d.size != null ? `size=${d.size}` : null,
        d.notes ? `notes=${String(d.notes).slice(0, 280)}` : null,
      ].filter(Boolean);
      lines.push(`- ${bits.join(" | ")}`);
    }
  }
  lines.push("");

  lines.push(`### Pending suggestions (${suggestions.length})`);
  if (suggestions.length === 0) {
    lines.push("_None matched._");
  } else {
    for (const s of suggestions) {
      const bits = [
        `id=${s.id}`,
        s.title ? `title=${s.title}` : null,
        s.body ? `body=${String(s.body).slice(0, 280)}` : null,
      ].filter(Boolean);
      lines.push(`- ${bits.join(" | ")}`);
    }
  }

  return lines.join("\n");
}
