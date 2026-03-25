import { describe, it, expect } from "vitest";
import { RELEVANCE_FILTER_PROMPT, STRUCTURER_PROMPT } from "@/lib/ai/prompts";

describe("RELEVANCE_FILTER_PROMPT", () => {
  it("instructs JSON-only response with score and reason fields", () => {
    expect(RELEVANCE_FILTER_PROMPT).toContain("score");
    expect(RELEVANCE_FILTER_PROMPT).toContain("reason");
    expect(RELEVANCE_FILTER_PROMPT).toContain("JSON");
  });

  it("defines the 0.0-1.0 scoring scale", () => {
    expect(RELEVANCE_FILTER_PROMPT).toContain("0.0");
    expect(RELEVANCE_FILTER_PROMPT).toContain("1.0");
  });

  it("mentions target audience context", () => {
    expect(RELEVANCE_FILTER_PROMPT).toMatch(/tech lead|engineering manager/i);
  });
});

describe("STRUCTURER_PROMPT", () => {
  it("defines all four entry types", () => {
    expect(STRUCTURER_PROMPT).toContain("tip");
    expect(STRUCTURER_PROMPT).toContain("comparison");
    expect(STRUCTURER_PROMPT).toContain("guide");
    expect(STRUCTURER_PROMPT).toContain("breaking");
  });

  it("requires JSON response with all required fields", () => {
    expect(STRUCTURER_PROMPT).toContain("title");
    expect(STRUCTURER_PROMPT).toContain("summary");
    expect(STRUCTURER_PROMPT).toContain("body");
    expect(STRUCTURER_PROMPT).toContain("tools");
    expect(STRUCTURER_PROMPT).toContain("categories");
  });

  it("includes editorial guidelines for title quality", () => {
    expect(STRUCTURER_PROMPT).toMatch(/specific|actionable/i);
  });

  it("includes 'so what' framing for summaries", () => {
    expect(STRUCTURER_PROMPT).toMatch(/so what|why.*care|impact/i);
  });

  it("lists valid categories", () => {
    expect(STRUCTURER_PROMPT).toContain("Code Generation");
    expect(STRUCTURER_PROMPT).toContain("Code Review");
    expect(STRUCTURER_PROMPT).toContain("Testing");
    expect(STRUCTURER_PROMPT).toContain("Debugging");
    expect(STRUCTURER_PROMPT).toContain("DevOps");
    expect(STRUCTURER_PROMPT).toContain("Architecture");
  });
});
