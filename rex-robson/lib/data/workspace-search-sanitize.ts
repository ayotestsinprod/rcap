/** Strip ILIKE wildcards and cap length so user input cannot broaden the pattern. */
export function sanitizeWorkspaceListSearch(
  raw: string | null | undefined,
): string | null {
  const t = (raw ?? "")
    .trim()
    .replace(/%/g, "")
    .replace(/_/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 200);
  return t === "" ? null : t;
}
