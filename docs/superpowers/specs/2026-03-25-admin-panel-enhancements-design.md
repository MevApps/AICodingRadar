# Admin Panel Enhancements — Design Spec

## Overview

Three enhancements to the AI Coding Radar admin panel:
1. **Status Dashboard** — a rich, multi-row collapsible dashboard strip at the top of every admin page showing system health, queue depth, costs, and ingestion status at a glance
2. **Ingestion Controls** — manual "Run Now" trigger with live progress, schedule visibility, run history, and budget guardrails
3. **Source Recommendations** — a passive "Suggested Sources" panel on the sources page that recommends high-quality feeds based on coverage gaps

## 1. Status Dashboard

### Placement & Behavior

A persistent multi-row dashboard strip rendered below the admin nav and above page content on every admin page. Collapsible via a chevron — minimizes to a single compact summary line. Collapsed/expanded state persisted in localStorage.

**Loading state:** While `GET /api/admin/stats` is in flight, show skeleton cards (gray pulsing placeholders matching card dimensions). On fetch error, show a subtle inline error: "Dashboard unavailable — retrying..." with automatic retry after 10 seconds. Stale cached data (30-second client-side cache) is shown normally with no staleness indicator — 30 seconds is fresh enough.

### Row 1 — Key Metrics (4-card grid)

**Queue Card**
- Large number showing draft count (e.g., "12")
- Label: "Drafts Pending"
- Sparkline: drafts over last 7 days
- Status dot: red if >20, amber if >10, green if <10
- Click navigates to `/admin/queue`

**Sources Card**
- "8 of 10 healthy" text
- Mini health bar: green segments for healthy sources, red for unhealthy
- A source is "unhealthy" when `errorCount > 2`. Note: `errorCount` resets to 0 on each successful crawl (existing behavior in `cron/ingest/route.ts`). The stats API returns a pre-computed `{ healthy: number, unhealthy: number, total: number }` — callers don't compute this themselves.
- Last crawl timestamp of the most recent source
- Click navigates to `/admin/sources`

**Content Card**
- "147 active entries" headline
- Breakdown pills: count per entry type (e.g., "42 tips · 28 comparisons · 12 guides · 3 breaking")
- Staleness indicator: "6 entries need re-verification" (entries where `verified_at` is older than 60 days)
- Non-clickable — render with `cursor-default`, no hover treatment. Future content health page will make this interactive.

**Cost Card**
- "$8.42 of $50.00 this month" text
- Progress bar: green → amber (>60%) → red (>85%) as budget is consumed
- Hover tooltip: per-stage breakdown (relevance: $3.20, structuring: $4.10, supersession: $0.80, summaries: $0.32)
- Resets monthly (based on calendar month)

### Row 2 — Ingestion Status (single wide card)

- **Left:** Last Run — relative timestamp ("23 minutes ago"), result summary ("47 crawled, 12 relevant, 8 structured, 2 supersessions, 0 errors"), green checkmark or red X
- **Center:** Next Run — countdown timer ("Next run in 37 min"), exact time on hover, schedule label ("Every hour"). "Next run" refers to the global Vercel Cron trigger time (`0 * * * *`), not per-source intervals. Per-source `crawl_interval` is a future feature for staggering — the cron fires the entire pipeline on schedule, processing all enabled sources each time.
- **Right:** "Run Now" button — triggers manual ingestion. Button states:
  - **Default:** "Run Now" (enabled)
  - **Running:** disabled, pulsing indicator ("Ingesting... 3/10 sources")
  - **Budget exceeded:** disabled, red text "Budget Exceeded"
  - **Already running:** disabled, "Run in progress..." (when another run has `status = running`)
  - On completion: shows toast with result summary

### Row 3 — Recent Activity (compact log)

Last 5 ingestion runs displayed as a compact table or horizontal timeline. Each entry shows: timestamp, triggered_by (cron/manual badge), items processed, errors, cost. Expandable to show full run history.

## 2. Ingestion Controls & Backend

### Data Model

New table:

```
IngestionRun {
  id: UUID
  startedAt: timestamp
  completedAt: timestamp
  status: enum (running, completed, failed)
  sourcesProcessed: int
  itemsCrawled: int
  itemsRelevant: int
  itemsStructured: int
  supersessionsFound: int
  errors: text[]
  tokensInput: int
  tokensOutput: int
  costUsd: real
  triggeredBy: enum (cron, manual)
}

Indexes:
- index on startedAt (used for "last N runs" and "current month cost" queries)
- index on status (used for concurrency guard — checking if a run is already in progress)
```

