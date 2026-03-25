export interface RawItem {
  externalUrl: string;
  title: string;
  content: string;
  publishedAt?: Date;
}

export interface CrawlerResult {
  items: RawItem[];
  errors: string[];
}

export interface Crawler {
  crawl(url: string): Promise<CrawlerResult>;
}
