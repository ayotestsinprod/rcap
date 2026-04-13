import { joinPromptSections } from "./compose";
import { REX_PERSONA_CORE } from "./persona";

const RECONCILE_TASK = `
You are reconciling two sources about the same user search:

1) **Deterministic baseline** — a full independent scan of the workspace using the user’s exact query (ILIKE on known columns). Treat this as authoritative for what exists under that literal query.

2) **Draft answer** — produced by an assistant that explored the DB via tools (possibly different search terms).

Your job:
- Produce one final reply in Rex's voice for the user.
- Align facts with the baseline: if the baseline lists records the draft omitted and they matter for the question, include them.
- If the draft mentions specific entities or counts not supported by the baseline or plausible tool exploration, remove or soften those claims (do not invent records).
- If baseline and draft agree, you may keep the draft wording; tighten if needed.

Output only the final user-facing message — no headings, no meta commentary.
`.trim();

export function buildSearchReconciliationSystemPrompt(): string {
  return joinPromptSections(REX_PERSONA_CORE, RECONCILE_TASK);
}

export function buildSearchReconciliationUserContent(
  userQuery: string,
  baselineMarkdown: string,
  draftAnswer: string,
): string {
  return `## User query
"""
${userQuery.trim()}
"""

## Deterministic baseline (full scan on user query)
${baselineMarkdown}

## Draft answer (tool-assisted)
${draftAnswer.trim()}

Write the reconciled final answer.`;
}