### Token/Cost Tracking — AI Client Changes

The current `getAnthropicClient()` returns a raw Anthropic SDK client. Callers use `client.messages.create()` directly. To track tokens, we introduce a **wrapper layer** rather than modifying every call site:

**New: `src/lib/ingestion/tracker.ts`**

```typescript
interface TrackedUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

class RunTracker {
  private usage: TrackedUsage = { inputTokens: 0, outputTokens: 0, costUsd: 0 };

  // Wraps a Claude API call, extracts usage from response, accumulates
  async trackAiCall<T>(
    apiCall: () => Promise<Anthropic.Message>
  ): Promise<{ result: Anthropic.Message; usage: TrackedUsage }> { ... }

  // Returns accumulated usage for the run
  getUsage(): TrackedUsage { ... }
}
```

Pipeline functions (`filterRelevance`, `structureEntry`, `checkSupersession`) gain an optional `tracker?: RunTracker` parameter. When provided, they call `tracker.trackAiCall(...)` instead of calling the client directly. When not provided (e.g., feed summary), they work as before — no breaking changes.

The cron endpoint and manual trigger endpoint both create a `RunTracker`, pass it through the pipeline, then persist the accumulated usage to the `IngestionRun` record.

**Cost calculation constants:**
```typescript
const SONNET_INPUT_PRICE = 3.0 / 1_000_000;   // $3 per 1M input tokens
const SONNET_OUTPUT_PRICE = 15.0 / 1_000_000;  // $15 per 1M output tokens
```

Voyage AI embedding costs are also tracked via response metadata and added to the run total.

### Budget Guardrail

Monthly budget cap stored as env var `MONTHLY_BUDGET_CAP` (default: $50). Before each AI call in the pipeline, the `RunTracker` checks current month's total spend (sum of `costUsd` from all `IngestionRun` records in the current calendar month). If exceeded:
- Skip AI processing stages (relevance filter, structurer, supersession)
- Raw items are still crawled and stored in `rawItems` with `processed = false`
- Log warning to the ingestion run errors array
- Surface in dashboard: "Ingestion paused — monthly budget exceeded"
- "Run Now" button disabled with red "Budget Exceeded" label

**Backlog reprocessing:** Unprocessed raw items (`processed = false`) are automatically picked up on the next ingestion run that has available budget. At the start of each pipeline run, before crawling new items, the pipeline checks for unprocessed raw items and processes them first (oldest first, up to 50 per run to avoid budget spikes). This requires no new mechanism — the existing `rawItems.processed` flag already tracks this. The pipeline just needs a "process backlog" step before "crawl new items."

### Manual Trigger API

- `POST /api/admin/ingest` — starts ingestion. Before starting:
  1. Check for existing run with `status = running`. If found, return `409 Conflict` with `{ error: "Run already in progress", runId: existingRunId }`.
  2. Check monthly budget. If exceeded, return `403 Forbidden` with `{ error: "Monthly budget exceeded" }`.
  3. Create `IngestionRun` with `status: running`, return `{ runId }`.
  4. Execute pipeline (non-blocking — the response returns immediately, pipeline runs in background).
- `GET /api/admin/ingest/[runId]` — returns current run status, progress counters, and partial results. Frontend polls every 2 seconds.

**Polling safeguards:**
- Frontend stops polling after 5 minutes (timeout). If run is still `running` after 5 minutes, show "Run appears stalled — check server logs" warning.
- Runs with `status = running` and `startedAt` older than 10 minutes are considered stale. The stats API marks them as `failed` automatically (self-healing). This prevents a crashed run from blocking future manual triggers forever.
- On network error during polling, show inline error with retry button. Don't auto-retry — the run continues server-side regardless.

### Stats API

- `GET /api/admin/stats` — returns all dashboard data in one call: queue count, source health summary (`{ healthy, unhealthy, total }`), content counts by type, stale entry count, current month cost (total + per-stage breakdown), last 10 ingestion runs, next run time, budget cap. Called on admin layout mount, cached for 30 seconds client-side.

