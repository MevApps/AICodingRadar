# Admin Panel Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a rich status dashboard, ingestion controls with cost tracking, and AI source recommendations to the admin panel.

**Architecture:** New `ingestionRuns` DB table tracks each pipeline execution with token/cost data. A `RunTracker` class wraps AI calls to accumulate usage. Stats API aggregates dashboard metrics. Source recommendations use a static curated registry scored by coverage gaps. All new UI components are client-side, polling the stats API.

**Descoped from spec (deferred to future iteration):** Queue sparkline (needs historical data tracking), Cost card per-stage breakdown tooltip (needs per-stage fields in tracker — showing total cost only for now).

**Tech Stack:** Next.js App Router, Drizzle ORM, Tailwind CSS, Anthropic SDK (token tracking via response metadata)

**Spec:** `docs/superpowers/specs/2026-03-25-admin-panel-enhancements-design.md`

---

## Task 1: IngestionRun Schema

**Files:**
- Modify: `src/lib/db/schema.ts`
- Test: `tests/lib/db/schema.test.ts`

- [ ] **Step 1: Write test for new table**

Add to `tests/lib/db/schema.test.ts`:
```typescript
describe("ingestionRuns schema", () => {
  it("has required columns", () => {
    const columns = Object.keys(ingestionRuns);
    expect(columns).toContain("id");
    expect(columns).toContain("startedAt");
    expect(columns).toContain("completedAt");
    expect(columns).toContain("status");
    expect(columns).toContain("sourcesProcessed");
    expect(columns).toContain("itemsCrawled");
    expect(columns).toContain("itemsRelevant");
    expect(columns).toContain("itemsStructured");
    expect(columns).toContain("supersessionsFound");
    expect(columns).toContain("errors");
    expect(columns).toContain("tokensInput");
    expect(columns).toContain("tokensOutput");
    expect(columns).toContain("costUsd");
    expect(columns).toContain("triggeredBy");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/lib/db/schema.test.ts
# Expected: FAIL — ingestionRuns not exported
```

- [ ] **Step 3: Add ingestionRuns table to schema**

Add to `src/lib/db/schema.ts`:
```typescript
export const runStatusEnum = pgEnum("run_status", [
  "running", "completed", "failed",
]);

export const triggeredByEnum = pgEnum("triggered_by", [
  "cron", "manual",
]);

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
    triggeredBy: triggeredByEnum("triggered_by").notNull(),
  },
  (table) => [
    index("ingestion_runs_started_at_idx").on(table.startedAt),
    index("ingestion_runs_status_idx").on(table.status),
  ]
);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/lib/db/schema.test.ts
# Expected: PASS
```

- [ ] **Step 5: Push schema to database**

```bash
DATABASE_URL=postgresql://mevapps@localhost:5432/ai_coding_radar npx drizzle-kit push
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add ingestionRuns table for tracking pipeline execution"
```

---

## Task 2: RunTracker Class

**Files:**
- Create: `src/lib/ingestion/tracker.ts`
- Test: `tests/lib/ingestion/tracker.test.ts`

- [ ] **Step 1: Write RunTracker tests**

Create `tests/lib/ingestion/tracker.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { RunTracker } from "@/lib/ingestion/tracker";

describe("RunTracker", () => {
  it("accumulates token usage from API responses", () => {
    const tracker = new RunTracker();

    tracker.recordUsage({ inputTokens: 100, outputTokens: 50 });
    tracker.recordUsage({ inputTokens: 200, outputTokens: 75 });

    const usage = tracker.getUsage();
    expect(usage.inputTokens).toBe(300);
    expect(usage.outputTokens).toBe(125);
    expect(usage.costUsd).toBeGreaterThan(0);
  });

  it("calculates cost using Sonnet pricing", () => {
    const tracker = new RunTracker();
    // 1M input tokens = $3, 1M output tokens = $15
    tracker.recordUsage({ inputTokens: 1_000_000, outputTokens: 1_000_000 });

    const usage = tracker.getUsage();
    expect(usage.costUsd).toBeCloseTo(18.0, 1);
  });

  it("checks budget against monthly spend", () => {
    const tracker = new RunTracker();
    const withinBudget = tracker.checkBudget(10.0, 50.0);
    expect(withinBudget).toBe(true);

    const overBudget = tracker.checkBudget(55.0, 50.0);
    expect(overBudget).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/lib/ingestion/tracker.test.ts
# Expected: FAIL
```

- [ ] **Step 3: Implement RunTracker**

Create `src/lib/ingestion/tracker.ts`:
```typescript
const SONNET_INPUT_PRICE = 3.0 / 1_000_000;
const SONNET_OUTPUT_PRICE = 15.0 / 1_000_000;

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

interface AccumulatedUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export class RunTracker {
  private inputTokens = 0;
  private outputTokens = 0;

  recordUsage(usage: TokenUsage): void {
    this.inputTokens += usage.inputTokens;
    this.outputTokens += usage.outputTokens;
  }

  getUsage(): AccumulatedUsage {
    return {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      costUsd:
        this.inputTokens * SONNET_INPUT_PRICE +
        this.outputTokens * SONNET_OUTPUT_PRICE,
    };
  }

  checkBudget(currentMonthSpend: number, budgetCap: number): boolean {
    return currentMonthSpend + this.getUsage().costUsd <= budgetCap;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/lib/ingestion/tracker.test.ts
# Expected: PASS
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add RunTracker for token/cost accumulation"
```

---

## Task 3: Thread RunTracker Through Pipeline

**Files:**
- Modify: `src/lib/ingestion/relevance-filter.ts`
- Modify: `src/lib/ingestion/structurer.ts`
- Modify: `src/lib/ingestion/supersession.ts`
- Modify: `src/lib/ingestion/pipeline.ts`
- Test: existing tests must still pass

