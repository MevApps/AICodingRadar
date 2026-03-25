export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

export function isDuplicate(
  embedding: number[],
  existingEntries: { id: string; embedding: number[] }[],
  threshold: number = 0.95
): boolean {
  for (const entry of existingEntries) {
    if (cosineSimilarity(embedding, entry.embedding) >= threshold) {
      return true;
    }
  }
  return false;
}
