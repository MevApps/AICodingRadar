import { describe, it, expect } from "vitest";
import { cosineSimilarity, isDuplicate } from "@/lib/ingestion/dedup";

describe("cosineSimilarity", () => {
  it("returns 1.0 for identical vectors", () => {
    const vec = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0);
  });

  it("returns 0.0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0);
  });

  it("returns value between 0 and 1 for similar vectors", () => {
    const a = [1, 2, 3];
    const b = [1, 2, 4];
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThan(0.9);
    expect(sim).toBeLessThan(1.0);
  });

  it("throws on mismatched vector lengths", () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow("Vector length mismatch");
  });
});

describe("isDuplicate", () => {
  it("returns true when similarity exceeds threshold", () => {
    const embedding = [1, 2, 3, 4, 5];
    const existing = [
      { id: "1", embedding: [1, 2, 3, 4, 5] },
    ];
    expect(isDuplicate(embedding, existing, 0.95)).toBe(true);
  });

  it("returns false when no existing entry is similar enough", () => {
    const embedding = [1, 0, 0, 0, 0];
    const existing = [
      { id: "1", embedding: [0, 0, 0, 0, 1] },
    ];
    expect(isDuplicate(embedding, existing, 0.95)).toBe(false);
  });

  it("returns false for empty existing entries", () => {
    expect(isDuplicate([1, 2, 3], [], 0.95)).toBe(false);
  });
});
