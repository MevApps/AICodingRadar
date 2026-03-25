# Pipeline & Editorial Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the ingestion pipeline for real-world reliability and tune editorial quality so 80%+ of AI-generated entries are publish-worthy with minimal edits.

**Architecture:** Pipeline-first approach — validate crawlers against real sources, harden dedup and error handling, add per-source structured logging, then iterate on AI prompts using real output. Add inline editing to admin queue with edit tracking for a quality feedback loop. All changes build on existing Drizzle ORM schema, Next.js API routes, and Anthropic Claude integration.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Drizzle ORM, PostgreSQL + pgvector, Anthropic Claude (claude-sonnet-4-6), Voyage AI embeddings, Vitest

**Spec:** `docs/superpowers/specs/2026-03-25-launch-ready-polish-design.md` (Sections 1-2)

---

## File Structure

### Files to Create

| File | Responsibility |
|------|---------------|
| `src/lib/ingestion/logger.ts` | Per-source, per-stage structured logging for pipeline runs |
| `src/lib/utils/json.ts` | Shared `extractJson` helper for robust AI response parsing |
| `src/lib/ingestion/dedup.ts` | Semantic deduplication via cosine similarity on embeddings |
| `src/app/api/admin/entries/[id]/edit/route.ts` | API route: edit entry fields before approving |
| `src/components/admin/queue-item-editor.tsx` | Inline edit form for draft entries in review queue |
| `tests/lib/ingestion/logger.test.ts` | Tests for structured logger |
| `tests/lib/utils/json.test.ts` | Tests for `extractJson` helper |
| `tests/lib/ingestion/dedup.test.ts` | Tests for semantic deduplication |
| `tests/lib/ingestion/prompts-validation.test.ts` | Tests validating prompt output structure |
| `tests/api/admin/entries-edit.test.ts` | Tests for entry edit API route |

### Files to Modify

| File | What Changes |
|------|-------------|
| `src/lib/db/schema.ts` | Add `editedFields` JSONB column to `entries` table; add `perSourceResults` JSONB column to `ingestionRuns` table |
| `src/lib/ingestion/pipeline.ts` | Integrate structured logger; add semantic dedup check before creating entries; return per-source results |
| `src/lib/ai/prompts.ts` | Improve `RELEVANCE_FILTER_PROMPT` and `STRUCTURER_PROMPT` for higher editorial quality |
| `src/lib/ingestion/relevance-filter.ts` | Use `extractJson` from utils, add score validation |
| `src/lib/ingestion/structurer.ts` | Use `extractJson` from utils, add field validation and coercion |
| `src/lib/ingestion/supersession.ts` | Use `extractJson` from utils, add field coercion |
| `src/app/api/admin/ingest/route.ts` | Use structured logger; store per-source results |
| `src/app/api/cron/ingest/route.ts` | Use structured logger; store per-source results |
| `src/app/api/admin/stats/route.ts` | Add response caching header |
| `src/components/admin/queue-item.tsx` | Add edit button and toggle to inline editor |
| `src/components/admin/queue-list.tsx` | Add edit state management, wire edit+approve action flow |
| `tests/lib/ingestion/pipeline.test.ts` | Add dedup and logger integration tests |

---

## Task 1: Add Per-Source Structured Logging

**Files:**
- Create: `src/lib/ingestion/logger.ts`
- Create: `tests/lib/ingestion/logger.test.ts`
- Modify: `src/lib/db/schema.ts:121-143` (add `perSourceResults` to `ingestionRuns`)

**Context:** The stats API shows aggregate numbers but there's no per-source visibility. When a crawl fails or a source produces garbage, you can't tell which one. This adds a `PipelineLogger` that collects per-source, per-stage results.

- [ ] **Step 1: Write failing test for PipelineLogger**

```typescript
// tests/lib/ingestion/logger.test.ts
import { describe, it, expect } from "vitest";
import { PipelineLogger } from "@/lib/ingestion/logger";

describe("PipelineLogger", () => {
  it("records per-source stage results", () => {
    const logger = new PipelineLogger();
    logger.startSource("source-1", "Test Blog");

    logger.recordCrawl("source-1", { itemsFound: 5, errors: [] });
    logger.recordRelevance("source-1", {
      itemsScored: 5,
      itemsPassed: 2,
      scores: [0.9, 0.8, 0.3, 0.2, 0.1],
    });
    logger.recordStructuring("source-1", { itemsStructured: 2, errors: [] });
    logger.recordSupersession("source-1", { checked: 2, found: 1 });

    const results = logger.getSourceResults();
    expect(results).toHaveLength(1);
    expect(results[0].sourceName).toBe("Test Blog");
    expect(results[0].crawl.itemsFound).toBe(5);
    expect(results[0].relevance.itemsPassed).toBe(2);
    expect(results[0].structuring.itemsStructured).toBe(2);
    expect(results[0].supersession.found).toBe(1);
  });

  it("handles multiple sources independently", () => {
    const logger = new PipelineLogger();
    logger.startSource("s1", "Blog A");
    logger.startSource("s2", "Blog B");
    logger.recordCrawl("s1", { itemsFound: 3, errors: [] });
    logger.recordCrawl("s2", { itemsFound: 7, errors: ["timeout"] });

    const results = logger.getSourceResults();
    expect(results).toHaveLength(2);
    expect(results.find((r) => r.sourceName === "Blog A")!.crawl.itemsFound).toBe(3);
    expect(results.find((r) => r.sourceName === "Blog B")!.crawl.errors).toEqual(["timeout"]);
  });

  it("produces a JSON-serializable summary", () => {
    const logger = new PipelineLogger();
    logger.startSource("s1", "Test");
    logger.recordCrawl("s1", { itemsFound: 1, errors: [] });
    const json = JSON.stringify(logger.getSourceResults());
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/ingestion/logger.test.ts`
Expected: FAIL — module `@/lib/ingestion/logger` not found

