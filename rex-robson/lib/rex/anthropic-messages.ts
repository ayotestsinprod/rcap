import type { AnthropicTextMessage } from "@/lib/prompts/types";
import { getAnthropicApiKey, getAnthropicModel } from "./anthropic-config";

type MessagesResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
};

/**
 * Single-turn completion via Anthropic Messages API (server-only).
 */
export async function completeAnthropicMessage(params: {
  system: string;
  messages: AnthropicTextMessage[];
  maxTokens?: number;
}): Promise<string> {
  const apiKey = getAnthropicApiKey();
  const model = getAnthropicModel();
  const max_tokens = params.maxTokens ?? 2048;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens,
      system: params.system,
      messages: params.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  const data = (await res.json()) as MessagesResponse;

  if (!res.ok) {
    const msg = data.error?.message ?? res.statusText;
    throw new Error(msg || "Anthropic request failed");
  }

  const text = data.content
    ?.filter((b): b is { type: "text"; text: string } => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Empty response from Anthropic");
  }

  return text;
}
