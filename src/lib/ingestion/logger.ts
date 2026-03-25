export interface CrawlResult {
  itemsFound: number;
  errors: string[];
}

export interface RelevanceResult {
  itemsScored: number;
  itemsPassed: number;
  scores: number[];
}

export interface StructuringResult {
  itemsStructured: number;
  errors: string[];
}

export interface SupersessionResult {
  checked: number;
  found: number;
}

export interface SourceResult {
  sourceId: string;
  sourceName: string;
  crawl: CrawlResult;
  relevance: RelevanceResult;
  structuring: StructuringResult;
  supersession: SupersessionResult;
}

export class PipelineLogger {
  private sources = new Map<string, SourceResult>();

  startSource(sourceId: string, sourceName: string): void {
    this.sources.set(sourceId, {
      sourceId,
      sourceName,
      crawl: { itemsFound: 0, errors: [] },
      relevance: { itemsScored: 0, itemsPassed: 0, scores: [] },
      structuring: { itemsStructured: 0, errors: [] },
      supersession: { checked: 0, found: 0 },
    });
  }

  recordCrawl(sourceId: string, result: CrawlResult): void {
    const source = this.sources.get(sourceId);
    if (!source) throw new Error(`PipelineLogger: unknown sourceId "${sourceId}"`);
    source.crawl = result;
  }

  recordRelevance(sourceId: string, result: RelevanceResult): void {
    const source = this.sources.get(sourceId);
    if (!source) throw new Error(`PipelineLogger: unknown sourceId "${sourceId}"`);
    source.relevance = result;
  }

  recordStructuring(sourceId: string, result: StructuringResult): void {
    const source = this.sources.get(sourceId);
    if (!source) throw new Error(`PipelineLogger: unknown sourceId "${sourceId}"`);
    source.structuring = result;
  }

  recordSupersession(sourceId: string, result: SupersessionResult): void {
    const source = this.sources.get(sourceId);
    if (!source) throw new Error(`PipelineLogger: unknown sourceId "${sourceId}"`);
    source.supersession = result;
  }

  getSourceResults(): SourceResult[] {
    return Array.from(this.sources.values());
  }
}