- [ ] **Step 3: Implement PipelineLogger**

```typescript
// src/lib/ingestion/logger.ts
interface CrawlResult {
  itemsFound: number;
  errors: string[];
}

interface RelevanceResult {
  itemsScored: number;
  itemsPassed: number;
  scores: number[];
}

interface StructuringResult {
  itemsStructured: number;
  errors: string[];
}

interface SupersessionResult {
  checked: number;
  found: number;
}

interface SourceResult {
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
    if (source) source.crawl = result;
  }

  recordRelevance(sourceId: string, result: RelevanceResult): void {
    const source = this.sources.get(sourceId);
    if (source) source.relevance = result;
  }

  recordStructuring(sourceId: string, result: StructuringResult): void {
    const source = this.sources.get(sourceId);
    if (source) source.structuring = result;
  }

  recordSupersession(sourceId: string, result: SupersessionResult): void {
    const source = this.sources.get(sourceId);
    if (source) source.supersession = result;
  }

  getSourceResults(): SourceResult[] {
    return Array.from(this.sources.values());
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/ingestion/logger.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Add `perSourceResults` column to `ingestionRuns` schema**

Modify `src/lib/db/schema.ts` — add after the `costUsd` field in the `ingestionRuns` table:

```typescript
    perSourceResults: jsonb("per_source_results"), // SourceResult[] — use jsonb for structured querying
```

- [ ] **Step 6: Run existing schema tests to verify no breakage**

Run: `npx vitest run tests/lib/db/schema.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/ingestion/logger.ts tests/lib/ingestion/logger.test.ts src/lib/db/schema.ts
git commit -m "feat: add PipelineLogger for per-source structured logging"
```

---

## Task 2: Harden AI Response Parsing

**Files:**
- Modify: `src/lib/ingestion/relevance-filter.ts`
- Modify: `src/lib/ingestion/structurer.ts`
- Modify: `src/lib/ingestion/supersession.ts:10-38`
- Modify: `tests/lib/ingestion/relevance-filter.test.ts`
- Modify: `tests/lib/ingestion/structurer.test.ts`
- Modify: `tests/lib/ingestion/supersession.test.ts`

**Context:** All three AI call sites do bare `JSON.parse(text)` with no error handling. If Claude returns malformed JSON (markdown fences, extra text, partial response), the pipeline crashes. This adds: extraction of JSON from markdown fences and field validation. The `extractJson` helper lives in `src/lib/utils/json.ts` since it's shared across relevance-filter, structurer, and supersession.

- [ ] **Step 1: Read existing tests for relevance-filter, structurer, and supersession**

Run: `cat tests/lib/ingestion/relevance-filter.test.ts tests/lib/ingestion/structurer.test.ts tests/lib/ingestion/supersession.test.ts`
Purpose: Understand existing test patterns before adding new ones.

- [ ] **Step 2: Write failing test for robust JSON extraction**

Create `tests/lib/utils/json.test.ts`:

```typescript
import { extractJson } from "@/lib/utils/json";

describe("extractJson", () => {
  it("parses clean JSON", () => {
    expect(extractJson('{"score": 0.8, "reason": "relevant"}')).toEqual({
      score: 0.8,
      reason: "relevant",
    });
  });

  it("extracts JSON from markdown code fences", () => {
    const input = '```json\n{"score": 0.8, "reason": "relevant"}\n```';
    expect(extractJson(input)).toEqual({ score: 0.8, reason: "relevant" });
  });

  it("extracts JSON from text with surrounding prose", () => {
    const input = 'Here is my analysis:\n{"score": 0.8, "reason": "relevant"}\nHope that helps!';
    expect(extractJson(input)).toEqual({ score: 0.8, reason: "relevant" });
  });

  it("throws on completely unparseable input", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/lib/utils/json.test.ts`
Expected: FAIL — module `@/lib/utils/json` not found

- [ ] **Step 4: Implement `extractJson` helper in shared utils**

Create `src/lib/utils/json.ts`:

```typescript
// src/lib/utils/json.ts
export function extractJson(text: string): Record<string, unknown> {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting from markdown code fences
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) {
      return JSON.parse(fenceMatch[1].trim());
    }
    // Try finding first { ... } block
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      return JSON.parse(braceMatch[0]);
    }
    throw new Error(`Could not extract JSON from: ${text.slice(0, 200)}`);
  }
}
```

- [ ] **Step 5: Run extractJson tests to verify they pass**

Run: `npx vitest run tests/lib/utils/json.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Update relevance-filter to use shared `extractJson`**

Replace `src/lib/ingestion/relevance-filter.ts` with:

