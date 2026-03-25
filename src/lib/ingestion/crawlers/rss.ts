import Parser from "rss-parser";
import type { Crawler, CrawlerResult } from "./types";

const parser = new Parser();

export class RssCrawler implements Crawler {
  async crawl(url: string): Promise<CrawlerResult> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return {
          items: [],
          errors: [`Failed to fetch ${url}: ${response.status} ${response.statusText}`],
        };
      }

      const xml = await response.text();
      const feed = await parser.parseString(xml);

      const items = feed.items.map((item) => ({
        externalUrl: item.link ?? "",
        title: item.title ?? "Untitled",
        content: item.contentSnippet ?? item.content ?? item.summary ?? "",
        publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
      }));

      return { items, errors: [] };
    } catch (error) {
      return {
        items: [],
        errors: [`RSS crawl error for ${url}: ${(error as Error).message}`],
      };
    }
  }
}
