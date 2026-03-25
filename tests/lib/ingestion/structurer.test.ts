import { describe, it, expect, vi } from "vitest";
import { structureEntry } from "@/lib/ingestion/structurer";

vi.mock("@/lib/ai/client", () => ({
  getAnthropicClient: () => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{
          type: "text",
          text: JSON.stringify({
            type: "tip",
            title: "Claude Code Background Agents",
            summary: "Claude Code now supports background agents for running tasks.",
            body: "Full guide on using background agents...",
            tools: ["Claude Code"],
            categories: ["Code Generation"],
          }),
        }],
      }),
    },
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
