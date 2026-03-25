import { describe, it, expect, vi, beforeEach } from "vitest";
import { processSource } from "@/lib/ingestion/pipeline";

vi.mock("@/lib/ingestion/crawlers/rss", () => {
  const crawlMock = vi.fn().mockResolvedValue({
    items: [
      { externalUrl: "https://example.com/1", title: "Test", content: "AI coding content" },
    ],
    errors: [],
  });
  return {
    RssCrawler: class {
      crawl = crawlMock;
    },
  };
});

vi.mock("@/lib/ingestion/relevance-filter", () => ({
  filterRelevance: vi.fn().mockResolvedValue({ score: 0.9, reason: "Relevant" }),
}));

vi.mock("@/lib/ingestion/structurer", () => ({
  structureEntry: vi.fn().mockResolvedValue({
    type: "tip",
    title: "Test Entry",
    summary: "A test summary",
    body: "Full body content",
    tools: ["Claude Code"],
    categories: ["Code Generation"],
  }),
}));

vi.mock("@/lib/embeddings/client", () => ({
  generateEmbedding: vi.fn().mockResolvedValue(new Array(1024).fill(0)),
}));

vi.mock("@/lib/ingestion/supersession", () => ({
  findSupersessionCandidates: vi.fn().mockReturnValue([]),
  checkSupersession: vi.fn().mockResolvedValue({ supersedes: false, reason: "" }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "test-id" }]),
        }),
        returning: vi.fn().mockResolvedValue([{ id: "new-entry-id" }]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(
          Object.assign(Promise.resolve([]), {
            limit: vi.fn().mockResolvedValue([]),
            and: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          })
        ),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

describe("processSource", () => {
  it("runs full pipeline: crawl → filter → structure → store", async () => {
    const result = await processSource({
      id: "source-1",
      url: "https://example.com/feed.xml",
      type: "rss",
      name: "Test Source",
      relevanceThreshold: 0.5,
    });

    expect(result.crawled).toBe(1);
    expect(result.relevant).toBe(1);
    expect(result.structured).toBe(1);
    expect(result.errors).toHaveLength(0);
  });
});
