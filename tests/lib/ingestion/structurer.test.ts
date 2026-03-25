import { describe, it, expect, vi } from "vitest";
import { structureEntry } from "@/lib/ingestion/structurer";

vi.mock("@/lib/ai/providers", () => ({
  chatWithFallback: vi.fn().mockResolvedValue({
    text: JSON.stringify({
      type: "tip",
      title: "Claude Code Background Agents",
      summary: "Claude Code now supports background agents for running tasks.",
      body: "Full guide on using background agents...",
      tools: ["Claude Code"],
      categories: ["Code Generation"],
    }),
    inputTokens: 10,
    outputTokens: 50,
  }),
}));

describe("structureEntry", () => {
  it("returns structured entry from AI", async () => {
    const result = await structureEntry({
      title: "Claude Code adds background agents",
      content: "New feature allows background task execution",
    });

    expect(result.type).toBe("tip");
    expect(result.title).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.body).toBeDefined();
    expect(result.tools).toContain("Claude Code");
    expect(result.categories.length).toBeGreaterThan(0);
  });
});
