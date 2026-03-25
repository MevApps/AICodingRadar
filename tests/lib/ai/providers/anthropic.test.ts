import { describe, it, expect, vi } from "vitest";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic";

vi.mock("@anthropic-ai/sdk", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "Hello" }],
    usage: { input_tokens: 10, output_tokens: 5 },
  });
  class MockAnthropic {
    messages = { create: mockCreate };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_opts: unknown) {}
  }
  return { default: MockAnthropic };
});

describe("AnthropicProvider", () => {
  it("returns chat result with token counts", async () => {
    const provider = new AnthropicProvider("test-key", "claude-sonnet-4-6");
    const result = await provider.chat({
      system: "You are helpful",
      message: "Hi",
      maxTokens: 100,
    });
    expect(result.text).toBe("Hello");
    expect(result.inputTokens).toBe(10);
    expect(result.outputTokens).toBe(5);
  });

  it("has correct pricing", () => {
    const provider = new AnthropicProvider("test-key", "claude-sonnet-4-6");
    expect(provider.getInputPrice()).toBeCloseTo(3.0 / 1_000_000);
    expect(provider.getOutputPrice()).toBeCloseTo(15.0 / 1_000_000);
  });
});
