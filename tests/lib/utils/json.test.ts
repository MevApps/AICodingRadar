import { describe, it, expect } from "vitest";
import { extractJson } from "@/lib/utils/json";

describe("extractJson", () => {
  it("parses clean JSON", () => {
    expect(extractJson('{"score": 0.8, "reason": "relevant"}')).toEqual({
      score: 0.8,
      reason: "relevant",
    });
  });

  it("extracts JSON from markdown code fences", () => {
    const input = '```json\n{"score": 0.8, "reason": "relevant"}\n```';
    expect(extractJson(input)).toEqual({ score: 0.8, reason: "relevant" });
  });

  it("extracts JSON from text with surrounding prose", () => {
    const input = 'Here is my analysis:\n{"score": 0.8, "reason": "relevant"}\nHope that helps!';
    expect(extractJson(input)).toEqual({ score: 0.8, reason: "relevant" });
  });

  it("throws on completely unparseable input", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});
