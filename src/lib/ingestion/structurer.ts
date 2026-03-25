import { getAnthropicClient } from "@/lib/ai/client";
import { STRUCTURER_PROMPT } from "@/lib/ai/prompts";
import { extractJson } from "@/lib/utils/json";
import { ENTRY_TYPES, CATEGORIES } from "@/types";
import type { EntryType } from "@/types";
import type { RunTracker } from "./tracker";

interface StructuredEntry {
  type: EntryType;
  title: string;
  summary: string;
  body: string;
  tools: string[];
  categories: string[];
}

const VALID_TYPES = new Set<string>(ENTRY_TYPES);
const VALID_CATEGORIES = new Set<string>(CATEGORIES);

export async function structureEntry(
  item: { title: string; content: string },
  tracker?: RunTracker
): Promise<StructuredEntry> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: STRUCTURER_PROMPT,
    messages: [
      {
        role: "user",
        content: `Title: ${item.title}\n\nContent: ${item.content}`,
      },
    ],
  });

  if (tracker && response.usage) {
    tracker.recordUsage({
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });
  }

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = extractJson(text);

  // Validate and coerce fields
  const type = VALID_TYPES.has(String(parsed.type)) ? String(parsed.type) as EntryType : "tip";
  const tools = Array.isArray(parsed.tools) ? parsed.tools.map(String) : [];
  const categories = Array.isArray(parsed.categories)
    ? parsed.categories.map(String).filter((c) => VALID_CATEGORIES.has(c))
    : [];

  return {
    type,
    title: String(parsed.title ?? item.title),
    summary: String(parsed.summary ?? ""),
    body: String(parsed.body ?? ""),
    tools,
    categories,
  };
}
