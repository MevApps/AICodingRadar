import { describe, it, expect, vi } from "vitest";
import { RedditCrawler } from "@/lib/ingestion/crawlers/reddit";

describe("RedditCrawler", () => {
  it("fetches posts from Reddit JSON API", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          children: [
            {
              data: {
                title: "New AI coding tool released",
                url: "https://reddit.com/r/test/comments/abc123",
                permalink: "/r/test/comments/abc123/new_ai_tool/",
                selftext: "Check out this new tool",
                created_utc: 1742860800,
              },
            },
          ],
        },
      }),
    });

    const crawler = new RedditCrawler();
    const result = await crawler.crawl("https://www.reddit.com/r/test");

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe("New AI coding tool released");
  });
});
