import { buildWorkspaceRetrievalContext } from "@/lib/data/workspace-retrieval";
import { createSearchSupabaseClient } from "@/lib/data/search-supabase";
import {
  buildSearchReconciliationSystemPrompt,
  buildSearchReconciliationUserContent,
} from "@/lib/prompts";
import type { AnthropicContentBlock } from "@/lib/prompts/types";
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

type AttachedDoc = { title: string; base64: string };

const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

async function parseRequest(req: Request): Promise<{
  query: string;
  attachments: AttachedDoc[];
  body: Body;
} | { error: string }> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const query = typeof form.get("query") === "string"
      ? (form.get("query") as string).trim()
      : "";
    const entries = form.getAll("documents");
    const attachments: AttachedDoc[] = [];
    for (const entry of entries) {
      if (attachments.length >= MAX_ATTACHMENTS) break;
      if (!(entry instanceof File)) continue;
      const isPdf =
        entry.type === "application/pdf" ||
        entry.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) continue;
      if (entry.size === 0 || entry.size > MAX_ATTACHMENT_BYTES) continue;
      const buf = Buffer.from(await entry.arrayBuffer());
      attachments.push({
        title: entry.name,
        base64: buf.toString("base64"),
      });
    }
    return { query, attachments, body: {} };
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return { error: "Invalid JSON body" };
  }
  const query = typeof body.query === "string" ? body.query.trim() : "";
  return { query, attachments: [], body };
}

/**
 * Search pipeline:
 * 1) In parallel: deterministic full-scan on the user query + Anthropic tool-calling agent (same DB primitives).
 * 2) Reconciliation: LLM aligns the draft with the deterministic baseline and returns one Rex reply.
 *
 * When PDF attachments are present, they are included as `document` blocks in the reconciliation
 * call so Rex can reference them alongside the workspace baseline.
 */
export async function POST(req: Request) {
  const parsed = await parseRequest(req);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const { query, attachments, body } = parsed;
  if (!query && attachments.length === 0) {
    return Response.json(
      { error: "query or a document is required" },
      { status: 400 },
    );
  }

  try {
    const supabase = await createSearchSupabaseClient();

    const effectiveQuery =
      query ||
      (attachments.length > 0
        ? `Review the attached ${attachments.length === 1 ? "document" : "documents"} and summarise what matters for my workspace.`
        : "");

    const baselinePromise = buildWorkspaceRetrievalContext(
      supabase,
      effectiveQuery,
    );
    const agentPromise = runWorkspaceSearchAgent({
      supabase,
      userQuery: effectiveQuery,
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
    const userText = buildSearchReconciliationUserContent(
      effectiveQuery,
      baseline,
      draft,
    );

    const userContent: AnthropicContentBlock[] | string =
      attachments.length > 0
        ? [
            ...attachments.map(
              (doc): AnthropicContentBlock => ({
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: doc.base64,
                },
                title: doc.title,
              }),
            ),
            { type: "text", text: userText },
          ]
        : userText;

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
