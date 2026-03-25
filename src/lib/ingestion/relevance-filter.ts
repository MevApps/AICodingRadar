import { getAnthropicClient } from "@/lib/ai/client";
import { RELEVANCE_FILTER_PROMPT } from "@/lib/ai/prompts";

interface RelevanceResult {
  score: number;
  reason: string;
}

export async function filterRelevance(item: {
  title: string;
  content: string;
}): Promise<RelevanceResult> {
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

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = JSON.parse(text);

  return {
    score: parsed.score,
    reason: parsed.reason,
  };
}
