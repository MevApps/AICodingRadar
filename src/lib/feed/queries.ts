import { db } from "@/lib/db";
import { entries, entrySupersessions } from "@/lib/db/schema";
import { eq, and, desc, arrayContains, lt, sql } from "drizzle-orm";
import type { EntryType } from "@/types";

interface FeedFilters {
  category?: string;
  tool?: string;
  type?: EntryType;
}

export function buildFeedFilters(params: Record<string, string | undefined>): FeedFilters {
  return {
    category: params.category,
    tool: params.tool,
    type: params.type as EntryType | undefined,
  };
}

interface FeedOptions {
  cursor?: string;
  limit?: number;
  filters?: FeedFilters;
  sort?: "latest" | "breaking_first";
}

export async function getFeedEntries(options: FeedOptions = {}) {
  const { cursor, limit = 20, filters = {}, sort = "latest" } = options;

  const conditions = [
    eq(entries.status, "active"),
    eq(entries.confidence, "verified"),
  ];

  if (filters.category) {
    conditions.push(arrayContains(entries.categories, [filters.category]));
  }
  if (filters.tool) {
    conditions.push(arrayContains(entries.tools, [filters.tool]));
  }
  if (filters.type) {
    conditions.push(eq(entries.type, filters.type));
  }
  if (cursor) {
    conditions.push(lt(entries.publishedAt, new Date(cursor)));
  }

  const orderBy =
    sort === "breaking_first"
      ? [
          sql`CASE WHEN ${entries.type} = 'breaking' THEN 0 ELSE 1 END`,
          desc(entries.publishedAt),
        ]
      : [desc(entries.publishedAt)];

  const results = await db
    .select()
    .from(entries)
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(limit + 1);

  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, limit) : results;
  const nextCursor = hasMore
    ? items[items.length - 1].publishedAt?.toISOString()
    : null;

  return { items, nextCursor };
}

export async function getEntryBySlug(slug: string) {
  const result = await db
    .select()
    .from(entries)
    .where(eq(entries.slug, slug))
    .limit(1);

  return result[0] ?? null;
}

export async function getSupersessionLinks(entryId: string) {
  const supersedes = await db
    .select()
    .from(entrySupersessions)
    .where(eq(entrySupersessions.supersedingEntryId, entryId));

  const supersededBy = await db
    .select()
    .from(entrySupersessions)
    .where(eq(entrySupersessions.supersededEntryId, entryId));

  return { supersedes, supersededBy };
}
