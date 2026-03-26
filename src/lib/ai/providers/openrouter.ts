import OpenAI from "openai";
import type { AIProvider, ChatParams, ChatResult } from "./types";

const DEFAULT_FREE_MODEL = "meta-llama/llama-3.1-8b-instruct:free";

export class OpenRouterProvider implements AIProvider {
  name = "openrouter";
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = DEFAULT_FREE_MODEL) {
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://ai-coding-radar.vercel.app",
        "X-Title": "AI Coding Radar",
      },
    });
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

  async embed(_texts: string[]): Promise<number[][]> {
    throw new Error("OpenRouter does not support embeddings. Use OpenAI or Gemini.");
  }

  async embedSingle(_text: string): Promise<number[]> {
    throw new Error("OpenRouter does not support embeddings. Use OpenAI or Gemini.");
  }

  async validateKey(): Promise<boolean> {
    try {
      // OpenRouter has a dedicated auth check endpoint
      const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: { Authorization: `Bearer ${this.client.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Free models = $0
  getInputPrice(): number { return 0; }
  getOutputPrice(): number { return 0; }
}