### Next Run Calculation

The cron schedule is `0 * * * *` (top of every hour). "Next run" refers to the global Vercel Cron trigger, not per-source intervals. The next run time is calculated client-side: find the next top-of-hour from `Date.now()`. The schedule string is passed from the stats API as a config value.

## 3. Source Recommendations

### Source Registry

A static JSON file (`src/data/source-registry.json`) shipped with the codebase containing 50-80 curated high-quality AI coding sources:

```json
[
  {
    "url": "https://simonwillison.net/atom/everything/",
    "type": "rss",
    "name": "Simon Willison's Weblog",
    "description": "Prolific AI tools commentary and tutorials",
    "tools": ["Claude Code", "Copilot", "ChatGPT"],
    "categories": ["Code Generation", "Architecture"]
  }
]
```

Categories of sources in the registry:
- Tool-official blogs and changelogs (Anthropic, Cursor, GitHub, etc.)
- Prominent independent bloggers and newsletters
- Key subreddits (r/cursor, r/LocalLLaMA, r/ChatGPTPro, etc.)
- GitHub release feeds for major tools
- AI coding-focused newsletters and aggregators

### Recommendation Logic

Pure computation, no AI calls needed:

1. Collect all tools and categories from the curator's existing sources and active entries
2. Filter the registry: exclude sources already added (match by URL)
3. Score remaining sources by coverage gap:
   - +2 points for each tool the source covers that the curator tracks
   - +1 point for each category overlap
   - +3 bonus if a tool appears in 5+ active entries but has no dedicated source (i.e., no existing source URL contains the tool's domain or name)
4. Sort by score descending, return top 5

### "+ Add" Button API

The "+ Add" button calls the existing `POST /api/admin/sources` endpoint with `{ url, type, name }` from the registry entry. The extra registry fields (`description`, `tools`, `categories`) are display-only — they are used for rendering the recommendation card and scoring, but are not stored in the `sources` table. The `sources` table is intentionally lean (it only needs URL, type, and name to crawl). No schema changes needed.

### UX

Rendered as a "Suggested Sources" section below the existing source list on `/admin/sources`:

- Section header: "Suggested Sources" with subtitle "Based on the tools and topics you track"
- 3-5 recommendation cards, each showing:
  - Source name and type badge (rss/github/reddit/etc.)
  - One-line description
  - Tool and category pills showing what it covers
  - **"+ Add" button** — calls `POST /api/admin/sources` with `{ url, type, name }`. Card animates out, next suggestion slides in.
- "Show more" link at bottom to browse the full registry
- If all suggestions are exhausted or already added: "You're tracking all our recommended sources" message

## File Structure

### New Files

```
src/data/source-registry.json                  — curated source registry (50-80 entries)
src/lib/ingestion/tracker.ts                   — RunTracker class: token/cost accumulation, budget check
src/lib/sources/recommendations.ts             — gap analysis and scoring logic
src/app/api/admin/ingest/route.ts              — POST trigger manual run (with concurrency guard)
src/app/api/admin/ingest/[runId]/route.ts      — GET run progress/status
src/app/api/admin/stats/route.ts               — GET dashboard metrics
src/components/admin/status-dashboard.tsx       — collapsible dashboard strip container
src/components/admin/metric-card.tsx            — individual metric card (queue, sources, content, cost)
src/components/admin/ingestion-bar.tsx          — last run + next run + Run Now button
src/components/admin/run-history.tsx            — recent runs compact log
src/components/admin/suggested-sources.tsx      — recommendation cards with + Add
```

### Modified Files

```
src/lib/db/schema.ts                           — add ingestionRuns table, triggeredByEnum, runStatusEnum
src/lib/ingestion/pipeline.ts                  — accept optional RunTracker, process backlog step
src/lib/ingestion/relevance-filter.ts          — accept optional RunTracker
src/lib/ingestion/structurer.ts                — accept optional RunTracker
src/lib/ingestion/supersession.ts              — accept optional RunTracker
src/app/admin/layout.tsx                       — render StatusDashboard below nav
src/app/admin/sources/page.tsx                 — add SuggestedSources section
src/app/api/cron/ingest/route.ts               — create IngestionRun record, use RunTracker
.env.example                                   — add MONTHLY_BUDGET_CAP
```
