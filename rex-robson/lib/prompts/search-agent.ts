import { joinPromptSections } from "./compose";
import { REX_PERSONA_CORE } from "./persona";
import { buildSurfacesSystemAddendum } from "./surfaces";

const SEARCH_TOOLS_TASK = `
The user is searching their workspace. You have tools to query contacts, organisations, open deals, and pending suggestions. Each tool runs a safe substring search (ILIKE) on fixed columns — you choose the search_term and may call tools multiple times with different terms or tables.

Do not invent rows: only state what appears in tool JSON results. If results are empty, say so in Rex's voice and suggest sharper keywords or another angle.

When you have enough signal from tools, answer the user concisely. Prefer calling tools first rather than guessing.
`.trim();

export function buildSearchToolsSystemPrompt(
  options: { includeSurfaces?: boolean } = {},
): string {
  const { includeSurfaces = true } = options;
  return joinPromptSections(
    REX_PERSONA_CORE,
    SEARCH_TOOLS_TASK,
    includeSurfaces ? buildSurfacesSystemAddendum() : false,
  );
}
