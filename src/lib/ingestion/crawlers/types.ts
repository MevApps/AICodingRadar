export interface RawItem {
  externalUrl: string;
  title: string;
  content: string;
  publishedAt?: Date;
  score?: number;       // upvotes, HN points, etc.
  comments?: number;    // comment count
  sourceName?: string;  // which source this came from
}

export interface CrawlerResult {
  items: RawItem[];
  errors: string[];
}

export interface Crawler {
  crawl(url: string): Promise<CrawlerResult>;
}