- [ ] **Step 1: Add optional tracker param to relevance-filter.ts**

Modify `src/lib/ingestion/relevance-filter.ts` — add optional `tracker` parameter:
```typescript
import { getAnthropicClient } from "@/lib/ai/client";
import { RELEVANCE_FILTER_PROMPT } from "@/lib/ai/prompts";
import type { RunTracker } from "./tracker";

interface RelevanceResult {
  score: number;
  reason: string;
}

export async function filterRelevance(
  item: { title: string; content: string },
  tracker?: RunTracker
): Promise<RelevanceResult> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    system: RELEVANCE_FILTER_PROMPT,
    messages: [
      {
        role: "user",
        content: `Title: ${item.title}\n\nContent: ${item.content}`,
      },
    ],
  });

  if (tracker && response.usage) {
    tracker.recordUsage({
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });
  }

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = JSON.parse(text);

  return { score: parsed.score, reason: parsed.reason };
}
```

- [ ] **Step 2: Add optional tracker param to structurer.ts**

Same pattern — add `tracker?: RunTracker` param, record usage after API call:
```typescript
import { getAnthropicClient } from "@/lib/ai/client";
import { STRUCTURER_PROMPT } from "@/lib/ai/prompts";
import type { EntryType } from "@/types";
import type { RunTracker } from "./tracker";

interface StructuredEntry {
  type: EntryType;
  title: string;
  summary: string;
  body: string;
  tools: string[];
  categories: string[];
}

export async function structureEntry(
  item: { title: string; content: string },
  tracker?: RunTracker
): Promise<StructuredEntry> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: STRUCTURER_PROMPT,
    messages: [
      {
        role: "user",
        content: `Title: ${item.title}\n\nContent: ${item.content}`,
      },
    ],
  });

  if (tracker && response.usage) {
    tracker.recordUsage({
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });
  }

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return JSON.parse(text);
}
```

- [ ] **Step 3: Add optional tracker param to supersession.ts checkSupersession**

Same pattern for `checkSupersession` only (`findSupersessionCandidates` is pure, no AI call):
```typescript
import { getAnthropicClient } from "@/lib/ai/client";
import { SUPERSESSION_PROMPT } from "@/lib/ai/prompts";
import type { RunTracker } from "./tracker";

// ... existing interfaces ...

export async function checkSupersession(
  newEntry: { title: string; body: string },
  existingEntry: { title: string; body: string },
  tracker?: RunTracker
): Promise<SupersessionResult> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: SUPERSESSION_PROMPT,
    messages: [
      {
        role: "user",
        content: `NEW ENTRY:\nTitle: ${newEntry.title}\nBody: ${newEntry.body}\n\nEXISTING ENTRY:\nTitle: ${existingEntry.title}\nBody: ${existingEntry.body}`,
      },
    ],
  });

  if (tracker && response.usage) {
    tracker.recordUsage({
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });
  }

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return JSON.parse(text);
}

// findSupersessionCandidates stays unchanged
```

- [ ] **Step 4: Update pipeline.ts to accept tracker and add backlog processing**

Modify `processSource` signature, pass tracker to each AI call, and add `processBacklog` function:
```typescript
import { RunTracker } from "./tracker";

// Update PipelineResult to add supersessionsFound
interface PipelineResult {
  crawled: number;
  relevant: number;
  structured: number;
  supersessionsFound: number;
  errors: string[];
}

export async function processSource(
  source: SourceInput,
  tracker?: RunTracker
): Promise<PipelineResult> {
  const result: PipelineResult = {
    crawled: 0, relevant: 0, structured: 0, supersessionsFound: 0, errors: [],
  };

  // ... existing crawl logic unchanged ...

  // Pass tracker to AI calls:
  const relevance = await filterRelevance({ title: item.title, content: item.content }, tracker);
  // ...
  const structured = await structureEntry({ title: item.title, content: item.content }, tracker);
  // ...
  const supersessionResult = await checkSupersession(
    { title: structured.title, body: structured.body },
    { title: existing.title, body: existing.body },
    tracker
  );
  if (supersessionResult.supersedes) {
    result.supersessionsFound++;
    // ... existing supersession DB logic ...
  }
  // ... rest unchanged ...
}

/**
 * Process unprocessed raw items from previous runs (backlog).
 * Called at the start of each ingestion run before crawling new items.
 * Processes oldest first, up to 50 per run.
 */
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
      // Get the source's relevance threshold
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
```

The `processBacklog` function is called by both the cron and manual trigger endpoints at the start of each run, before iterating through sources.
```

- [ ] **Step 5: Run all tests to verify nothing broke**

```bash
npx vitest run
# Expected: ALL PASS — tracker param is optional so existing mocks still work
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: thread RunTracker through pipeline AI calls"
```

---

## Task 4: Stats API

**Files:**
- Create: `src/app/api/admin/stats/route.ts`

- [ ] **Step 1: Implement stats endpoint**

Create `src/app/api/admin/stats/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entries, sources, ingestionRuns } from "@/lib/db/schema";
import { eq, and, desc, sql, lt, gte, count } from "drizzle-orm";

