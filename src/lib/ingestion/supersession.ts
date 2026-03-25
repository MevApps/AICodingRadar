import { chatWithFallback } from "@/lib/ai/providers";
import { SUPERSESSION_PROMPT } from "@/lib/ai/prompts";
import { parseJsonResponse } from "@/lib/utils/parse-json";
import type { RunTracker } from "./tracker";

interface SupersessionResult {
  supersedes: boolean;
  reason: string;
}

export async function checkSupersession(
  newEntry: { title: string; body: string },
  existingEntry: { title: string; body: string },
  tracker?: RunTracker
): Promise<SupersessionResult> {
  const result = await chatWithFallback(
    {
      system: SUPERSESSION_PROMPT,
      message: `NEW ENTRY:\nTitle: ${newEntry.title}\nBody: ${newEntry.body}\n\nEXISTING ENTRY:\nTitle: ${existingEntry.title}\nBody: ${existingEntry.body}`,
      maxTokens: 512,
    },
    tracker
      ? (usage, provider) => tracker.recordUsage(usage, provider)
      : undefined
  );

  return parseJsonResponse(result.text);
}

// Keep findSupersessionCandidates EXACTLY as-is — it's a pure function, no AI call
export function findSupersessionCandidates(
  newEntry: { tools: string[]; categories: string[] },
  existingEntries: { id: string; tools: string[]; categories: string[] }[],
  topK: number = 10
): { id: string; tools: string[]; categories: string[] }[] {
  const scored = existingEntries.map((entry) => {
    const toolOverlap = entry.tools.filter((t) =>
      newEntry.tools.includes(t)
    ).length;
    const categoryOverlap = entry.categories.filter((c) =>
      newEntry.categories.includes(c)
    ).length;
    const score = toolOverlap * 2 + categoryOverlap;
    return { ...entry, score };
  });

  return scored
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