```typescript
import { getAnthropicClient } from "@/lib/ai/client";
import { RELEVANCE_FILTER_PROMPT } from "@/lib/ai/prompts";
import { extractJson } from "@/lib/utils/json";
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
  const parsed = extractJson(text);

  const score = Number(parsed.score);
  if (isNaN(score) || score < 0 || score > 1) {
    throw new Error(`Invalid relevance score: ${parsed.score}`);
  }

  return {
    score,
    reason: String(parsed.reason ?? ""),
  };
}
```

- [ ] **Step 7: Update structurer with `extractJson` and field validation**

Replace `src/lib/ingestion/structurer.ts` with:

```typescript
import { getAnthropicClient } from "@/lib/ai/client";
import { STRUCTURER_PROMPT } from "@/lib/ai/prompts";
import { extractJson } from "@/lib/utils/json";
import { ENTRY_TYPES, CATEGORIES } from "@/types";
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

const VALID_TYPES = new Set<string>(ENTRY_TYPES);
const VALID_CATEGORIES = new Set<string>(CATEGORIES);

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
  const parsed = extractJson(text);

  // Validate and coerce fields
  const type = VALID_TYPES.has(String(parsed.type)) ? String(parsed.type) as EntryType : "tip";
  const tools = Array.isArray(parsed.tools) ? parsed.tools.map(String) : [];
  const categories = Array.isArray(parsed.categories)
    ? parsed.categories.map(String).filter((c) => VALID_CATEGORIES.has(c))
    : [];

  return {
    type,
    title: String(parsed.title ?? item.title),
    summary: String(parsed.summary ?? ""),
    body: String(parsed.body ?? ""),
    tools,
    categories,
  };
}
```

- [ ] **Step 8: Update supersession with `extractJson`**

In `src/lib/ingestion/supersession.ts`, replace the `checkSupersession` function's JSON parsing:

Change:
```typescript
  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return JSON.parse(text);
```

To:
```typescript
  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = extractJson(text);
  return {
    supersedes: Boolean(parsed.supersedes),
    reason: String(parsed.reason ?? ""),
  };
```

Add import at top of file:
```typescript
import { extractJson } from "@/lib/utils/json";
```

- [ ] **Step 9: Run all ingestion tests**

Run: `npx vitest run tests/lib/ingestion/ tests/lib/utils/`
Expected: PASS (all existing tests + new extractJson tests)

- [ ] **Step 10: Commit**

```bash
git add src/lib/utils/json.ts tests/lib/utils/json.test.ts src/lib/ingestion/relevance-filter.ts src/lib/ingestion/structurer.ts src/lib/ingestion/supersession.ts
git commit -m "fix: add robust JSON extraction and field validation to AI pipeline"
```

---

## Task 3: Integrate Logger into Pipeline and Ingest Routes

**Files:**
- Modify: `src/lib/ingestion/pipeline.ts`
- Modify: `src/app/api/admin/ingest/route.ts`
- Modify: `src/app/api/cron/ingest/route.ts`

**Context:** Wire the `PipelineLogger` from Task 1 into the actual pipeline. `processSource` records per-stage results. The ingest routes store `perSourceResults` in the `ingestionRuns` record.

- [ ] **Step 1: Update `processSource` to accept and populate a `PipelineLogger`**

In `src/lib/ingestion/pipeline.ts`, add import:

```typescript
import { PipelineLogger } from "./logger";
```

Update `processSource` signature:

```typescript
export async function processSource(
  source: SourceInput,
  tracker?: RunTracker,
  logger?: PipelineLogger
): Promise<PipelineResult> {
```

After the crawl step (line 54), add:

```typescript
  logger?.recordCrawl(source.id, {
    itemsFound: crawlResult.items.length,
    errors: crawlResult.errors,
  });
```

Track relevance scores as items are processed. After the relevance filter loop completes all items, before the return, add:

```typescript
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
```

Add local tracking variables at the start of the function:

```typescript
  const relevanceScores: number[] = [];
  let supersessionChecks = 0;
```

Record relevance score after each `filterRelevance` call:

```typescript
  relevanceScores.push(relevance.score);
```

Increment `supersessionChecks` in the supersession loop:

```typescript
  supersessionChecks++;
```

- [ ] **Step 2: Update `executeIngestion` in `/api/admin/ingest/route.ts`**

Add import:

```typescript
import { PipelineLogger } from "@/lib/ingestion/logger";
```

In `executeIngestion`, create logger and pass it:

```typescript
  const logger = new PipelineLogger();
  // ... in the source loop:
  logger.startSource(source.id, source.name);
  const result = await processSource(
    { id: source.id, url: source.url, type: source.type, name: source.name, relevanceThreshold: source.relevanceThreshold },
    tracker,
    logger
  );
```

When updating the run record on completion, add:

```typescript
  perSourceResults: JSON.stringify(logger.getSourceResults()),
```

- [ ] **Step 3: Apply same changes to cron ingest route**

Apply the same `PipelineLogger` integration to `src/app/api/cron/ingest/route.ts` — create logger, pass to `processSource`, store `perSourceResults` on completion.

- [ ] **Step 4: Run existing pipeline test to verify no breakage**

