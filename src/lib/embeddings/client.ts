import { getEmbeddingProvider } from "@/lib/ai/providers";

export async function generateEmbedding(text: string): Promise<number[]> {
  const provider = await getEmbeddingProvider();
  return provider.embedSingle(text);
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const provider = await getEmbeddingProvider();
  return provider.embed(texts);
}
