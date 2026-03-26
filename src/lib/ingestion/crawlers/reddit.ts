import type { Crawler, CrawlerResult } from "./types";

export class RedditCrawler implements Crawler {
  async crawl(url: string): Promise<CrawlerResult> {
    try {
      const match = url.match(/reddit\.com\/r\/([^/]+)/);
      if (!match) {
        return { items: [], errors: [`Invalid Reddit URL: ${url}`] };
      }

      const subreddit = match[1];
      const apiUrl = `https://www.reddit.com/r/${subreddit}/hot.json?limit=25`;

      const response = await fetch(apiUrl, {
        headers: { "User-Agent": "AICodingRadar/1.0" },
      });

      if (!response.ok) {
        return { items: [], errors: [`Reddit API error for ${url}: ${response.status}`] };
      }

      const data = await response.json();
      const items = data.data.children.map((child: any) => ({
        externalUrl: `https://www.reddit.com${child.data.permalink}`,
        title: child.data.title,
        content: child.data.selftext || child.data.url || "",
        publishedAt: new Date(child.data.created_utc * 1000),
        score: child.data.score ?? 0,
        comments: child.data.num_comments ?? 0,
      }));

      return { items, errors: [] };
    } catch (error) {
      return { items: [], errors: [`Reddit crawl error for ${url}: ${(error as Error).message}`] };
    }
  }
}
