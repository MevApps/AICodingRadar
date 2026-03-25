import { describe, it, expect } from "vitest";
import { PipelineLogger } from "@/lib/ingestion/logger";

describe("PipelineLogger", () => {
  it("records per-source stage results", () => {
    const logger = new PipelineLogger();
    logger.startSource("source-1", "Test Blog");

    logger.recordCrawl("source-1", { itemsFound: 5, errors: [] });
    logger.recordRelevance("source-1", {
      itemsScored: 5,
      itemsPassed: 2,
      scores: [0.9, 0.8, 0.3, 0.2, 0.1],
    });
    logger.recordStructuring("source-1", { itemsStructured: 2, errors: [] });
    logger.recordSupersession("source-1", { checked: 2, found: 1 });

    const results = logger.getSourceResults();
    expect(results).toHaveLength(1);
    expect(results[0].sourceName).toBe("Test Blog");
    expect(results[0].crawl.itemsFound).toBe(5);
    expect(results[0].relevance.itemsPassed).toBe(2);
    expect(results[0].structuring.itemsStructured).toBe(2);
    expect(results[0].supersession.found).toBe(1);
  });

  it("handles multiple sources independently", () => {
    const logger = new PipelineLogger();
    logger.startSource("s1", "Blog A");
    logger.startSource("s2", "Blog B");
    logger.recordCrawl("s1", { itemsFound: 3, errors: [] });
    logger.recordCrawl("s2", { itemsFound: 7, errors: ["timeout"] });

    const results = logger.getSourceResults();
    expect(results).toHaveLength(2);
    expect(results.find((r) => r.sourceName === "Blog A")!.crawl.itemsFound).toBe(3);
    expect(results.find((r) => r.sourceName === "Blog B")!.crawl.errors).toEqual(["timeout"]);
  });

  it("throws when recording for an unregistered sourceId", () => {
    const logger = new PipelineLogger();
    expect(() => logger.recordCrawl("ghost", { itemsFound: 1, errors: [] })).toThrow("unknown sourceId");
  });

  it("produces a JSON-serializable summary", () => {
    const logger = new PipelineLogger();
    logger.startSource("s1", "Test");
    logger.recordCrawl("s1", { itemsFound: 1, errors: [] });
    const json = JSON.stringify(logger.getSourceResults());
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
