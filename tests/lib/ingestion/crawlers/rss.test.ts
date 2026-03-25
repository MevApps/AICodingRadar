import { describe, it, expect, vi } from "vitest";
import { RssCrawler } from "@/lib/ingestion/crawlers/rss";

const MOCK_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Blog</title>
    <item>
      <title>AI Coding Tool Update</title>
      <link>https://example.com/post-1</link>
      <description>New features in Claude Code</description>
      <pubDate>Mon, 24 Mar 2026 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Another Post</title>
      <link>https://example.com/post-2</link>
      <description>More AI coding news</description>
    </item>
  </channel>
</rss>`;

describe("RssCrawler", () => {
  it("parses RSS feed into raw items", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(MOCK_RSS),
    });

    const crawler = new RssCrawler();
    const result = await crawler.crawl("https://example.com/feed.xml");

    expect(result.items).toHaveLength(2);
    expect(result.items[0].title).toBe("AI Coding Tool Update");
    expect(result.items[0].externalUrl).toBe("https://example.com/post-1");
    expect(result.items[0].content).toBe("New features in Claude Code");
    expect(result.errors).toHaveLength(0);
  });

  it("returns error on fetch failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const crawler = new RssCrawler();
    const result = await crawler.crawl("https://example.com/bad-feed");

    expect(result.items).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });
});
