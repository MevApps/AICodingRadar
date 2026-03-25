import type { Crawler, CrawlerResult, RawItem } from "./types";

const HN_API = "https://hacker-news.firebaseio.com/v0";

export class HackerNewsCrawler implements Crawler {
  constructor(private minScore: number = 50) {}

  async crawl(_url: string): Promise<CrawlerResult> {
    try {
      const idsResponse = await fetch(`${HN_API}/topstories.json`);
      if (!idsResponse.ok) {
        return { items: [], errors: ["Failed to fetch HN top stories"] };
      }

      const ids: number[] = await idsResponse.json();
      const topIds = ids.slice(0, 30);

      const stories = await Promise.all(
        topIds.map(async (id) => {
          const res = await fetch(`${HN_API}/item/${id}.json`);
          return res.ok ? res.json() : null;
        })
      );

      const items: RawItem[] = stories
        .filter((s) => s && s.score >= this.minScore && s.url)
        .map((s) => ({
          externalUrl: s.url,
          title: s.title,
          content: s.text || "",
          publishedAt: new Date(s.time * 1000),
        }));

      return { items, errors: [] };
    } catch (error) {
      return { items: [], errors: [`HN crawl error: ${(error as Error).message}`] };
    }
  }
}
