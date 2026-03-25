import Anthropic from "@anthropic-ai/sdk";
import { getSetting } from "@/lib/settings";

let client: Anthropic | null = null;

export async function getAnthropicClient(): Promise<Anthropic> {
  if (!client) {
    const key = await getSetting("anthropic_api_key") ?? process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("No Anthropic API key configured");
    client = new Anthropic({ apiKey: key });
  }
  return client;
}
