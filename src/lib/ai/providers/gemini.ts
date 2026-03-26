import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider, ChatParams, ChatResult } from "./types";
import { PRICING } from "./types";

// Rate limiter for Gemini free tier (5 requests/min for generateContent)
const GEMINI_MIN_DELAY_MS = 13_000; // ~4.6 req/min, safely under 5/min limit
let lastGeminiCall = 0;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastGeminiCall;
  if (elapsed < GEMINI_MIN_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, GEMINI_MIN_DELAY_MS - elapsed));
  }
  lastGeminiCall = Date.now();
}

export class GeminiProvider implements AIProvider {
  name = "gemini";
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string = "gemini-2.0-flash") {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async chat(params: ChatParams): Promise<ChatResult> {
    await waitForRateLimit();
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: params.system,
    });
    const result = await model.generateContent(params.message);
    const response = result.response;
    const text = response.text();
    const usage = response.usageMetadata;
    return {
      text,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
    };
  }

  async embed(texts: string[]): Promise<number[][]> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const results: number[][] = [];
    for (const text of texts) {
      const result = await model.embedContent(text);
      const embedding = result.embedding.values;
      // gemini-embedding-001 produces 3072 dims; truncate to 1024 for pgvector column
      const truncated = embedding.slice(0, 1024);
      const padded = new Array(1024).fill(0);
      for (let i = 0; i < truncated.length; i++) {
        padded[i] = truncated[i];
      }
      results.push(padded);
    }
    return results;
  }

  async embedSingle(text: string): Promise<number[]> {
    const results = await this.embed([text]);
    return results[0];
  }

  async validateKey(): Promise<boolean> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      await model.generateContent("hi");
      return true;
    } catch (error: any) {
      // 429 = quota exceeded, but the key itself is valid
      if (error?.status === 429) return true;
      return false;
    }
  }

  getInputPrice(): number { return PRICING.gemini.input; }
  getOutputPrice(): number { return PRICING.gemini.output; }
}
