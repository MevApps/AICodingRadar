import { chatWithFallback } from "@/lib/ai/providers";
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
  const result = await chatWithFallback(
    {
      system: RELEVANCE_FILTER_PROMPT,
      message: `Title: ${item.title}\n\nContent: ${item.content}`,
      maxTokens: 256,
    },
    tracker
      ? (usage, provider) => tracker.recordUsage(usage, provider)
      : undefined
  );

  const parsed = JSON.parse(result.text);
  return { score: parsed.score, reason: parsed.reason };
}
