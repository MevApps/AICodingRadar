import { describe, it, expect, vi } from "vitest";
import { checkSupersession, findSupersessionCandidates } from "@/lib/ingestion/supersession";

vi.mock("@/lib/ai/providers", () => ({
  chatWithFallback: vi.fn().mockResolvedValue({
    text: '{"supersedes": true, "reason": "New entry provides updated information"}',
    inputTokens: 10,
    outputTokens: 5,
  }),
}));

describe("checkSupersession", () => {
  it("detects supersession between two entries", async () => {
    const result = await checkSupersession(
      { title: "Tool X now supports Y", body: "Latest update adds Y support" },
      { title: "Tool X lacks Y support", body: "Currently Tool X doesn't support Y" }
    );

    expect(result.supersedes).toBe(true);
    expect(result.reason).toBeDefined();
  });
});

describe("findSupersessionCandidates", () => {
  it("filters candidates by matching tools", () => {
    const newEntry = { tools: ["Claude Code"], categories: ["Testing"] };
    const existingEntries = [
      { id: "1", tools: ["Claude Code"], categories: ["Testing"] },
      { id: "2", tools: ["Cursor"], categories: ["Code Review"] },
      { id: "3", tools: ["Claude Code"], categories: ["DevOps"] },
    ];

    const candidates = findSupersessionCandidates(newEntry, existingEntries);

    expect(candidates.some((c) => c.id === "1")).toBe(true);
    expect(candidates.some((c) => c.id === "3")).toBe(true);
  });
});
