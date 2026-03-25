import { describe, it, expect } from "vitest";
import { RunTracker } from "@/lib/ingestion/tracker";

describe("RunTracker", () => {
  it("accumulates token usage from API responses", () => {
    const tracker = new RunTracker();
    tracker.recordUsage({ inputTokens: 100, outputTokens: 50 });
    tracker.recordUsage({ inputTokens: 200, outputTokens: 75 });
    const usage = tracker.getUsage();
    expect(usage.inputTokens).toBe(300);
    expect(usage.outputTokens).toBe(125);
    expect(usage.costUsd).toBeGreaterThan(0);
  });

  it("calculates cost using Sonnet pricing", () => {
    const tracker = new RunTracker();
    tracker.recordUsage({ inputTokens: 1_000_000, outputTokens: 1_000_000 });
    const usage = tracker.getUsage();
    expect(usage.costUsd).toBeCloseTo(18.0, 1);
  });

  it("checks budget against monthly spend", () => {
    const tracker = new RunTracker();
    expect(tracker.checkBudget(10.0, 50.0)).toBe(true);
    expect(tracker.checkBudget(55.0, 50.0)).toBe(false);
  });
});
