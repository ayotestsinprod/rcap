import { buildWorkspaceRetrievalContext } from "@/lib/data/workspace-retrieval";
import { createSearchSupabaseClient } from "@/lib/data/search-supabase";
import {
  buildSearchReconciliationSystemPrompt,
  buildSearchReconciliationUserContent,
} from "@/lib/prompts";
import { completeAnthropicMessage } from "@/lib/rex/anthropic-messages";
import { runWorkspaceSearchAgent } from "@/lib/rex/anthropic-workspace-agent";

export const runtime = "nodejs";

type Body = {
  query?: string;
  /**
   * When true, skip Anthropic and return only the deterministic retrieval block (for debugging).
   */
  deterministicOnly?: boolean;
  /**
   * When false, return the tool-assisted draft only (no reconciliation pass).
   */
  reconcile?: boolean;
  /**
   * Include deterministic baseline and draft in JSON (for debugging).
   */
  debug?: boolean;
};

/**
 * Search pipeline:
 * 1) In parallel: deterministic full-scan on the user query + Anthropic tool-calling agent (same DB primitives).
 * 2) Reconciliation: LLM aligns the draft with the deterministic baseline and returns one Rex reply.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    return Response.json({ error: "query is required" }, { status: 400 });
  }

  try {
    const supabase = await createSearchSupabaseClient();

    const baselinePromise = buildWorkspaceRetrievalContext(supabase, query);
    const agentPromise = runWorkspaceSearchAgent({
      supabase,
      userQuery: query,
    });

    const [baseline, draft] = await Promise.all([
      baselinePromise,
      agentPromise,
    ]);

    if (body.deterministicOnly === true) {
      return Response.json({
        text: baseline,
        deterministicOnly: true,
      });
    }

    const shouldReconcile = body.reconcile !== false;

    if (!shouldReconcile) {
      return Response.json({
        text: draft,
        ...(body.debug ? { baseline, draft } : {}),
      });
    }

    const system = buildSearchReconciliationSystemPrompt();
    const userContent = buildSearchReconciliationUserContent(
      query,
      baseline,
      draft,
    );

    const text = await completeAnthropicMessage({
      system,
      messages: [{ role: "user", content: userContent }],
      maxTokens: 2048,
    });

    return Response.json({
      text,
      ...(body.debug ? { baseline, draft } : {}),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Search failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
