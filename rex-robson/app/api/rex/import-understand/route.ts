import {
  buildImportUnderstandSystemPrompt,
  buildImportUnderstandUserContent,
} from "@/lib/prompts/import-understand";
import { completeAnthropicMessage } from "@/lib/rex/anthropic-messages";

export const runtime = "nodejs";

type Body = {
  filename?: string;
  sampleText?: string;
};

type UnderstandJson = {
  understanding: string;
  content_kind?: string;
  subtitle?: string;
};

function extractJsonObject(raw: string): UnderstandJson | null {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    const understanding =
      typeof o.understanding === "string" ? o.understanding.trim() : "";
    if (!understanding) return null;
    return {
      understanding,
      content_kind:
        typeof o.content_kind === "string" ? o.content_kind : undefined,
      subtitle: typeof o.subtitle === "string" ? o.subtitle.trim() : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * LLM pass after upload: short Rex-voice summary of what the file appears to be.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const filename =
    typeof body.filename === "string" ? body.filename.trim() : "";
  const sampleText =
    typeof body.sampleText === "string" ? body.sampleText : "";

  if (!filename) {
    return Response.json({ error: "filename is required" }, { status: 400 });
  }
  if (!sampleText.trim()) {
    return Response.json({ error: "sampleText is required" }, { status: 400 });
  }
  if (sampleText.length > 200_000) {
    return Response.json({ error: "sampleText is too large" }, { status: 400 });
  }

  try {
    const system = buildImportUnderstandSystemPrompt();
    const userContent = buildImportUnderstandUserContent({
      filename,
      sampleText,
    });

    const raw = await completeAnthropicMessage({
      system,
      messages: [{ role: "user", content: userContent }],
      maxTokens: 512,
    });

    const parsed = extractJsonObject(raw);
    if (!parsed) {
      return Response.json(
        {
          error: "Could not parse model response",
          raw: raw.slice(0, 500),
        },
        { status: 502 },
      );
    }

    return Response.json(parsed);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import understand failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
