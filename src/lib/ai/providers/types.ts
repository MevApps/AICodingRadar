export interface ChatParams {
  system: string;
  message: string;
  maxTokens: number;
}

export interface ChatResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AIProvider {
  name: string;
  chat(params: ChatParams): Promise<ChatResult>;
  embed(texts: string[]): Promise<number[][]>;
  embedSingle(text: string): Promise<number[]>;
  validateKey(): Promise<boolean>;
  getInputPrice(): number;
  getOutputPrice(): number;
}

export const PRICING = {
  anthropic: { input: 3.0 / 1_000_000, output: 15.0 / 1_000_000 },
  openai: { input: 2.5 / 1_000_000, output: 10.0 / 1_000_000 },
  gemini: { input: 0.075 / 1_000_000, output: 0.3 / 1_000_000 },
} as const;
