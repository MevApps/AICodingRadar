import { getSetting } from "@/lib/settings";
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { GeminiProvider } from "./gemini";
import { OpenRouterProvider } from "./openrouter";
import type { AIProvider, ChatParams, ChatResult } from "./types";

export type { AIProvider, ChatParams, ChatResult } from "./types";

function createProvider(name: string, apiKey: string, model?: string): AIProvider {
  switch (name) {
    case "anthropic": return new AnthropicProvider(apiKey, model ?? "claude-sonnet-4-6");
    case "openai": return new OpenAIProvider(apiKey, model ?? "gpt-4o");
    case "gemini": return new GeminiProvider(apiKey, model ?? "gemini-2.0-flash");
    case "openrouter": return new OpenRouterProvider(apiKey, model ?? "meta-llama/llama-3.1-8b-instruct:free");
    default: throw new Error(`Unknown provider: ${name}`);
  }
}

export async function getProvider(): Promise<AIProvider> {
  const priorityJson = await getSetting("provider_priority");
  const ordered = priorityJson ? JSON.parse(priorityJson) : ["anthropic", "openai", "gemini", "openrouter"];

  for (const name of ordered) {
    const key = await getSetting(`${name}_api_key`);
    if (key) {
      const model = await getSetting(`${name}_model`);
      return createProvider(name, key, model ?? undefined);
    }
  }

  if (process.env.ANTHROPIC_API_KEY) return createProvider("anthropic", process.env.ANTHROPIC_API_KEY);
  if (process.env.OPENAI_API_KEY) return createProvider("openai", process.env.OPENAI_API_KEY);

  throw new Error("No AI provider configured. Add an API key in Settings.");
}

export async function getEmbeddingProvider(): Promise<AIProvider> {
  const embeddingProviderName = await getSetting("embedding_provider");

  if (embeddingProviderName) {
    const key = await getSetting(`${embeddingProviderName}_api_key`);
    if (key) {
      const model = await getSetting(`${embeddingProviderName}_model`);
      return createProvider(embeddingProviderName, key, model ?? undefined);
    }
  }

  for (const name of ["openai", "gemini"]) {
    const key = await getSetting(`${name}_api_key`);
    if (key) return createProvider(name, key);
  }

  // Anthropic + Voyage fallback
  const anthropicKey = await getSetting("anthropic_api_key") ?? process.env.ANTHROPIC_API_KEY;
  if (anthropicKey && process.env.VOYAGE_API_KEY) {
    return createProvider("anthropic", anthropicKey);
  }

  throw new Error("No embedding provider configured. Add an OpenAI or Gemini key in Settings.");
}

export async function chatWithFallback(
  params: ChatParams,
  onUsage?: (usage: { inputTokens: number; outputTokens: number }, provider: AIProvider) => void
): Promise<ChatResult> {
  const priorityJson = await getSetting("provider_priority");
  const ordered = priorityJson ? JSON.parse(priorityJson) : ["anthropic", "openai", "gemini", "openrouter"];

  const errors: string[] = [];

  for (const name of ordered) {
    const key = await getSetting(`${name}_api_key`);
    if (!key) continue;

    try {
      const model = await getSetting(`${name}_model`);
      const provider = createProvider(name, key, model ?? undefined);
      const result = await provider.chat(params);
      if (onUsage) onUsage({ inputTokens: result.inputTokens, outputTokens: result.outputTokens }, provider);
      return result;
    } catch (error) {
      errors.push(`${name}: ${(error as Error).message}`);
    }
  }

  // Env var fallback
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const provider = createProvider("anthropic", process.env.ANTHROPIC_API_KEY);
      const result = await provider.chat(params);
      if (onUsage) onUsage({ inputTokens: result.inputTokens, outputTokens: result.outputTokens }, provider);
      return result;
    } catch (error) {
      errors.push(`anthropic (env): ${(error as Error).message}`);
    }
  }

  throw new Error(`All providers failed: ${errors.join("; ")}`);
}
