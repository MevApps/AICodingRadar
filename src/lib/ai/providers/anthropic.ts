import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, ChatParams, ChatResult } from "./types";
import { PRICING } from "./types";

export class AnthropicProvider implements AIProvider {
  name = "anthropic";
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = "claude-sonnet-4-6") {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async chat(params: ChatParams): Promise<ChatResult> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: params.maxTokens,
      system: params.system,
      messages: [{ role: "user", content: params.message }],
    });
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return {
      text,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    };
  }

  async embed(texts: string[]): Promise<number[][]> {
    const voyageKey = process.env.VOYAGE_API_KEY;
    if (!voyageKey) {
      throw new Error("Anthropic embeddings require VOYAGE_API_KEY env var or use OpenAI/Gemini for embeddings.");
    }
    const response = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${voyageKey}`,
      },
      body: JSON.stringify({ input: texts, model: "voyage-3-lite" }),
    });
    if (!response.ok) throw new Error(`Voyage AI error: ${response.status}`);
    const data = await response.json();
    return data.data.map((d: { embedding: number[] }) => d.embedding);
  }

  async embedSingle(text: string): Promise<number[]> {
    const results = await this.embed([text]);
    return results[0];
  }

  async validateKey(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: this.model,
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      });
      return true;
    } catch { return false; }
  }

  getInputPrice(): number { return PRICING.anthropic.input; }
  getOutputPrice(): number { return PRICING.anthropic.output; }
}
