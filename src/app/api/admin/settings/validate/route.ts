import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic";
import { OpenAIProvider } from "@/lib/ai/providers/openai";
import { GeminiProvider } from "@/lib/ai/providers/gemini";

export async function POST(request: NextRequest) {
  const { provider: providerName } = await request.json();

  const key = await getSetting(`${providerName}_api_key`);
  if (!key) {
    return NextResponse.json({ valid: false, error: "No API key configured" });
  }

  const model = await getSetting(`${providerName}_model`);

  try {
    let provider;
    switch (providerName) {
      case "anthropic":
        provider = new AnthropicProvider(key, model ?? undefined);
        break;
      case "openai":
        provider = new OpenAIProvider(key, model ?? undefined);
        break;
      case "gemini":
        provider = new GeminiProvider(key, model ?? undefined);
        break;
      default:
        return NextResponse.json({ valid: false, error: "Unknown provider" });
    }

    const valid = await provider.validateKey();
    return NextResponse.json({ valid });
  } catch (error) {
    return NextResponse.json({ valid: false, error: (error as Error).message });
  }
}