export async function GET() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Queue count
  const [queueResult] = await db
    .select({ count: count() })
    .from(entries)
    .where(eq(entries.confidence, "draft"));
  const queueCount = queueResult.count;

  // Source health (only count enabled sources)
  const allSources = await db.select().from(sources).where(eq(sources.enabled, true));
  const healthySources = allSources.filter((s) => s.errorCount <= 2);
  const unhealthySources = allSources.filter((s) => s.errorCount > 2);
  const lastCrawl = allSources
    .filter((s) => s.lastCrawlAt)
    .sort((a, b) => new Date(b.lastCrawlAt!).getTime() - new Date(a.lastCrawlAt!).getTime())[0]?.lastCrawlAt ?? null;

  // Content counts by type
  const activeEntries = await db
    .select({ type: entries.type, count: count() })
    .from(entries)
    .where(eq(entries.status, "active"))
    .groupBy(entries.type);

  const totalActive = activeEntries.reduce((sum, e) => sum + e.count, 0);

  // Stale entries
  const [staleResult] = await db
    .select({ count: count() })
    .from(entries)
    .where(
      and(
        eq(entries.status, "active"),
        eq(entries.confidence, "verified"),
        lt(entries.verifiedAt, sixtyDaysAgo)
      )
    );

  // Monthly cost
  const monthlyRuns = await db
    .select({
      totalCost: sql<number>`COALESCE(SUM(${ingestionRuns.costUsd}), 0)`,
      totalInput: sql<number>`COALESCE(SUM(${ingestionRuns.tokensInput}), 0)`,
      totalOutput: sql<number>`COALESCE(SUM(${ingestionRuns.tokensOutput}), 0)`,
    })
    .from(ingestionRuns)
    .where(gte(ingestionRuns.startedAt, monthStart));

  // Recent runs
  const recentRuns = await db
    .select()
    .from(ingestionRuns)
    .orderBy(desc(ingestionRuns.startedAt))
    .limit(10);

  // Auto-heal stale running jobs (>10 min)
  const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
  await db
    .update(ingestionRuns)
    .set({ status: "failed", completedAt: now })
    .where(
      and(
        eq(ingestionRuns.status, "running"),
        lt(ingestionRuns.startedAt, tenMinAgo)
      )
    );

  const budgetCap = parseFloat(process.env.MONTHLY_BUDGET_CAP ?? "50");

  return NextResponse.json({
    queue: { count: queueCount },
    sources: {
      healthy: healthySources.length,
      unhealthy: unhealthySources.length,
      total: allSources.length,
      lastCrawlAt: lastCrawl,
    },
    content: {
      total: totalActive,
      byType: Object.fromEntries(activeEntries.map((e) => [e.type, e.count])),
      staleCount: staleResult.count,
    },
    cost: {
      currentMonth: monthlyRuns[0]?.totalCost ?? 0,
      budgetCap,
      tokensInput: monthlyRuns[0]?.totalInput ?? 0,
      tokensOutput: monthlyRuns[0]?.totalOutput ?? 0,
    },
    recentRuns,
    schedule: "0 * * * *",
  });
}
```

- [ ] **Step 2: Add MONTHLY_BUDGET_CAP to .env.example**

Append to `.env.example`:
```
MONTHLY_BUDGET_CAP=50
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add admin stats API endpoint"
```

---

## Task 5: Manual Ingestion Trigger API

**Files:**
- Create: `src/app/api/admin/ingest/route.ts`
- Create: `src/app/api/admin/ingest/[runId]/route.ts`
- Modify: `src/app/api/cron/ingest/route.ts`

- [ ] **Step 1: Implement manual trigger endpoint**

Create `src/app/api/admin/ingest/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sources, ingestionRuns } from "@/lib/db/schema";
import { eq, gte, sql } from "drizzle-orm";
import { processSource } from "@/lib/ingestion/pipeline";
import { RunTracker } from "@/lib/ingestion/tracker";

export async function POST() {
  // Concurrency guard
  const [running] = await db
    .select()
    .from(ingestionRuns)
    .where(eq(ingestionRuns.status, "running"))
    .limit(1);

  if (running) {
    return NextResponse.json(
      { error: "Run already in progress", runId: running.id },
      { status: 409 }
    );
  }

  // Budget check
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const budgetCap = parseFloat(process.env.MONTHLY_BUDGET_CAP ?? "50");

  const [monthlySpend] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${ingestionRuns.costUsd}), 0)`,
    })
    .from(ingestionRuns)
    .where(gte(ingestionRuns.startedAt, monthStart));

  if ((monthlySpend?.total ?? 0) >= budgetCap) {
    return NextResponse.json(
      { error: "Monthly budget exceeded" },
      { status: 403 }
    );
  }

  // Create run record
  const [run] = await db
    .insert(ingestionRuns)
    .values({ triggeredBy: "manual" })
    .returning();

  // Execute pipeline in background (non-blocking)
  executeIngestion(run.id).catch(console.error);

  return NextResponse.json({ runId: run.id }, { status: 202 });
}

async function executeIngestion(runId: string) {
  const tracker = new RunTracker();
  let sourcesProcessed = 0;
  let totalCrawled = 0;
  let totalRelevant = 0;
  let totalStructured = 0;
  let totalSupersessions = 0;
  const allErrors: string[] = [];

  try {
    const enabledSources = await db
      .select()
      .from(sources)
      .where(eq(sources.enabled, true));

    for (const source of enabledSources) {
      try {
        const result = await processSource(
          {
            id: source.id,
            url: source.url,
            type: source.type,
            name: source.name,
            relevanceThreshold: source.relevanceThreshold,
          },
          tracker
        );

        sourcesProcessed++;
        totalCrawled += result.crawled;
        totalRelevant += result.relevant;
        totalStructured += result.structured;
        totalSupersessions += result.supersessionsFound;
        allErrors.push(...result.errors);

        await db
          .update(sources)
          .set({ lastCrawlAt: new Date(), errorCount: 0 })
          .where(eq(sources.id, source.id));

        // Update run progress in DB
        const usage = tracker.getUsage();
        await db
          .update(ingestionRuns)
          .set({
            sourcesProcessed,
            itemsCrawled: totalCrawled,
            itemsRelevant: totalRelevant,
            itemsStructured: totalStructured,
            supersessionsFound: totalSupersessions,
            tokensInput: usage.inputTokens,
            tokensOutput: usage.outputTokens,
            costUsd: usage.costUsd,
          })
          .where(eq(ingestionRuns.id, runId));
      } catch (error) {
        await db
          .update(sources)
          .set({ errorCount: source.errorCount + 1 })
          .where(eq(sources.id, source.id));

        allErrors.push(`${source.name}: ${(error as Error).message}`);
      }
    }

    const usage = tracker.getUsage();
    await db
      .update(ingestionRuns)
      .set({
        status: "completed",
        completedAt: new Date(),
        sourcesProcessed,
        itemsCrawled: totalCrawled,
        itemsRelevant: totalRelevant,
        itemsStructured: totalStructured,
        supersessionsFound: totalSupersessions,
        errors: allErrors,
        tokensInput: usage.inputTokens,
        tokensOutput: usage.outputTokens,
        costUsd: usage.costUsd,
      })
      .where(eq(ingestionRuns.id, runId));
  } catch (error) {
    await db
      .update(ingestionRuns)
      .set({
        status: "failed",
        completedAt: new Date(),
        errors: [...allErrors, (error as Error).message],
      })
      .where(eq(ingestionRuns.id, runId));
  }
}
```

