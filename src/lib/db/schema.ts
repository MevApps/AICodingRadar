import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  real,
  pgEnum,
  primaryKey,
  index,
  vector,
} from "drizzle-orm/pg-core";

export const entryTypeEnum = pgEnum("entry_type", [
  "tip", "comparison", "guide", "breaking",
]);

export const entryStatusEnum = pgEnum("entry_status", [
  "active", "superseded", "archived", "rejected",
]);

export const confidenceEnum = pgEnum("confidence", ["draft", "verified"]);

export const sourceTypeEnum = pgEnum("source_type", [
  "rss", "github", "reddit", "hackernews", "twitter", "scraper",
]);

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: entryTypeEnum("type").notNull(),
    status: entryStatusEnum("status").notNull().default("active"),
    confidence: confidenceEnum("confidence").notNull().default("draft"),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    summary: text("summary").notNull(),
    body: text("body").notNull(),
    tools: text("tools").array().notNull().default([]),
    categories: text("categories").array().notNull().default([]),
    sources: text("sources").array().notNull().default([]),
    embedding: vector("embedding", { dimensions: 1024 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    verifiedAt: timestamp("verified_at"),
    publishedAt: timestamp("published_at"),
  },
  (table) => [
    index("entries_status_idx").on(table.status),
    index("entries_type_idx").on(table.type),
    index("entries_slug_idx").on(table.slug),
    index("entries_published_at_idx").on(table.publishedAt),
  ]
);

export const entrySupersessions = pgTable(
  "entry_supersessions",
  {
    supersedingEntryId: uuid("superseding_entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    supersededEntryId: uuid("superseded_entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.supersedingEntryId, table.supersededEntryId],
    }),
  ]
);

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    url: text("url").notNull().unique(),
    type: sourceTypeEnum("type").notNull(),
    name: text("name").notNull(),
    lastCrawlAt: timestamp("last_crawl_at"),
    crawlInterval: text("crawl_interval").notNull().default("1 hour"),
    errorCount: integer("error_count").notNull().default(0),
    relevanceThreshold: real("relevance_threshold").notNull().default(0.5),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("sources_enabled_idx").on(table.enabled),
  ]
);

export const rawItems = pgTable(
  "raw_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    externalUrl: text("external_url").notNull().unique(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    relevanceScore: real("relevance_score"),
    processed: boolean("processed").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("raw_items_processed_idx").on(table.processed),
    index("raw_items_source_idx").on(table.sourceId),
  ]
);
