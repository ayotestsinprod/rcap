export function getAnthropicApiKey(): string {
  const key =
    process.env.ANTHROPIC_API_KEY ??
    process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY ??
    "";
  if (!key) {
    throw new Error(
      "Missing ANTHROPIC_API_KEY (or NEXT_PUBLIC_ANTHROPIC_API_KEY for local dev only).",
    );
  }
  return key;
}

export function getAnthropicModel(): string {
  return process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022";
}
