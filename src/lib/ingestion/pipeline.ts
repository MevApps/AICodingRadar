import { db } from "@/lib/db";
import { rawItems, entries, entrySupersessions, sources } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { RunTracker } from "./tracker";
import { PipelineLogger } from "./logger";
import { ingestionEvents } from "./events";
import { RssCrawler } from "./crawlers/rss";
import { GitHubCrawler } from "./crawlers/github";
import { RedditCrawler } from "./crawlers/reddit";
import { HackerNewsCrawler } from "./crawlers/hackernews";
import { filterRelevance } from "./relevance-filter";
import { structureEntry } from "./structurer";
import { findSupersessionCandidates, checkSupersession } from "./supersession";
import { generateEmbedding } from "@/lib/embeddings/client";
import { isDuplicate } from "./dedup";
import { generateSlug } from "@/lib/utils/slug";
import { cleanContent, isLowQuality } from "@/lib/utils/clean-content";
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
  logger?: PipelineLogger,
  manualMode: boolean = false
): Promise<PipelineResult> {
  const result: PipelineResult = { crawled: 0, relevant: 0, structured: 0, supersessionsFound: 0, errors: [] };

  const relevanceScores: number[] = [];
  let supersessionChecks = 0;

  // 1. Crawl
  const crawler = getCrawler(source.type);
  const crawlResult = await crawler.crawl(source.url);

  // 1.5. Date cutoff — only process items from the last 7 days
  const maxAgeDays = parseInt(process.env.CRAWL_MAX_AGE_DAYS ?? "7", 10);
  const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
  crawlResult.items = crawlResult.items.filter((item) => {
    if (!item.publishedAt) return true; // Keep items with no date (can't filter)
    return item.publishedAt >= cutoffDate;
  });

  result.crawled = crawlResult.items.length;
  result.errors.push(...crawlResult.errors);

  logger?.recordCrawl(source.id, {
    itemsFound: crawlResult.items.length,
    errors: crawlResult.errors,
  });

  // Pre-fetch active entry embeddings for semantic dedup (once per source, not per item)
  const recentEntries = await db
    .select({ id: entries.id, embedding: entries.embedding })
    .from(entries)
    .where(eq(entries.status, "active"))
    .limit(200);

  const dedupCandidates = recentEntries
    .filter((e): e is typeof e & { embedding: number[] } => e.embedding !== null);

  // 2. Deduplicate by URL and store raw items
  for (const rawItem of crawlResult.items) {
    // Clean content and title
    const item = {
      ...rawItem,
      title: cleanContent(rawItem.title),
      content: cleanContent(rawItem.content),
    };

    // Quality filter — skip low-quality noise
    if (isLowQuality(item)) continue;

    try {
      const inserted = await db
        .insert(rawItems)
        .values({
          sourceId: source.id,
          externalUrl: item.externalUrl,
          title: item.title,
          content: item.content,
          score: item.score,
          comments: item.comments,
        })
        .onConflictDoNothing()
        .returning();

      if (inserted.length === 0) continue; // Duplicate URL, skip

      if (manualMode) {
        // Manual mode: skip AI, create draft directly from raw content
        ingestionEvents.emit("item:scoring", {
          title: item.title,
          sourceName: source.name,
        });
        ingestionEvents.emit("item:scored", {
          title: item.title,
          score: 1.0,
          relevant: true,
          sourceName: source.name,
        });

        result.relevant++;

        const slug = generateSlug(item.title);
        const summary = item.content.slice(0, 300) + (item.content.length > 300 ? "..." : "");

        // Build engagement info for the body
        const engagementParts: string[] = [];
        if (item.score !== undefined && item.score > 0) engagementParts.push(`${item.score} points`);
        if (item.comments !== undefined && item.comments > 0) engagementParts.push(`${item.comments} comments`);
        const engagementLine = engagementParts.length > 0 ? `\n\n---\nEngagement: ${engagementParts.join(" · ")}` : "";

        try {
          await db.insert(entries).values({
            type: "tip",
            status: "active",
            confidence: "draft",
            title: item.title,
            slug: slug + "-" + Date.now().toString(36),
            summary: summary || "Pending review",
            body: (item.content || item.title) + engagementLine,
            tools: [],
            categories: [],
            sources: [item.externalUrl],
          });
        } catch {
          // Slug collision or other DB error, skip
          continue;
        }

        result.structured++;

        ingestionEvents.emit("item:structured", {
          title: item.title,
          type: "tip",
          tools: [],
          sourceName: source.name,
        });

        await db.update(rawItems).set({ processed: true }).where(eq(rawItems.id, inserted[0].id));
        continue;
      }

      // 3. Relevance filter
      ingestionEvents.emit("item:scoring", {
        title: item.title,
        sourceName: source.name,
      });

      const relevance = await filterRelevance({
        title: item.title,
        content: item.content,
      }, tracker);

      await db
        .update(rawItems)
        .set({ relevanceScore: relevance.score })
        .where(eq(rawItems.id, inserted[0].id));

      relevanceScores.push(relevance.score);

      ingestionEvents.emit("item:scored", {
        title: item.title,
        score: relevance.score,
        relevant: relevance.score >= source.relevanceThreshold,
        sourceName: source.name,
      });

      if (relevance.score < source.relevanceThreshold) continue;
      result.relevant++;

      // 4. Structure
      ingestionEvents.emit("item:structuring", {
        title: item.title,
        sourceName: source.name,
      });

      const structured = await structureEntry({
        title: item.title,
        content: item.content,
      }, tracker);

      // 5. Generate embedding
      const embeddingText = `${structured.title} ${structured.summary}`;
      const embedding = await generateEmbedding(embeddingText);

      // 5b. Semantic deduplication
      if (isDuplicate(embedding, dedupCandidates)) {
        await db.update(rawItems).set({ processed: true }).where(eq(rawItems.id, inserted[0].id));
        continue;
      }

      // Add this entry's embedding to candidates for subsequent items in this run
      dedupCandidates.push({ id: "pending", embedding });

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

      ingestionEvents.emit("item:structured", {
        title: structured.title,
        type: structured.type,
        tools: structured.tools,
        sourceName: source.name,
      });

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
      ingestionEvents.emit("item:error", {
        title: item.title,
        error: (error as Error).message,
        sourceName: source.name,
      });
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
