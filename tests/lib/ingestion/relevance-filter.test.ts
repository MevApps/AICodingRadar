import { describe, it, expect, vi } from "vitest";
import { filterRelevance } from "@/lib/ingestion/relevance-filter";

vi.mock("@/lib/ai/client", () => ({
  getAnthropicClient: () => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: '{"score": 0.9, "reason": "Directly about AI coding tools"}' }],
      }),
    },
  }),
}));

describe("filterRelevance", () => {
  it("returns score and reason from AI", async () => {
    const result = await filterRelevance({
      title: "Claude Code adds background agents",
      content: "New feature allows running agents in the background",
    });

    expect(result.score).toBe(0.9);
    expect(result.reason).toBeDefined();
  });

  it("filters items below threshold", async () => {
    const result = await filterRelevance({
      title: "Claude Code adds background agents",
      content: "New feature",
    });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });
});