Run: `npx vitest run tests/lib/ingestion/pipeline.test.ts`
Expected: PASS (logger is optional, so existing tests still work)

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingestion/pipeline.ts src/app/api/admin/ingest/route.ts src/app/api/cron/ingest/route.ts
git commit -m "feat: integrate PipelineLogger into pipeline and ingest routes"
```

---

## Task 4: Add Semantic Deduplication

**Files:**
- Create: `src/lib/ingestion/dedup.ts`
- Create: `tests/lib/ingestion/dedup.test.ts`
- Modify: `src/lib/ingestion/pipeline.ts`

**Context:** URL dedup exists but the same story from HN, Reddit, and RSS can produce 3 entries with different URLs. This adds a cosine similarity check against existing entry embeddings before creating a new draft.

- [ ] **Step 1: Write failing test for cosine similarity**

```typescript
// tests/lib/ingestion/dedup.test.ts
import { describe, it, expect } from "vitest";
import { cosineSimilarity, isDuplicate } from "@/lib/ingestion/dedup";

describe("cosineSimilarity", () => {
  it("returns 1.0 for identical vectors", () => {
    const vec = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0);
  });

  it("returns 0.0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0);
  });

  it("returns value between 0 and 1 for similar vectors", () => {
    const a = [1, 2, 3];
    const b = [1, 2, 4];
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThan(0.9);
    expect(sim).toBeLessThan(1.0);
  });
});

