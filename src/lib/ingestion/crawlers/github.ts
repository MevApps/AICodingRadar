import type { Crawler, CrawlerResult } from "./types";

export class GitHubCrawler implements Crawler {
  async crawl(url: string): Promise<CrawlerResult> {
    try {
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) {
        return { items: [], errors: [`Invalid GitHub URL: ${url}`] };
      }

      const [, owner, repo] = match;
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=10`;

      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
      };
      if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
      }

      const response = await fetch(apiUrl, { headers });
      if (!response.ok) {
        return { items: [], errors: [`GitHub API error for ${url}: ${response.status}`] };
      }

      const releases = await response.json();
      const items = releases.map((release: any) => ({
        externalUrl: release.html_url,
        title: release.name || release.tag_name,
        content: release.body || "",
        publishedAt: release.published_at ? new Date(release.published_at) : undefined,
      }));

      return { items, errors: [] };
    } catch (error) {
      return { items: [], errors: [`GitHub crawl error for ${url}: ${(error as Error).message}`] };
    }
  }
}
