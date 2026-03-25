import OpenAI from "openai";
import type { AIProvider, ChatParams, ChatResult } from "./types";
import { PRICING } from "./types";

export class OpenAIProvider implements AIProvider {
  name = "openai";
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = "gpt-4o") {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async chat(params: ChatParams): Promise<ChatResult> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: params.maxTokens,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.message },
      ],
    });
    return {
      text: response.choices[0]?.message?.content ?? "",
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    };
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
      dimensions: 1024,
    });
    return response.data.map((d) => d.embedding);
  }

  async embedSingle(text: string): Promise<number[]> {
    const results = await this.embed([text]);
    return results[0];
  }

  async validateKey(): Promise<boolean> {
    try { await this.client.models.list(); return true; }
    catch { return false; }
  }

  getInputPrice(): number { return PRICING.openai.input; }
  getOutputPrice(): number { return PRICING.openai.output; }
}
