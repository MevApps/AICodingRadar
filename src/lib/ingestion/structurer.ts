import { getAnthropicClient } from "@/lib/ai/client";
import { STRUCTURER_PROMPT } from "@/lib/ai/prompts";
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
  return JSON.parse(text);
}
