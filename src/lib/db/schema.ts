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
  jsonb,
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

export const runStatusEnum = pgEnum("run_status", [
  "running", "completed", "failed",
]);

export const triggeredByEnum = pgEnum("triggered_by", [
  "cron", "manual",
]);

export const settings = pgTable(
  "settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull().unique(),
    value: text("value").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("settings_key_idx").on(table.key),
  ]
);

export const ingestionRuns = pgTable(
  "ingestion_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    status: runStatusEnum("status").notNull().default("running"),
    sourcesProcessed: integer("sources_processed").notNull().default(0),
    itemsCrawled: integer("items_crawled").notNull().default(0),
    itemsRelevant: integer("items_relevant").notNull().default(0),
    itemsStructured: integer("items_structured").notNull().default(0),
    supersessionsFound: integer("supersessions_found").notNull().default(0),
    errors: text("errors").array().notNull().default([]),
    tokensInput: integer("tokens_input").notNull().default(0),
    tokensOutput: integer("tokens_output").notNull().default(0),
    costUsd: real("cost_usd").notNull().default(0),
    perSourceResults: jsonb("per_source_results"), // SourceResult[] — use jsonb for structured querying
    triggeredBy: triggeredByEnum("triggered_by").notNull(),
  },
  (table) => [
    index("ingestion_runs_started_at_idx").on(table.startedAt),
    index("ingestion_runs_status_idx").on(table.status),
  ]
);