describe("isDuplicate", () => {
  it("returns true when similarity exceeds threshold", () => {
    const embedding = [1, 2, 3, 4, 5];
    const existing = [
      { id: "1", embedding: [1, 2, 3, 4, 5] },
    ];
    expect(isDuplicate(embedding, existing, 0.95)).toBe(true);
  });

  it("returns false when no existing entry is similar enough", () => {
    const embedding = [1, 0, 0, 0, 0];
    const existing = [
      { id: "1", embedding: [0, 0, 0, 0, 1] },
    ];
    expect(isDuplicate(embedding, existing, 0.95)).toBe(false);
  });

  it("returns false for empty existing entries", () => {
    expect(isDuplicate([1, 2, 3], [], 0.95)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/ingestion/dedup.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement cosine similarity and dedup check**

```typescript
// src/lib/ingestion/dedup.ts
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

export function isDuplicate(
  embedding: number[],
  existingEntries: { id: string; embedding: number[] }[],
  threshold: number = 0.95
): boolean {
  for (const entry of existingEntries) {
    if (cosineSimilarity(embedding, entry.embedding) >= threshold) {
      return true;
    }
  }
  return false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/ingestion/dedup.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Integrate dedup into pipeline**

In `src/lib/ingestion/pipeline.ts`, add import:

```typescript
import { isDuplicate } from "./dedup";
```

In `processSource`, **before** the per-item loop (after `result.errors.push(...crawlResult.errors)`), fetch existing embeddings once:

```typescript
  // Pre-fetch active entry embeddings for semantic dedup (once per source, not per item)
  const recentEntries = await db
    .select({ id: entries.id, embedding: entries.embedding })
    .from(entries)
    .where(eq(entries.status, "active"))
    .limit(200);

  const dedupCandidates = recentEntries
    .filter((e): e is typeof e & { embedding: number[] } => e.embedding !== null);
```

Then, inside the loop, after generating the embedding (line 95) and before storing the draft entry (line 98), add:

```typescript
      // 5b. Semantic deduplication
      if (isDuplicate(embedding, dedupCandidates)) {
        await db.update(rawItems).set({ processed: true }).where(eq(rawItems.id, inserted[0].id));
        continue;
      }

      // Add this entry's embedding to candidates for subsequent items in this run
      dedupCandidates.push({ id: "pending", embedding });
```

This ensures: (a) only one DB query per source, not per item, and (b) items within the same run are deduped against each other.

- [ ] **Step 6: Run pipeline tests**

Run: `npx vitest run tests/lib/ingestion/pipeline.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/ingestion/dedup.ts tests/lib/ingestion/dedup.test.ts src/lib/ingestion/pipeline.ts
git commit -m "feat: add semantic deduplication via cosine similarity"
```

---

## Task 5: Add Stats API Caching

**Files:**
- Modify: `src/app/api/admin/stats/route.ts`

**Context:** The stats API queries the database on every call with no caching. The dashboard polls every 30 seconds. With multiple admin users, this generates unnecessary DB load. Add a `Cache-Control` header and use Next.js route segment config.

- [ ] **Step 1: Add caching headers to stats route**

Note: Do NOT use `export const revalidate` — this route has side effects (auto-heals stale running jobs), which are incompatible with Next.js static revalidation. Use `Cache-Control` header only.

At the end of the GET handler in `src/app/api/admin/stats/route.ts`, replace the `return NextResponse.json(...)` with:

```typescript
  const response = NextResponse.json({
    queue: { count: queueCount },
    sources: { healthy: healthySources.length, unhealthy: unhealthySources.length, total: allSources.length, lastCrawlAt: lastCrawl },
    content: { total: totalActive, byType: Object.fromEntries(activeEntries.map((e) => [e.type, e.count])), staleCount: staleResult.count },
    cost: { currentMonth: monthlyRuns[0]?.totalCost ?? 0, budgetCap, tokensInput: monthlyRuns[0]?.totalInput ?? 0, tokensOutput: monthlyRuns[0]?.totalOutput ?? 0 },
    recentRuns,
    schedule: "0 * * * *",
  });

  response.headers.set("Cache-Control", "private, max-age=10, stale-while-revalidate=20");
  return response;
```

- [ ] **Step 2: Verify the admin dashboard still loads correctly**

Run: `npx next build` (or `npx next dev` and check `/admin/queue` in browser)
Expected: Dashboard loads, stats display with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/stats/route.ts
git commit -m "perf: add caching headers to admin stats API"
```

---

## Task 6: Improve AI Prompts for Editorial Quality

**Files:**
- Modify: `src/lib/ai/prompts.ts`
- Create: `tests/lib/ingestion/prompts-validation.test.ts`

**Context:** The current prompts are minimal. The structurer doesn't enforce editorial voice, title specificity, or "so what" framing. This task rewrites both prompts based on the spec's editorial guidelines: specific titles, "so what" summaries, scannable bodies, correct type/tool/category assignment.

- [ ] **Step 1: Write test that validates prompt output structure**

```typescript
// tests/lib/ingestion/prompts-validation.test.ts
import { describe, it, expect } from "vitest";
import { RELEVANCE_FILTER_PROMPT, STRUCTURER_PROMPT } from "@/lib/ai/prompts";

describe("RELEVANCE_FILTER_PROMPT", () => {
  it("instructs JSON-only response with score and reason fields", () => {
    expect(RELEVANCE_FILTER_PROMPT).toContain("score");
    expect(RELEVANCE_FILTER_PROMPT).toContain("reason");
    expect(RELEVANCE_FILTER_PROMPT).toContain("JSON");
  });

  it("defines the 0.0-1.0 scoring scale", () => {
    expect(RELEVANCE_FILTER_PROMPT).toContain("0.0");
    expect(RELEVANCE_FILTER_PROMPT).toContain("1.0");
  });

  it("mentions target audience context", () => {
    expect(RELEVANCE_FILTER_PROMPT).toMatch(/tech lead|engineering manager/i);
  });
});

describe("STRUCTURER_PROMPT", () => {
  it("defines all four entry types", () => {
    expect(STRUCTURER_PROMPT).toContain("tip");
    expect(STRUCTURER_PROMPT).toContain("comparison");
    expect(STRUCTURER_PROMPT).toContain("guide");
    expect(STRUCTURER_PROMPT).toContain("breaking");
  });

  it("requires JSON response with all required fields", () => {
    expect(STRUCTURER_PROMPT).toContain("title");
    expect(STRUCTURER_PROMPT).toContain("summary");
    expect(STRUCTURER_PROMPT).toContain("body");
    expect(STRUCTURER_PROMPT).toContain("tools");
    expect(STRUCTURER_PROMPT).toContain("categories");
  });

  it("includes editorial guidelines for title quality", () => {
    expect(STRUCTURER_PROMPT).toMatch(/specific|actionable/i);
  });

  it("includes 'so what' framing for summaries", () => {
    expect(STRUCTURER_PROMPT).toMatch(/so what|why.*care|impact/i);
  });

  it("lists valid categories", () => {
    expect(STRUCTURER_PROMPT).toContain("Code Generation");
    expect(STRUCTURER_PROMPT).toContain("Code Review");
    expect(STRUCTURER_PROMPT).toContain("Testing");
    expect(STRUCTURER_PROMPT).toContain("Debugging");
    expect(STRUCTURER_PROMPT).toContain("DevOps");
    expect(STRUCTURER_PROMPT).toContain("Architecture");
  });
});
```

- [ ] **Step 2: Run test to see which assertions fail against current prompts**

Run: `npx vitest run tests/lib/ingestion/prompts-validation.test.ts`
Expected: Some tests FAIL (e.g., "mentions target audience context", "includes editorial guidelines")

- [ ] **Step 3: Rewrite RELEVANCE_FILTER_PROMPT**

Replace in `src/lib/ai/prompts.ts`:

```typescript
export const RELEVANCE_FILTER_PROMPT = `You are a relevance filter for Coding Radar, a curated feed for tech leads and engineering managers tracking AI coding tools.

Given a raw item (title + content), score its relevance on a 0.0-1.0 scale:

- 1.0 = Directly about AI coding tools (Cursor, Copilot, Claude Code, Windsurf, Aider, Cline, etc.) — new features, workflow changes, breaking updates, comparisons
- 0.7 = About AI tools developers use regularly but not coding-specific (ChatGPT for code review, AI in CI/CD)
- 0.4 = General AI/ML with tangential developer relevance (model releases, benchmarks)
- 0.1 = Tangentially related (general tech news mentioning AI)
- 0.0 = Not relevant to AI-assisted coding at all

Score higher if the content is actionable (a reader could change their workflow based on this).
Score lower if it's speculative, opinion-only, or rehashes old news.

Respond with JSON only, no markdown fences: { "score": number, "reason": string }`;
```

- [ ] **Step 4: Rewrite STRUCTURER_PROMPT**

Replace in `src/lib/ai/prompts.ts`:

```typescript
export const STRUCTURER_PROMPT = `You are a content structurer for Coding Radar, a curated feed for tech leads and engineering managers tracking AI coding tools.

Given a relevant raw item, create a structured entry. Your output should be publish-ready — specific, opinionated, and actionable.

## Entry Types
- "tip": Short, actionable advice about one tool. Use when the content describes a specific technique, shortcut, or workflow improvement.
- "comparison": Compares two or more tools. Use when the content evaluates tradeoffs between tools or approaches.
- "guide": Step-by-step workflow, longer form. Use when the content walks through a multi-step process.
- "breaking": Urgent, time-sensitive change. Use ONLY for deprecations, major releases, pricing changes, or breaking API changes.

## Editorial Guidelines

**Title:** Be specific and actionable. Include the tool name and what changed or what the reader will learn.
- Good: "Claude Code now runs background agents for long tasks"
- Bad: "New Claude Code Update" or "AI Tool News"

**Summary:** 2-3 sentences answering "so what?" — why should a busy tech lead care? Lead with the impact, not the description.
- Good: "Cursor's new multi-file edit can refactor entire modules in one pass, cutting large refactors from hours to minutes. Early benchmarks show 40% fewer follow-up corrections than single-file mode."
- Bad: "Cursor released a new feature called multi-file edit that lets you edit multiple files."

**Body:** Full content in markdown. Structured and scannable — use headers, bullet points, and code blocks. Be opinionated about what matters. Do not pad with filler or repeat the summary.

**Tools:** Extract exact tool names mentioned. Use canonical names: "Claude Code", "Cursor", "GitHub Copilot", "Windsurf", "Aider", "Cline", "ChatGPT", "Cody".

**Categories:** Select from ONLY these values: "Code Generation", "Code Review", "Testing", "Debugging", "DevOps", "Architecture". An entry can have multiple categories. Do not invent new categories.

Respond with JSON only, no markdown fences:
{
  "type": "tip" | "comparison" | "guide" | "breaking",
  "title": string,
  "summary": string,
  "body": string,
  "tools": string[],
  "categories": string[]
}`;
```

- [ ] **Step 5: Run prompt validation tests**

Run: `npx vitest run tests/lib/ingestion/prompts-validation.test.ts`
Expected: PASS (all assertions)

- [ ] **Step 6: Run full ingestion test suite to verify no breakage**

Run: `npx vitest run tests/lib/ingestion/`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/ai/prompts.ts tests/lib/ingestion/prompts-validation.test.ts
git commit -m "feat: rewrite AI prompts for higher editorial quality"
```

---

## Task 7: Add Entry Edit API Route

**Files:**
- Create: `src/app/api/admin/entries/[id]/edit/route.ts`
- Create: `tests/api/admin/entries-edit.test.ts`
- Modify: `src/lib/db/schema.ts` (add `editedFields` column to `entries`)

**Context:** The admin queue currently only supports approve/reject. Spec Section 2.4 requires inline editing so the curator can fix titles, summaries, etc. before approving. This task adds the API route. The UI component comes in Task 8. Note: This route is under `/api/admin/` which is protected by the existing middleware at `src/middleware.ts` — same as the existing approve/reject routes.

- [ ] **Step 1: Add `editedFields` column to entries schema**

In `src/lib/db/schema.ts`, add after the `embedding` field in the `entries` table:

```typescript
    editedFields: text("edited_fields"), // JSON: which fields were edited during review
```

- [ ] **Step 2: Write failing test for edit route**

```typescript
// tests/api/admin/entries-edit.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockReturning = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: mockReturning,
        }),
      }),
    }),
  },
}));

