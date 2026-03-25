import { describe, it, expect, vi } from "vitest";
import { HackerNewsCrawler } from "@/lib/ingestion/crawlers/hackernews";

describe("HackerNewsCrawler", () => {
  it("fetches top stories and filters by score", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([100, 101]),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        id: 100, title: "AI Coding Tool Update",
        url: "https://example.com/ai-tool", score: 150, time: 1742860800,
      }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        id: 101, title: "Low Score Post",
        url: "https://example.com/low", score: 10, time: 1742860800,
      }),
    });

    global.fetch = fetchMock;

    const crawler = new HackerNewsCrawler(50);
    const result = await crawler.crawl("https://news.ycombinator.com");

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe("AI Coding Tool Update");
  });
});
