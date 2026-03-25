import { describe, it, expect } from "vitest";
import { scoreRecommendations } from "@/lib/sources/recommendations";

const registry = [
  {
    url: "https://example.com/claude-blog",
    type: "rss" as const,
    name: "Claude Blog",
    description: "Official Claude updates",
    tools: ["Claude Code"],
    categories: ["Code Generation"],
  },
  {
    url: "https://example.com/cursor-blog",
    type: "rss" as const,
    name: "Cursor Blog",
    description: "Cursor news",
    tools: ["Cursor"],
    categories: ["Code Generation"],
  },
  {
    url: "https://example.com/random-blog",
    type: "rss" as const,
    name: "Random Blog",
    description: "Unrelated",
    tools: ["SomeTool"],
    categories: ["Architecture"],
  },
];

describe("scoreRecommendations", () => {
  it("excludes already-added sources by URL", () => {
    const results = scoreRecommendations(
      registry,
      ["https://example.com/claude-blog"],
      ["Claude Code", "Cursor"],
      ["Code Generation"]
    );
    expect(results.find((r) => r.url === "https://example.com/claude-blog")).toBeUndefined();
    expect(results.find((r) => r.url === "https://example.com/cursor-blog")).toBeDefined();
  });

  it("scores higher for tool overlap", () => {
    const results = scoreRecommendations(
      registry,
      [],
      ["Claude Code"],
      ["Code Generation", "Architecture"]
    );
    const claudeScore = results.find((r) => r.name === "Claude Blog")!.score;
    const randomScore = results.find((r) => r.name === "Random Blog")?.score ?? 0;
    expect(claudeScore).toBeGreaterThan(randomScore);
  });

  it("returns top N results sorted by score", () => {
    const results = scoreRecommendations(
      registry,
      [],
      ["Claude Code", "Cursor"],
      ["Code Generation"],
      2
    );
    expect(results.length).toBeLessThanOrEqual(2);
    expect(results[0].score).toBeGreaterThanOrEqual(results[1]?.score ?? 0);
  });
});
