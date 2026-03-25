import { chatWithFallback } from "@/lib/ai/providers";
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
  const result = await chatWithFallback(
    {
      system: STRUCTURER_PROMPT,
      message: `Title: ${item.title}\n\nContent: ${item.content}`,
      maxTokens: 2048,
    },
    tracker
      ? (usage, provider) => tracker.recordUsage(usage, provider)
      : undefined
  );

  return JSON.parse(result.text);
}
