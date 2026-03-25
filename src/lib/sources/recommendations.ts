interface RegistryEntry {
  url: string;
  type: string;
  name: string;
  description: string;
  tools: string[];
  categories: string[];
}

interface ScoredRecommendation extends RegistryEntry {
  score: number;
}

export function scoreRecommendations(
  registry: RegistryEntry[],
  existingSourceUrls: string[],
  trackedTools: string[],
  trackedCategories: string[],
  topN: number = 5
): ScoredRecommendation[] {
  const existingSet = new Set(existingSourceUrls);

  const scored = registry
    .filter((entry) => !existingSet.has(entry.url))
    .map((entry) => {
      const toolOverlap = entry.tools.filter((t) =>
        trackedTools.includes(t)
      ).length;
      const categoryOverlap = entry.categories.filter((c) =>
        trackedCategories.includes(c)
      ).length;
      const score = toolOverlap * 2 + categoryOverlap;
      return { ...entry, score };
    });

  return scored
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