describe("PUT /api/admin/entries/[id]/edit", () => {
  beforeEach(() => {
    vi.resetModules();
    mockReturning.mockReset();
  });

  it("updates entry fields and records which fields were edited", async () => {
    mockReturning.mockResolvedValue([{
      id: "test-id",
      title: "Updated Title",
      summary: "Updated Summary",
      editedFields: '["title","summary"]',
    }]);

    const { PUT } = await import("@/app/api/admin/entries/[id]/edit/route");

    const request = new Request("http://localhost/api/admin/entries/test-id/edit", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Updated Title",
        summary: "Updated Summary",
      }),
    });

    const response = await PUT(request, {
      params: Promise.resolve({ id: "test-id" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it("returns 400 when no valid fields are provided", async () => {
    const { PUT } = await import("@/app/api/admin/entries/[id]/edit/route");

    const request = new Request("http://localhost/api/admin/entries/test-id/edit", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invalidField: "value" }),
    });

    const response = await PUT(request, {
      params: Promise.resolve({ id: "test-id" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 404 when entry does not exist", async () => {
    mockReturning.mockResolvedValue([]);

    const { PUT } = await import("@/app/api/admin/entries/[id]/edit/route");

    const request = new Request("http://localhost/api/admin/entries/nonexistent/edit", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Title" }),
    });

    const response = await PUT(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(response.status).toBe(404);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/api/admin/entries-edit.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement edit route**

```typescript
// src/app/api/admin/entries/[id]/edit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const EDITABLE_FIELDS = ["title", "summary", "body", "tools", "categories", "type"] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Build update object with only valid fields
  const updates: Record<string, unknown> = {};
  const editedFields: string[] = [];

  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
      editedFields.push(field);
    }
  }

  if (editedFields.length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  updates.editedFields = JSON.stringify(editedFields);

  const [updated] = await db
    .update(entries)
    .set(updates)
    .where(eq(entries.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, entry: updated });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/api/admin/entries-edit.test.ts`
Expected: PASS

- [ ] **Step 6: Run schema tests**

Run: `npx vitest run tests/lib/db/schema.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/schema.ts src/app/api/admin/entries/[id]/edit/route.ts tests/api/admin/entries-edit.test.ts
git commit -m "feat: add entry edit API route with field tracking"
```

---

## Task 8: Add Inline Editor to Admin Queue

**Files:**
- Create: `src/components/admin/queue-item-editor.tsx`
- Modify: `src/components/admin/queue-item.tsx`
- Modify: `src/app/admin/queue/page.tsx`

**Context:** Wire the edit API from Task 7 into the admin UI. Add an "Edit" button to each queue item that toggles an inline form. The curator can modify fields and then approve in one flow.

- [ ] **Step 1: Read the existing queue page to understand the action flow**

Read: `src/app/admin/queue/page.tsx`
Purpose: Understand how approve/reject actions are currently wired.

- [ ] **Step 2: Create the inline editor component**

```typescript
// src/components/admin/queue-item-editor.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EditableEntry {
  id: string;
  type: string;
  title: string;
  summary: string;
  body: string;
  tools: string[];
  categories: string[];
}

interface QueueItemEditorProps {
  entry: EditableEntry;
  onSave: (id: string, updates: Record<string, unknown>) => void;
  onCancel: () => void;
}

const ENTRY_TYPES = ["tip", "comparison", "guide", "breaking"] as const;
const VALID_CATEGORIES = [
  "Code Generation", "Code Review", "Testing", "Debugging", "DevOps", "Architecture",
] as const;

export function QueueItemEditor({ entry, onSave, onCancel }: QueueItemEditorProps) {
  const [title, setTitle] = useState(entry.title);
  const [summary, setSummary] = useState(entry.summary);
  const [body, setBody] = useState(entry.body);
  const [type, setType] = useState(entry.type);
  const [tools, setTools] = useState(entry.tools.join(", "));
  const [categories, setCategories] = useState<string[]>(entry.categories);

  const handleSave = () => {
    const updates: Record<string, unknown> = {};
    if (title !== entry.title) updates.title = title;
    if (summary !== entry.summary) updates.summary = summary;
    if (body !== entry.body) updates.body = body;
    if (type !== entry.type) updates.type = type;

    const parsedTools = tools.split(",").map((t) => t.trim()).filter(Boolean);
    if (JSON.stringify(parsedTools) !== JSON.stringify(entry.tools)) {
      updates.tools = parsedTools;
    }
    if (JSON.stringify(categories) !== JSON.stringify(entry.categories)) {
      updates.categories = categories;
    }

    onSave(entry.id, updates);
  };

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div>
        <label className="text-xs font-medium text-gray-600">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-sm"
        >
          {ENTRY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">Title</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">Summary</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">Body (markdown)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">Tools (comma-separated)</label>
        <Input value={tools} onChange={(e) => setTools(e.target.value)} className="mt-1" />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">Categories</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {VALID_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                categories.includes(cat)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={handleSave}>Save & Approve</Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add edit toggle to QueueItem**

In `src/components/admin/queue-item.tsx`, add an "Edit" button alongside Approve/Reject:

Update the `QueueItemProps` interface:

```typescript
interface QueueItemProps {
  entry: QueueEntry;
  onAction: (id: string, action: "approve" | "reject") => void;
  onEdit: (id: string) => void;
  isEditing: boolean;
  onSaveEdit: (id: string, updates: Record<string, unknown>) => void;
  onCancelEdit: () => void;
}
```

Add import at top:

```typescript
import { QueueItemEditor } from "./queue-item-editor";
```

Update the component to show editor when `isEditing` is true:

```typescript
export function QueueItem({ entry, onAction, onEdit, isEditing, onSaveEdit, onCancelEdit }: QueueItemProps) {
  if (isEditing) {
    return <QueueItemEditor entry={entry} onSave={onSaveEdit} onCancel={onCancelEdit} />;
  }

  return (
    <Card>
      {/* ... existing card content ... */}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onAction(entry.id, "approve")}>Approve</Button>
        <Button size="sm" variant="outline" onClick={() => onEdit(entry.id)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => onAction(entry.id, "reject")}>Reject</Button>
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Wire edit flow into queue-list component**

Note: `src/app/admin/queue/page.tsx` is a thin server component that just renders `<QueueList />`. The actual state management lives in `src/components/admin/queue-list.tsx`.

Read and update `src/components/admin/queue-list.tsx` to:
1. Track `editingId` state (`useState<string | null>(null)`)
2. Add `handleSaveEdit` that:
   - If `updates` is non-empty: calls `PUT /api/admin/entries/${id}/edit` first
   - Then calls `POST /api/admin/entries/${id}/approve`
   - Refreshes the queue list
3. Pass `onEdit`, `isEditing`, `onSaveEdit`, `onCancelEdit` props to each `QueueItem`

- [ ] **Step 5: Verify the admin queue works in the browser**

Run: `npx next dev`
Navigate to `/admin/queue` — verify Edit button appears, inline form opens, and Save & Approve works.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/queue-item-editor.tsx src/components/admin/queue-item.tsx src/components/admin/queue-list.tsx
git commit -m "feat: add inline editing to admin review queue"
```

---

## Task 9: Verify Pipeline End-to-End with Real Sources

**Files:** No code changes — this is a validation task.

**Context:** Spec Section 1 success criteria: "Run the pipeline 5 times, get real draft entries in the review queue, approve them via admin, and nothing breaks silently." This task verifies the full pipeline works with real data.

- [ ] **Step 1: Ensure environment variables are set**

Check that `.env.local` contains:
- `DATABASE_URL` — pointing to a real PostgreSQL instance
- `ANTHROPIC_API_KEY` — valid API key
- `VOYAGE_API_KEY` — valid API key
- `GITHUB_TOKEN` — optional but recommended for GitHub crawler
- `MONTHLY_BUDGET_CAP` — set to something reasonable for testing (e.g., 5)

- [ ] **Step 2: Ensure at least 3 real sources are configured**

Using the admin UI at `/admin/sources`, verify there are at least 3 enabled sources of different types (e.g., one RSS, one GitHub, one Reddit or HN). If not, add them from the suggested sources.

- [ ] **Step 3: Trigger a manual pipeline run**

Via the admin dashboard, click "Run Now" or:

```bash
curl -X POST http://localhost:3000/api/admin/ingest
```

Monitor the run via the dashboard or:

```bash
curl http://localhost:3000/api/admin/ingest/<runId>
```

- [ ] **Step 4: Check the results**

After the run completes:
1. Check the admin dashboard for run stats (sources processed, items crawled, relevant, structured)
2. Check the review queue for new draft entries
3. Verify the `perSourceResults` field in the run record shows per-source breakdown
4. Verify no silent failures — all errors should be visible in the run record

- [ ] **Step 5: Review and approve entries**

In the admin queue:
1. Review at least 5 draft entries for editorial quality
2. Try inline editing on at least 2 entries (fix titles/summaries)
3. Approve at least 3 entries
4. Reject at least 1 entry
5. Verify approved entries appear in the public feed

- [ ] **Step 6: Run 4 more times and note patterns**

Trigger 4 more pipeline runs. After each:
- Note how many items are deduplicated (should increase with each run)
- Note relevance score distribution — are good items scoring above threshold?
- Note editorial quality — are titles specific enough? Summaries answering "so what"?
- Document any prompt adjustments needed

- [ ] **Step 7: Record observations for future prompt tuning**

Create a file `docs/pipeline-observations.md` with notes on:
- Which sources produced the best content
- Common editorial issues (generic titles, missing tools, wrong type)
- Relevance threshold recommendations per source
- Supersession accuracy observations
- Any crawler-specific issues

- [ ] **Step 8: Commit observations**

```bash
git add docs/pipeline-observations.md
git commit -m "docs: record pipeline validation observations"
```

---

## Task 10: Tune Prompts Based on Real Output (Iterative)

**Files:**
- Modify: `src/lib/ai/prompts.ts`

**Context:** After Task 9's validation, this is the iterative prompt tuning step. Based on real output observations, adjust prompts. This task provides the framework — actual changes depend on observations.

- [ ] **Step 1: Review the observations from Task 9**

Read `docs/pipeline-observations.md` and identify the top 3 editorial issues.

- [ ] **Step 2: Adjust STRUCTURER_PROMPT for identified issues**

Common adjustments:
- If titles are too generic: add negative examples to the prompt
- If wrong types are assigned: add more specific criteria or examples
- If tools are missed: add common tool name variants to the prompt
- If body text is padded: add "Do not pad. Do not repeat the summary in the body."

Make targeted changes in `src/lib/ai/prompts.ts`.

- [ ] **Step 3: Adjust RELEVANCE_FILTER_PROMPT if needed**

If relevance scoring is miscalibrated:
- If too much noise passes: raise example scores for "not relevant" categories
- If good content is filtered out: lower thresholds or add examples of edge cases that should pass

- [ ] **Step 4: Run pipeline again and compare**

Trigger another manual run. Compare the output quality against Task 9 results:
- Are titles more specific?
- Are types more accurately assigned?
- Are summaries answering "so what"?

- [ ] **Step 5: Run prompt validation tests**

Run: `npx vitest run tests/lib/ingestion/prompts-validation.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai/prompts.ts
git commit -m "feat: tune prompts based on real pipeline output observations"
```

---

## Summary

| Task | What | Status Gate |
|------|------|-------------|
| 1 | Per-source structured logging | Tests pass, committed |
| 2 | Harden AI response parsing | Tests pass, committed |
| 3 | Integrate logger into pipeline | Pipeline test passes, committed |
| 4 | Semantic deduplication | Tests pass, committed |
| 5 | Stats API caching | Dashboard loads, committed |
| 6 | Improve AI prompts | Tests pass, committed |
| 7 | Entry edit API route | Tests pass, committed |
| 8 | Inline editor UI | Manual verification, committed |
| 9 | End-to-end pipeline validation | 5 runs completed, observations documented |
| 10 | Iterative prompt tuning | Output quality improved, tests pass |

**After completing this plan:** Proceed to Plan B (Design & Credibility) which covers the visual rebrand, UI overhaul, SEO, and OG images. The pipeline will be producing real, quality content to design around.