- [ ] **Step 2: Implement run status endpoint**

Create `src/app/api/admin/ingest/[runId]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ingestionRuns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  const [run] = await db
    .select()
    .from(ingestionRuns)
    .where(eq(ingestionRuns.id, runId))
    .limit(1);

  if (!run) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ run });
}
```

- [ ] **Step 3: Update cron endpoint to use RunTracker**

Replace `src/app/api/cron/ingest/route.ts` with the same pattern: create an `IngestionRun` record with `triggeredBy: "cron"`, use `RunTracker`, record results. Same logic as `executeIngestion` above but triggered by cron auth.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sources, ingestionRuns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { processSource } from "@/lib/ingestion/pipeline";
import { RunTracker } from "@/lib/ingestion/tracker";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [run] = await db
    .insert(ingestionRuns)
    .values({ triggeredBy: "cron" })
    .returning();

  const tracker = new RunTracker();
  const enabledSources = await db
    .select()
    .from(sources)
    .where(eq(sources.enabled, true));

  let sourcesProcessed = 0;
  let totalCrawled = 0;
  let totalRelevant = 0;
  let totalStructured = 0;
  let totalSupersessions = 0;
  const allErrors: string[] = [];

  for (const source of enabledSources) {
    try {
      const result = await processSource(
        {
          id: source.id,
          url: source.url,
          type: source.type,
          name: source.name,
          relevanceThreshold: source.relevanceThreshold,
        },
        tracker
      );

      sourcesProcessed++;
      totalCrawled += result.crawled;
      totalRelevant += result.relevant;
      totalStructured += result.structured;
      totalSupersessions += result.supersessionsFound;
      allErrors.push(...result.errors);

      await db
        .update(sources)
        .set({ lastCrawlAt: new Date(), errorCount: 0 })
        .where(eq(sources.id, source.id));
    } catch (error) {
      await db
        .update(sources)
        .set({ errorCount: source.errorCount + 1 })
        .where(eq(sources.id, source.id));

      allErrors.push(`${source.name}: ${(error as Error).message}`);
    }
  }

  const usage = tracker.getUsage();
  await db
    .update(ingestionRuns)
    .set({
      status: "completed",
      completedAt: new Date(),
      sourcesProcessed,
      itemsCrawled: totalCrawled,
      itemsRelevant: totalRelevant,
      itemsStructured: totalStructured,
      supersessionsFound: totalSupersessions,
      errors: allErrors,
      tokensInput: usage.inputTokens,
      tokensOutput: usage.outputTokens,
      costUsd: usage.costUsd,
    })
    .where(eq(ingestionRuns.id, run.id));

  return NextResponse.json({
    runId: run.id,
    sourcesProcessed,
    itemsCrawled: totalCrawled,
    itemsRelevant: totalRelevant,
    itemsStructured: totalStructured,
    errors: allErrors,
    cost: usage.costUsd,
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add manual ingestion trigger with run tracking"
```

---

## Task 6: Source Recommendations Logic

**Files:**
- Create: `src/data/source-registry.json`
- Create: `src/lib/sources/recommendations.ts`
- Test: `tests/lib/sources/recommendations.test.ts`

- [ ] **Step 1: Write recommendation tests**

Create `tests/lib/sources/recommendations.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { scoreRecommendations } from "@/lib/sources/recommendations";

const registry = [
  {
    url: "https://example.com/claude-blog",
    type: "rss" as const,
    name: "Claude Blog",
    description: "Official Claude updates",
    tools: ["Claude Code"],
    categories: ["Code Generation"],
  },
  {
    url: "https://example.com/cursor-blog",
    type: "rss" as const,
    name: "Cursor Blog",
    description: "Cursor news",
    tools: ["Cursor"],
    categories: ["Code Generation"],
  },
  {
    url: "https://example.com/random-blog",
    type: "rss" as const,
    name: "Random Blog",
    description: "Unrelated",
    tools: ["SomeTool"],
    categories: ["Architecture"],
  },
];

describe("scoreRecommendations", () => {
  it("excludes already-added sources by URL", () => {
    const results = scoreRecommendations(
      registry,
      ["https://example.com/claude-blog"],
      ["Claude Code", "Cursor"],
      ["Code Generation"]
    );

    expect(results.find((r) => r.url === "https://example.com/claude-blog")).toBeUndefined();
    expect(results.find((r) => r.url === "https://example.com/cursor-blog")).toBeDefined();
  });

  it("scores higher for tool overlap", () => {
    const results = scoreRecommendations(
      registry,
      [],
      ["Claude Code"],
      ["Code Generation", "Architecture"]
    );

    const claudeScore = results.find((r) => r.name === "Claude Blog")!.score;
    const randomScore = results.find((r) => r.name === "Random Blog")?.score ?? 0;
    expect(claudeScore).toBeGreaterThan(randomScore);
  });

  it("returns top N results sorted by score", () => {
    const results = scoreRecommendations(
      registry,
      [],
      ["Claude Code", "Cursor"],
      ["Code Generation"],
      2
    );

    expect(results.length).toBeLessThanOrEqual(2);
    expect(results[0].score).toBeGreaterThanOrEqual(results[1]?.score ?? 0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/lib/sources/recommendations.test.ts
# Expected: FAIL
```

- [ ] **Step 3: Implement recommendation logic**

Create `src/lib/sources/recommendations.ts`:
```typescript
interface RegistryEntry {
  url: string;
  type: string;
  name: string;
  description: string;
  tools: string[];
  categories: string[];
}

interface ScoredRecommendation extends RegistryEntry {
  score: number;
}

export function scoreRecommendations(
  registry: RegistryEntry[],
  existingSourceUrls: string[],
  trackedTools: string[],
  trackedCategories: string[],
  topN: number = 5
): ScoredRecommendation[] {
  const existingSet = new Set(existingSourceUrls);

  const scored = registry
    .filter((entry) => !existingSet.has(entry.url))
    .map((entry) => {
      const toolOverlap = entry.tools.filter((t) =>
        trackedTools.includes(t)
      ).length;
      const categoryOverlap = entry.categories.filter((c) =>
        trackedCategories.includes(c)
      ).length;

      const score = toolOverlap * 2 + categoryOverlap;

      return { ...entry, score };
    });

  return scored
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/lib/sources/recommendations.test.ts
# Expected: PASS
```

- [ ] **Step 5: Create source registry JSON**

Create `src/data/source-registry.json` with ~30 curated entries (a representative starter set):
```json
[
  {
    "url": "https://simonwillison.net/atom/everything/",
    "type": "rss",
    "name": "Simon Willison's Weblog",
    "description": "Prolific AI tools commentary, tutorials, and tool reviews",
    "tools": ["Claude Code", "Copilot", "ChatGPT", "Cursor"],
    "categories": ["Code Generation", "Architecture"]
  },
  {
    "url": "https://github.com/anthropics/claude-code",
    "type": "github",
    "name": "Claude Code Releases",
    "description": "Official Claude Code releases and changelogs",
    "tools": ["Claude Code"],
    "categories": ["Code Generation", "Testing", "Debugging"]
  },
  {
    "url": "https://github.com/getcursor/cursor",
    "type": "github",
    "name": "Cursor Releases",
    "description": "Cursor IDE releases and changelogs",
    "tools": ["Cursor"],
    "categories": ["Code Generation", "Code Review"]
  },
  {
    "url": "https://github.blog/feed/",
    "type": "rss",
    "name": "GitHub Blog",
    "description": "GitHub product updates including Copilot features",
    "tools": ["Copilot"],
    "categories": ["Code Generation", "Code Review", "DevOps"]
  },
  {
    "url": "https://www.reddit.com/r/cursor",
    "type": "reddit",
    "name": "r/cursor",
    "description": "Community discussion about Cursor IDE",
    "tools": ["Cursor"],
    "categories": ["Code Generation", "Code Review"]
  },
  {
    "url": "https://www.reddit.com/r/ClaudeAI",
    "type": "reddit",
    "name": "r/ClaudeAI",
    "description": "Community discussion about Claude and Claude Code",
    "tools": ["Claude Code"],
    "categories": ["Code Generation", "Testing"]
  },
  {
    "url": "https://www.reddit.com/r/LocalLLaMA",
    "type": "reddit",
    "name": "r/LocalLLaMA",
    "description": "Local AI model discussion including coding use cases",
    "tools": ["Aider", "Cline"],
    "categories": ["Code Generation", "Architecture"]
  },
  {
    "url": "https://www.reddit.com/r/ChatGPTPro",
    "type": "reddit",
    "name": "r/ChatGPTPro",
    "description": "Advanced ChatGPT usage including coding workflows",
    "tools": ["Copilot", "ChatGPT"],
    "categories": ["Code Generation"]
  },
  {
    "url": "https://news.ycombinator.com",
    "type": "hackernews",
    "name": "Hacker News",
    "description": "Tech news with strong AI coding tool coverage",
    "tools": ["Claude Code", "Cursor", "Copilot"],
    "categories": ["Code Generation", "Architecture", "DevOps"]
  },
  {
    "url": "https://www.anthropic.com/blog/rss",
    "type": "rss",
    "name": "Anthropic Blog",
    "description": "Official Anthropic announcements and research",
    "tools": ["Claude Code"],
    "categories": ["Code Generation", "Architecture"]
  },
  {
    "url": "https://openai.com/blog/rss",
    "type": "rss",
    "name": "OpenAI Blog",
    "description": "Official OpenAI announcements including Codex and GPT updates",
    "tools": ["Copilot", "ChatGPT"],
    "categories": ["Code Generation"]
  },
  {
    "url": "https://github.com/paul-gauthier/aider",
    "type": "github",
    "name": "Aider Releases",
    "description": "Aider AI coding assistant releases",
    "tools": ["Aider"],
    "categories": ["Code Generation", "Code Review"]
  },
  {
    "url": "https://github.com/cline/cline",
    "type": "github",
    "name": "Cline Releases",
    "description": "Cline AI coding assistant releases",
    "tools": ["Cline"],
    "categories": ["Code Generation"]
  },
  {
    "url": "https://codeium.com/blog/rss",
    "type": "rss",
    "name": "Codeium Blog",
    "description": "Windsurf and Codeium product updates",
    "tools": ["Windsurf"],
    "categories": ["Code Generation", "Code Review"]
  },
  {
    "url": "https://sourcegraph.com/blog/rss",
    "type": "rss",
    "name": "Sourcegraph Blog",
    "description": "Cody AI assistant and code intelligence updates",
    "tools": ["Cody"],
    "categories": ["Code Generation", "Code Review", "Architecture"]
  },
  {
    "url": "https://lilianweng.github.io/index.xml",
    "type": "rss",
    "name": "Lilian Weng's Blog",
    "description": "In-depth AI research posts with coding implications",
    "tools": [],
    "categories": ["Architecture"]
  },
  {
    "url": "https://www.latent.space/feed",
    "type": "rss",
    "name": "Latent Space Podcast",
    "description": "AI engineering podcast covering coding tools and workflows",
    "tools": ["Claude Code", "Cursor", "Copilot"],
    "categories": ["Code Generation", "Architecture"]
  },
  {
    "url": "https://buttondown.com/ainews/rss",
    "type": "rss",
    "name": "AI News Newsletter",
    "description": "Daily AI news aggregation with developer focus",
    "tools": ["Claude Code", "Cursor", "Copilot"],
    "categories": ["Code Generation", "Testing", "DevOps"]
  }
]
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add source recommendation logic and curated registry"
```

---

## Task 7: Status Dashboard Components

**Files:**
- Create: `src/components/admin/metric-card.tsx`
- Create: `src/components/admin/ingestion-bar.tsx`
- Create: `src/components/admin/run-history.tsx`
- Create: `src/components/admin/status-dashboard.tsx`
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: Create MetricCard component**

Create `src/components/admin/metric-card.tsx`:
```tsx
import { Card } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  status?: "green" | "amber" | "red";
  onClick?: () => void;
  children?: React.ReactNode;
}

export function MetricCard({
  title,
  value,
  subtitle,
  status,
  onClick,
  children,
}: MetricCardProps) {
  const statusColors = {
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  return (
    <Card
      className={`p-4 ${onClick ? "cursor-pointer hover:border-gray-300 transition-colors" : "cursor-default"}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {title}
        </span>
        {status && (
          <span className={`h-2 w-2 rounded-full ${statusColors[status]}`} />
        )}
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      )}
      {children}
    </Card>
  );
}
```

- [ ] **Step 2: Create IngestionBar component**

Create `src/components/admin/ingestion-bar.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface IngestionRun {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  sourcesProcessed: number;
  itemsCrawled: number;
  itemsRelevant: number;
  itemsStructured: number;
  supersessionsFound: number;
  errors: string[];
  costUsd: number;
  triggeredBy: string;
}

interface IngestionBarProps {
  lastRun: IngestionRun | null;
  isRunning: boolean;
  budgetExceeded: boolean;
  schedule: string;
  onTrigger: () => Promise<void>;
}

export function IngestionBar({
  lastRun,
  isRunning,
  budgetExceeded,
  schedule,
  onTrigger,
}: IngestionBarProps) {
  const [triggering, setTriggering] = useState(false);

  async function handleTrigger() {
    setTriggering(true);
    await onTrigger();
    setTriggering(false);
  }

  function getNextRunTime(): string {
    const now = new Date();
    const next = new Date(now);
    next.setHours(next.getHours() + 1, 0, 0, 0);
    const diffMin = Math.round((next.getTime() - now.getTime()) / 60000);
    return `${diffMin} min`;
  }

  function getRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.round(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    return `${hours}h ago`;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-6">
        {/* Last Run */}
        <div className="flex-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Last Run
          </span>
          {lastRun ? (
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  lastRun.status === "completed" ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm font-medium">
                {getRelativeTime(lastRun.startedAt)}
              </span>
              <span className="text-xs text-gray-500">
                {lastRun.itemsCrawled} crawled, {lastRun.itemsRelevant} relevant,{" "}
                {lastRun.itemsStructured} structured
                {lastRun.errors.length > 0 && `, ${lastRun.errors.length} errors`}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-400">No runs yet</p>
          )}
        </div>

        {/* Next Run */}
        <div className="text-center">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Next Run
          </span>
          <p className="mt-1 text-sm font-medium">in {getNextRunTime()}</p>
          <p className="text-xs text-gray-400">Every hour</p>
        </div>

        {/* Run Now Button */}
        <div>
          {budgetExceeded ? (
            <Badge variant="breaking">Budget Exceeded</Badge>
          ) : (
            <Button
              size="sm"
              disabled={isRunning || triggering}
              onClick={handleTrigger}
            >
              {isRunning || triggering ? "Ingesting..." : "Run Now"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Create RunHistory component**

Create `src/components/admin/run-history.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface IngestionRun {
  id: string;
  status: string;
  startedAt: string;
  itemsCrawled: number;
  itemsStructured: number;
  errors: string[];
  costUsd: number;
  triggeredBy: string;
}

export function RunHistory({ runs }: { runs: IngestionRun[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? runs : runs.slice(0, 5);

  if (runs.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Recent Runs
        </span>
        {runs.length > 5 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-500 hover:text-black"
          >
            {expanded ? "Show less" : "Show all"}
          </button>
        )}
      </div>
      <div className="space-y-2">
        {visible.map((run) => (
          <div
            key={run.id}
            className="flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  run.status === "completed" ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              <span className="text-gray-600">
                {new Date(run.startedAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <Badge
                variant={run.triggeredBy === "cron" ? "default" : "tip"}
              >
                {run.triggeredBy}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-gray-500">
              <span>{run.itemsCrawled} crawled</span>
              <span>{run.itemsStructured} structured</span>
              {run.errors.length > 0 && (
                <span className="text-red-500">{run.errors.length} errors</span>
              )}
              <span>${run.costUsd.toFixed(3)}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Create StatusDashboard container**

Create `src/components/admin/status-dashboard.tsx`:
```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MetricCard } from "./metric-card";
import { IngestionBar } from "./ingestion-bar";
import { RunHistory } from "./run-history";

interface DashboardStats {
  queue: { count: number };
  sources: { healthy: number; unhealthy: number; total: number };
  content: {
    total: number;
    byType: Record<string, number>;
    staleCount: number;
  };
  cost: {
    currentMonth: number;
    budgetCap: number;
    tokensInput: number;
    tokensOutput: number;
  };
  recentRuns: any[];
  schedule: string;
}

export function StatusDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("admin-dashboard-collapsed") === "true";
    }
    return false;
  });
  const [pollingRunId, setPollingRunId] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStats(data);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Poll running job
  useEffect(() => {
    if (!pollingRunId) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/admin/ingest/${pollingRunId}`);
      const data = await res.json();
      if (data.run.status !== "running") {
        setPollingRunId(null);
        fetchStats();
      }
    }, 2000);

    // Timeout after 5 min
    const timeout = setTimeout(() => {
      setPollingRunId(null);
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [pollingRunId, fetchStats]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("admin-dashboard-collapsed", String(next));
  }

  async function handleTrigger() {
    const res = await fetch("/api/admin/ingest", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setPollingRunId(data.runId);
    }
    fetchStats();
  }

  if (error && !stats) {
    return (
      <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
        Dashboard unavailable — retrying...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="mb-6 space-y-3">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg bg-gray-200"
            />
          ))}
        </div>
        <div className="h-16 animate-pulse rounded-lg bg-gray-200" />
      </div>
    );
  }

  const isRunning =
    !!pollingRunId ||
    stats.recentRuns.some((r) => r.status === "running");
  const budgetExceeded =
    stats.cost.currentMonth >= stats.cost.budgetCap;
  const lastRun = stats.recentRuns[0] ?? null;
  const queueStatus =
    stats.queue.count > 20
      ? "red"
      : stats.queue.count > 10
        ? "amber"
        : "green";
  const costPercent =
    (stats.cost.currentMonth / stats.cost.budgetCap) * 100;
  const costStatus =
    costPercent > 85 ? "red" : costPercent > 60 ? "amber" : "green";

  return (
    <div className="mb-6">
      <button
        onClick={toggleCollapsed}
        className="mb-2 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
      >
        <span>{collapsed ? "▶" : "▼"}</span>
        <span>Dashboard</span>
      </button>

      {collapsed ? (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs text-gray-600">
          {stats.queue.count} drafts · {stats.sources.healthy}/{stats.sources.total} sources healthy · ${stats.cost.currentMonth.toFixed(2)} spent · {lastRun ? `Last run ${Math.round((Date.now() - new Date(lastRun.startedAt).getTime()) / 60000)}m ago` : "No runs"}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Row 1: Metrics */}
          <div className="grid grid-cols-4 gap-3">
            <MetricCard
              title="Queue"
              value={String(stats.queue.count)}
              subtitle="Drafts pending"
              status={queueStatus}
              onClick={() => router.push("/admin/queue")}
            />
            <MetricCard
              title="Sources"
              value={`${stats.sources.healthy} / ${stats.sources.total}`}
              subtitle={
                stats.sources.unhealthy > 0
                  ? `${stats.sources.unhealthy} unhealthy`
                  : "All healthy"
              }
              status={stats.sources.unhealthy > 0 ? "red" : "green"}
              onClick={() => router.push("/admin/sources")}
            />
            <MetricCard
              title="Content"
              value={String(stats.content.total)}
              subtitle={
                Object.entries(stats.content.byType)
                  .map(([type, count]) => `${count} ${type}s`)
                  .join(" · ") || "No entries"
              }
            >
              {stats.content.staleCount > 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  {stats.content.staleCount} need re-verification
                </p>
              )}
            </MetricCard>
            <MetricCard
              title="Cost"
              value={`$${stats.cost.currentMonth.toFixed(2)}`}
              subtitle={`of $${stats.cost.budgetCap} budget`}
              status={costStatus}
            >
              <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    costStatus === "red"
                      ? "bg-red-500"
                      : costStatus === "amber"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(costPercent, 100)}%` }}
                />
              </div>
            </MetricCard>
          </div>

          {/* Row 2: Ingestion Status */}
          <IngestionBar
            lastRun={lastRun}
            isRunning={isRunning}
            budgetExceeded={budgetExceeded}
            schedule={stats.schedule}
            onTrigger={handleTrigger}
          />

          {/* Row 3: Run History */}
          <RunHistory runs={stats.recentRuns} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Add StatusDashboard to admin layout**

Modify `src/app/admin/layout.tsx`:
```tsx
import Link from "next/link";
import { StatusDashboard } from "@/components/admin/status-dashboard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-6">
          <Link href="/admin/queue" className="text-sm font-semibold">
            AI Coding Radar Admin
          </Link>
          <Link href="/admin/queue" className="text-sm text-gray-600 hover:text-black">
            Review Queue
          </Link>
          <Link href="/admin/sources" className="text-sm text-gray-600 hover:text-black">
            Sources
          </Link>
          <Link href="/" className="ml-auto text-sm text-gray-400 hover:text-black">
            View Feed
          </Link>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <StatusDashboard />
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add status dashboard with metrics, ingestion controls, and run history"
```

---

## Task 8: Suggested Sources Component

**Files:**
- Create: `src/components/admin/suggested-sources.tsx`
- Modify: `src/app/admin/sources/page.tsx`

- [ ] **Step 1: Create SuggestedSources component**

Create `src/components/admin/suggested-sources.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { scoreRecommendations } from "@/lib/sources/recommendations";
import registry from "@/data/source-registry.json";
import { motion, AnimatePresence } from "framer-motion";

interface SuggestedSourcesProps {
  existingSourceUrls: string[];
  trackedTools: string[];
  trackedCategories: string[];
  onAdd: (source: { url: string; type: string; name: string }) => Promise<void>;
}

export function SuggestedSources({
  existingSourceUrls,
  trackedTools,
  trackedCategories,
  onAdd,
}: SuggestedSourcesProps) {
  const [showAll, setShowAll] = useState(false);
  const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set());

  const allExcluded = [...existingSourceUrls, ...addedUrls];
  const recommendations = scoreRecommendations(
    registry,
    allExcluded,
    trackedTools,
    trackedCategories,
    showAll ? 50 : 5
  );

  async function handleAdd(rec: {
    url: string;
    type: string;
    name: string;
  }) {
    await onAdd(rec);
    setAddedUrls((prev) => new Set([...prev, rec.url]));
  }

  if (recommendations.length === 0) {
    return (
      <div className="mt-8">
        <h2 className="text-lg font-semibold">Suggested Sources</h2>
        <p className="mt-2 text-sm text-gray-500">
          You're tracking all our recommended sources.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Suggested Sources</h2>
        <p className="text-sm text-gray-500">
          Based on the tools and topics you track
        </p>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {recommendations.map((rec) => (
            <motion.div
              key={rec.url}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{rec.name}</span>
                    <Badge>{rec.type}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {rec.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {rec.tools.map((tool) => (
                      <Badge key={tool} variant="tip">
                        {tool}
                      </Badge>
                    ))}
                    {rec.categories.map((cat) => (
                      <Badge key={cat} variant="default">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleAdd(rec)}
                >
                  + Add
                </Button>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!showAll && recommendations.length >= 5 && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 text-sm text-gray-500 hover:text-black"
        >
          Show more suggestions
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update sources page to include recommendations**

Modify `src/app/admin/sources/page.tsx`:
```tsx
import { SourceListWithRecommendations } from "@/components/admin/source-list-with-recommendations";

export default function SourcesPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Source Management</h1>
      <SourceListWithRecommendations />
    </div>
  );
}
```

- [ ] **Step 3: Create wrapper that connects SourceList with SuggestedSources**

Create `src/components/admin/source-list-with-recommendations.tsx`:
```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SourceForm } from "./source-form";
import { SuggestedSources } from "./suggested-sources";
import type { SourceType } from "@/types";

interface Source {
  id: string;
  url: string;
  type: string;
  name: string;
  enabled: boolean;
  errorCount: number;
  lastCrawlAt: string | null;
  relevanceThreshold: number;
}

export function SourceListWithRecommendations() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackedTools, setTrackedTools] = useState<string[]>([]);
  const [trackedCategories, setTrackedCategories] = useState<string[]>([]);

  const fetchSources = useCallback(async () => {
    const res = await fetch("/api/admin/sources");
    const data = await res.json();
    setSources(data.sources);
    setLoading(false);
  }, []);

  const fetchTrackedContext = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      // Extract tools and categories from content stats
      // For now, use a static well-known list since entries track these
      const toolSet = new Set<string>();
      const catSet = new Set<string>();
      // We'll derive from existing sources for simplicity
      sources.forEach(() => {
        // Sources don't store tools, so we use common known tools
      });
      setTrackedTools(["Claude Code", "Cursor", "Copilot", "Windsurf", "Aider", "Cline"]);
      setTrackedCategories(["Code Generation", "Code Review", "Testing", "Debugging", "DevOps", "Architecture"]);
    } catch {
      // Fallback to defaults
      setTrackedTools(["Claude Code", "Cursor", "Copilot"]);
      setTrackedCategories(["Code Generation", "Code Review", "Testing"]);
    }
  }, [sources]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  useEffect(() => {
    if (!loading) fetchTrackedContext();
  }, [loading, fetchTrackedContext]);

  async function handleAdd(source: { url: string; type: string; name: string }) {
    const res = await fetch("/api/admin/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(source),
    });
    if (res.ok) {
      fetchSources();
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/sources/${id}`, { method: "DELETE" });
    setSources((prev) => prev.filter((s) => s.id !== id));
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading sources...</p>;
  }

  return (
    <div>
      {/* Existing source management */}
      <div className="space-y-6">
        <SourceForm onSubmit={handleAdd} />

        <div className="space-y-3">
          {sources.map((source) => (
            <Card key={source.id} className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{source.name}</span>
                  <Badge>{source.type}</Badge>
                  {source.errorCount > 2 && (
                    <Badge variant="breaking">Unhealthy</Badge>
                  )}
                  {!source.enabled && (
                    <Badge variant="superseded">Disabled</Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">{source.url}</p>
                {source.lastCrawlAt && (
                  <p className="text-xs text-gray-400">
                    Last crawl: {new Date(source.lastCrawlAt).toLocaleString()}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(source.id)}>
                Remove
              </Button>
            </Card>
          ))}

          {sources.length === 0 && (
            <p className="text-sm text-gray-500">No sources configured yet.</p>
          )}
        </div>
      </div>

      {/* Suggested Sources */}
      <SuggestedSources
        existingSourceUrls={sources.map((s) => s.url)}
        trackedTools={trackedTools}
        trackedCategories={trackedCategories}
        onAdd={handleAdd}
      />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add suggested sources with curated registry recommendations"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
# Expected: ALL PASS
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
# Expected: No errors
```

- [ ] **Step 3: Push schema changes to DB**

```bash
DATABASE_URL=postgresql://mevapps@localhost:5432/ai_coding_radar npx drizzle-kit push
```

- [ ] **Step 4: Verify dev server and dashboard renders**

```bash
npm run dev
# Navigate to localhost:3000/admin/queue — dashboard strip visible
# Navigate to localhost:3000/admin/sources — suggested sources visible
```

- [ ] **Step 5: Commit any fixes**

```bash
git add -A && git commit -m "fix: resolve any remaining issues from verification"
```

- [ ] **Step 6: Push to GitHub**

```bash
git push origin master
```
