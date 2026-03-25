import { describe, it, expect, vi } from "vitest";
import { GitHubCrawler } from "@/lib/ingestion/crawlers/github";

describe("GitHubCrawler", () => {
  it("fetches releases from GitHub API", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        {
          html_url: "https://github.com/org/repo/releases/tag/v1.0",
          name: "v1.0 Release",
          body: "New features and improvements",
          published_at: "2026-03-24T12:00:00Z",
        },
      ]),
    });

    const crawler = new GitHubCrawler();
    const result = await crawler.crawl("https://github.com/org/repo");

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe("v1.0 Release");
    expect(result.items[0].externalUrl).toBe("https://github.com/org/repo/releases/tag/v1.0");
  });
});
