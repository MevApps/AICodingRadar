import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider, ChatParams, ChatResult } from "./types";
import { PRICING } from "./types";

export class GeminiProvider implements AIProvider {
  name = "gemini";
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string = "gemini-2.0-flash") {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async chat(params: ChatParams): Promise<ChatResult> {
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
    const model = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
    const results: number[][] = [];
    for (const text of texts) {
      const result = await model.embedContent(text);
      const embedding = result.embedding.values;
      const padded = new Array(1024).fill(0);
      for (let i = 0; i < Math.min(embedding.length, 1024); i++) {
        padded[i] = embedding[i];
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
    } catch { return false; }
  }

  getInputPrice(): number { return PRICING.gemini.input; }
  getOutputPrice(): number { return PRICING.gemini.output; }
}
