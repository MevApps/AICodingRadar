import { describe, it, expect } from "vitest";
import { generateSlug } from "@/lib/utils/slug";

describe("generateSlug", () => {
  it("converts title to lowercase kebab-case", () => {
    expect(generateSlug("Claude Code Now Supports Background Agents"))
      .toBe("claude-code-now-supports-background-agents");
  });

  it("strips special characters", () => {
    expect(generateSlug("Cursor vs. Claude Code — A Comparison!"))
      .toBe("cursor-vs-claude-code-a-comparison");
  });

  it("collapses multiple dashes", () => {
    expect(generateSlug("What's   New  in  AI?"))
      .toBe("whats-new-in-ai");
  });

  it("trims leading/trailing dashes", () => {
    expect(generateSlug("  --Hello World--  "))
      .toBe("hello-world");
  });
});
