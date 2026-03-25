import { getAnthropicClient } from "@/lib/ai/client";
import { SUPERSESSION_PROMPT } from "@/lib/ai/prompts";

interface SupersessionResult {
  supersedes: boolean;
  reason: string;
}

export async function checkSupersession(
  newEntry: { title: string; body: string },
  existingEntry: { title: string; body: string }
): Promise<SupersessionResult> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: SUPERSESSION_PROMPT,
    messages: [
      {
        role: "user",
        content: `NEW ENTRY:\nTitle: ${newEntry.title}\nBody: ${newEntry.body}\n\nEXISTING ENTRY:\nTitle: ${existingEntry.title}\nBody: ${existingEntry.body}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return JSON.parse(text);
}

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
