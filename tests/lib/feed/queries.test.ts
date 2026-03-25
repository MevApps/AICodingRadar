import { describe, it, expect } from "vitest";
import { buildFeedFilters } from "@/lib/feed/queries";

describe("buildFeedFilters", () => {
  it("returns empty conditions for no filters", () => {
    const filters = buildFeedFilters({});
    expect(filters).toEqual({
      category: undefined,
      tool: undefined,
      type: undefined,
    });
  });

  it("parses category filter", () => {
    const filters = buildFeedFilters({ category: "Testing" });
    expect(filters.category).toBe("Testing");
  });

  it("parses tool filter", () => {
    const filters = buildFeedFilters({ tool: "Claude Code" });
    expect(filters.tool).toBe("Claude Code");
  });

  it("parses type filter", () => {
    const filters = buildFeedFilters({ type: "tip" });
    expect(filters.type).toBe("tip");
  });
});
