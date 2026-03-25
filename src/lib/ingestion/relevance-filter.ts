import { getAnthropicClient } from "@/lib/ai/client";
import { RELEVANCE_FILTER_PROMPT } from "@/lib/ai/prompts";
import type { RunTracker } from "./tracker";

interface RelevanceResult {
  score: number;
  reason: string;
}

export async function filterRelevance(
  item: { title: string; content: string },
  tracker?: RunTracker
): Promise<RelevanceResult> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    system: RELEVANCE_FILTER_PROMPT,
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
  const parsed = JSON.parse(text);

  return {
    score: parsed.score,
    reason: parsed.reason,
  };
}
