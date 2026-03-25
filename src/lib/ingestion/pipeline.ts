import { db } from "@/lib/db";
import { rawItems, entries, entrySupersessions, sources } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { RunTracker } from "./tracker";
import { PipelineLogger } from "./logger";
import { RssCrawler } from "./crawlers/rss";
import { GitHubCrawler } from "./crawlers/github";
import { RedditCrawler } from "./crawlers/reddit";
import { HackerNewsCrawler } from "./crawlers/hackernews";
import { filterRelevance } from "./relevance-filter";
import { structureEntry } from "./structurer";
import { findSupersessionCandidates, checkSupersession } from "./supersession";
import { generateEmbedding } from "@/lib/embeddings/client";
import { generateSlug } from "@/lib/utils/slug";
import type { Crawler } from "./crawlers/types";
import type { SourceType } from "@/types";

interface SourceInput {
  id: string;
  url: string;
  type: SourceType;
  name: string;
  relevanceThreshold: number;
}

interface PipelineResult {
  crawled: number;
  relevant: number;
  structured: number;
  supersessionsFound: number;
  errors: string[];
}

function getCrawler(type: SourceType): Crawler {
  switch (type) {
    case "rss":
      return new RssCrawler();
    case "github":
      return new GitHubCrawler();
    case "reddit":
      return new RedditCrawler();
    case "hackernews":
      return new HackerNewsCrawler();
    default:
      throw new Error(`Unsupported source type: ${type}`);
  }
}

export async function processSource(
  source: SourceInput,
  tracker?: RunTracker,
  logger?: PipelineLogger
): Promise<PipelineResult> {
  const result: PipelineResult = { crawled: 0, relevant: 0, structured: 0, supersessionsFound: 0, errors: [] };

  const relevanceScores: number[] = [];
  let supersessionChecks = 0;

  // 1. Crawl
  const crawler = getCrawler(source.type);
  const crawlResult = await crawler.crawl(source.url);
  result.crawled = crawlResult.items.length;
  result.errors.push(...crawlResult.errors);

  logger?.recordCrawl(source.id, {
    itemsFound: crawlResult.items.length,
    errors: crawlResult.errors,
  });

  // 2. Deduplicate by URL and store raw items
  for (const item of crawlResult.items) {
    try {
      const inserted = await db
        .insert(rawItems)
        .values({
          sourceId: source.id,
          externalUrl: item.externalUrl,
          title: item.title,
          content: item.content,
        })
        .onConflictDoNothing()
        .returning();

      if (inserted.length === 0) continue; // Duplicate URL, skip

      // 3. Relevance filter
      const relevance = await filterRelevance({
        title: item.title,
        content: item.content,
      }, tracker);

      await db
        .update(rawItems)
        .set({ relevanceScore: relevance.score })
        .where(eq(rawItems.id, inserted[0].id));

      relevanceScores.push(relevance.score);

      if (relevance.score < source.relevanceThreshold) continue;
      result.relevant++;

      // 4. Structure
      const structured = await structureEntry({
        title: item.title,
        content: item.content,
      }, tracker);

      // 5. Generate embedding
      const embeddingText = `${structured.title} ${structured.summary}`;
      const embedding = await generateEmbedding(embeddingText);

      // 6. Store as draft entry
      const slug = generateSlug(structured.title);
      const [newEntry] = await db.insert(entries).values({
        type: structured.type,
        status: "active",
        confidence: "draft",
        title: structured.title,
        slug,
        summary: structured.summary,
        body: structured.body,
        tools: structured.tools,
        categories: structured.categories,
        sources: [item.externalUrl],
        embedding,
      }).returning();

      result.structured++;

      // 7. Supersession check
      const activeEntries = await db
        .select({ id: entries.id, tools: entries.tools, categories: entries.categories, title: entries.title, body: entries.body })
        .from(entries)
        .where(and(eq(entries.status, "active"), eq(entries.confidence, "verified")));

      const candidates = findSupersessionCandidates(
        { tools: structured.tools, categories: structured.categories },
        activeEntries.map((e) => ({ id: e.id, tools: e.tools, categories: e.categories }))
      );

      for (const candidate of candidates) {
        supersessionChecks++;
        const existing = activeEntries.find((e) => e.id === candidate.id)!;
        const supersessionResult = await checkSupersession(
          { title: structured.title, body: structured.body },
          { title: existing.title, body: existing.body },
          tracker
        );

        if (supersessionResult.supersedes) {
          result.supersessionsFound++;
          await db.insert(entrySupersessions).values({
            supersedingEntryId: newEntry.id,
            supersededEntryId: candidate.id,
          });
          await db
            .update(entries)
            .set({ status: "superseded" })
            .where(eq(entries.id, candidate.id));
        }
      }

      // Mark raw item as processed
      await db
        .update(rawItems)
        .set({ processed: true })
        .where(eq(rawItems.id, inserted[0].id));
    } catch (error) {
      result.errors.push(
        `Error processing item "${item.title}": ${(error as Error).message}`
      );
    }
  }

  logger?.recordRelevance(source.id, {
    itemsScored: result.crawled,
    itemsPassed: result.relevant,
    scores: relevanceScores,
  });
  logger?.recordStructuring(source.id, {
    itemsStructured: result.structured,
    errors: result.errors.filter((e) => e.includes("structur")),
  });
  logger?.recordSupersession(source.id, {
    checked: supersessionChecks,
    found: result.supersessionsFound,
  });

  return result;
}

export async function processBacklog(
  tracker?: RunTracker
): Promise<PipelineResult> {
  const result: PipelineResult = {
    crawled: 0, relevant: 0, structured: 0, supersessionsFound: 0, errors: [],
  };

  const unprocessed = await db
    .select()
    .from(rawItems)
    .where(eq(rawItems.processed, false))
    .orderBy(rawItems.createdAt)
    .limit(50);

  for (const item of unprocessed) {
    try {
      const [source] = await db
        .select({ relevanceThreshold: sources.relevanceThreshold })
        .from(sources)
        .where(eq(sources.id, item.sourceId))
        .limit(1);

      const threshold = source?.relevanceThreshold ?? 0.5;

      const relevance = await filterRelevance(
        { title: item.title, content: item.content },
        tracker
      );

      await db
        .update(rawItems)
        .set({ relevanceScore: relevance.score })
        .where(eq(rawItems.id, item.id));

      if (relevance.score < threshold) {
        await db.update(rawItems).set({ processed: true }).where(eq(rawItems.id, item.id));
        continue;
      }
      result.relevant++;

      const structured = await structureEntry(
        { title: item.title, content: item.content },
        tracker
      );

      const embeddingText = `${structured.title} ${structured.summary}`;
      const embedding = await generateEmbedding(embeddingText);

      const slug = generateSlug(structured.title);
      await db.insert(entries).values({
        type: structured.type,
        status: "active",
        confidence: "draft",
        title: structured.title,
        slug,
        summary: structured.summary,
        body: structured.body,
        tools: structured.tools,
        categories: structured.categories,
        sources: [item.externalUrl],
        embedding,
      });

      result.structured++;
      await db.update(rawItems).set({ processed: true }).where(eq(rawItems.id, item.id));
    } catch (error) {
      result.errors.push(`Backlog error "${item.title}": ${(error as Error).message}`);
    }
  }

  return result;
}
