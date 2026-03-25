# AI Coding Radar — Design Spec

## Overview

A web app that auto-aggregates AI coding news from across the web, structures it into actionable content (tips, comparisons, workflow guides), and keeps itself evergreen by detecting when content is superseded. Built for tech leads and managers who need to stay sharp and guide their teams on AI coding tooling without spending hours tracking the space.

**Platform:** Web (Next.js), responsive — desktop-first with full mobile browser support
**Primary audience:** Tech leads and engineering managers
**Core experience:** Feed-first, with dashboard, search, and digest views

## MVP Scope

**Phase 1 (MVP):** Feed + ingestion pipeline + admin review queue + source management
**Phase 2:** Search + digest (email via Resend) + dashboard
**Phase 3:** Analytics + content health automation + multi-curator support

## Content Model

Every piece of content is an **Entry**. Entries are typed:

| Type | Example | Shape |
|------|---------|-------|
| **Tip** | "Claude Code now supports background agents — use them for test runs" | Short, actionable, one tool |
| **Comparison** | "Cursor vs Claude Code for multi-file refactoring" | Two or more tools, structured pros/cons/verdict |
| **Guide** | "Setting up AI-assisted PR review for your team" | Step-by-step workflow, longer form |
| **Breaking** | "OpenAI deprecated Codex API — migrate to X" | Urgent, time-sensitive |

Each entry has:
- **Title**, **summary** (2-3 lines), **body** (full content)
- **Tools tagged** (Claude Code, Cursor, Copilot, etc.)
- **Categories**: Code Generation, Code Review, Testing, Debugging, DevOps, Architecture
- **Status**: `active` | `superseded` | `archived`
- **Superseded by**: link to the entry that replaced it (when applicable)
- **Sources**: URLs the entry was derived from
- **Confidence**: `verified` (reviewed by curator) | `draft` (AI-generated, pending review)
- **Created / Last verified** timestamps

The supersession chain is the key innovation — when entry B supersedes entry A, the feed shows B with a "replaces: A" indicator, and A fades from the active feed into a searchable archive.

### Data Schema

```
Entry {
  id: UUID
  type: enum (tip, comparison, guide, breaking)
  status: enum (active, superseded, archived, rejected)
  confidence: enum (draft, verified)
  title: text
  summary: text
  body: text
  tools: text[]
  categories: text[]
  sources: text[]              -- source URLs
  supersedes: UUID[]           -- entries this one replaces (many-to-many)
  superseded_by: UUID[]        -- entries that replaced this one
  embedding: vector(1024)     -- Voyage AI voyage-3-lite (1024d), chosen for cost/quality balance
  created_at: timestamp
  verified_at: timestamp
  published_at: timestamp
}

Source {
  id: UUID
  url: text
  type: enum (rss, github, reddit, hackernews, twitter, scraper)
  name: text
  last_crawl_at: timestamp
  crawl_interval: interval
  error_count: int
  relevance_threshold: float   -- 0.0-1.0, tunable per source
  enabled: boolean
}
```

Supersession is many-to-many: one entry can supersede multiple old entries (e.g., a comprehensive guide replacing several tips), and one entry can be superseded by multiple new entries (rare, but possible).

### Entry Lifecycle

Approving a draft sets: `status = active`, `confidence = verified`, `published_at = now()`. Rejecting sets `status = rejected`. Re-verifying updates `verified_at = now()` without changing other fields.

## Ingestion Pipeline

The system watches sources and turns raw signal into structured entries.

### Sources (configurable)
- RSS feeds (blogs: Simon Willison, Lilian Weng, tool blogs)
- GitHub releases/changelogs (Claude Code, Cursor, Copilot, etc.)
- Reddit (r/LocalLLaMA, r/ChatGPTPro, r/cursor)
- Hacker News (AI-tagged posts, score >= 50, configurable)
- X/Twitter (curated accounts — best-effort source, API access is unreliable; fallback to manual input)
- Product changelogs (direct scraping)

### Pipeline Flow

```
Source Crawlers → Raw Items → AI Relevance Filter → AI Structurer → Draft Entries → Review Queue → Published
```

1. **Crawl** — scheduled jobs pull new items from each source (hourly/daily depending on source)
2. **Relevance filter** — AI scores each raw item: "Is this about AI-assisted coding?" Drops noise (general AI research, non-coding LLM stuff)
3. **Structurer** — AI reads relevant items, determines entry type (tip/comparison/guide/breaking), generates title + summary + body + tags
4. **Supersession check** — AI compares draft against all active entries: "Does this make any existing entry outdated?" If yes, proposes the link and marks the old one as `superseded`
5. **Review queue** — drafts land in admin view. Curator approves, edits, or rejects. Approving immediately publishes to the feed.

### Error Handling

- **Crawl failures** — retry with exponential backoff (3 attempts). After 3 consecutive failures, mark source as unhealthy and surface in admin. Continue processing other sources.
- **AI API failures** — raw items queue up. Retried on next crawl cycle. No data loss.
- **Duplicate detection** — before structuring, raw items are deduplicated by source URL. Draft entries are checked for semantic similarity against existing drafts (>0.95 cosine = likely duplicate, auto-merged).
- **Rate limiting** — per-source crawl intervals are configurable. API calls to Claude are batched where possible.

### Supersession Detection

Works in two stages to keep costs bounded:
1. **Pre-filter** — narrow candidates by matching tool tags and categories (only compare entries about the same tools/topics)
2. **Deep check** — for the top-K most similar entries (K=10), run contradiction analysis via Claude API

If a new entry says "Tool X now supports Y" and an old entry says "Tool X doesn't support Y," that's a supersession candidate.

Combined with time-based decay — entries without verification for 60 days (configurable) are automatically flagged for review in the Content Health admin view.

## Core UX — The Feed

The feed is the hero experience. A tech lead opens the app, and within 10 seconds knows what changed in AI coding since they last visited.

### "Since You've Been Gone" Summary

A generated 2-3 sentence natural language summary at the top of the feed:
> "Cursor shipped multi-repo support, Claude Code added background agents, and GitHub Copilot deprecated their old chat API. 3 of your saved entries were superseded."

Only appears if there's been meaningful activity since last visit. Last visit is tracked via a `last_seen` timestamp in localStorage (no accounts needed for public users). The "You're all caught up" marker uses the same timestamp.

### Feed Cards

Each entry type has a distinct visual treatment:

- **Tip** — compact card, tool icon on the left, action-oriented headline, 2-line summary. Quick to scan.
- **Comparison** — wider card with tool icons side by side, verdict badge (e.g., "Claude Code wins for refactoring"), expandable pros/cons.
- **Guide** — taller card with step count indicator ("5 steps"), estimated read time, category pill.
- **Breaking** — highlighted border/accent color, urgency indicator, pinned at top until dismissed.

### Card Interactions

- Tap to expand inline (no page navigation for short content — tips and comparisons)
- Entries with body > 500 characters open a clean reading view (typically guides)
- "Dismiss" button — hides entry from the user's feed via localStorage (personal, not global). Curator uses admin view to archive globally.
- "Share" — generates a clean link at `/entry/:slug` (slug derived from title at creation time)
- Superseded entries show subtle strikethrough on title with "replaced by →" link

### Filtering & Sorting

- Category pills at top (horizontally scrollable): All, Code Gen, Code Review, Testing, Debugging, DevOps, Architecture
- Tool filter: icon toggles for each major tool
- Sort: Latest (default), Breaking first, Most sources (entries corroborated by more independent sources rank higher)

Infinite scroll with a subtle "You're all caught up" marker where the last session ended.

## Secondary Views

### Dashboard

Bird's-eye view organized by category. Each category shows:
- Count of active entries
- Most recent entry preview
- Trend indicator (e.g., "Code Review" has 5 new entries this week — hot)
- Health indicator per tool — green if advice is fresh, amber if entries are aging without verification

The exec summary view — "where is the action happening in AI coding right now?"

### Search

Full-text + semantic search across all entries (active + archived):
- Active entries first, superseded entries grouped below with "superseded" badge
- Natural query understanding: "best tool for code review" surfaces comparisons tagged with Code Review
- Filter by entry type, tool, category, status

### Digest

Scheduled email/notification (configurable: daily, weekly, or on-demand):
- Generated summary paragraph at the top
- Top 5 entries since last digest, prioritized by type (Breaking > Comparison > Guide > Tip)
- Supersession report: "3 entries you previously read are now outdated — here's what replaced them"
- Clean, minimal email design — scannable in 30 seconds

## Admin / Curation View

### Review Queue
- Inbox-style list of draft entries awaiting approval
- Each draft shows: AI-generated content, source links, confidence score, proposed supersessions
- Actions: Approve, Edit & Approve, Reject, Merge (combine multiple drafts about the same topic)
- Batch actions for high-volume days

### Source Management
- List of all configured sources with health status (last crawl, items pulled, error rate)
- Add/remove sources with a URL — system auto-detects type (RSS, GitHub, Reddit, etc.)
- Per-source relevance tuning: "This source produces too much noise" → tighten the filter

### Content Health
- Entries sorted by staleness — oldest without verification at top
- Supersession candidates the AI flagged but wasn't confident enough to auto-propose
- Orphaned entries — tips referencing tools that haven't had activity in months
- One-click re-verify: "Still accurate" refreshes the timestamp

### Analytics (lightweight)
- Which categories/tools get the most entries
- Digest open rates
- Most searched queries (reveals what the audience cares about)

## Architecture

### Frontend
- **Next.js** (App Router) — SSR for the feed (SEO, fast first load), client-side for interactions
- **Tailwind CSS** + **Radix UI** primitives — clean, modern, magazine-quality design with accessibility
- **Framer Motion** — smooth card transitions, supersession animations, feed entry/exit

### Backend
- **Next.js API routes** — app layer (auth, feed queries, admin actions)
- **PostgreSQL** — entries, sources, users, supersession graph
- **pgvector** extension — entry embeddings for supersession detection and semantic search

### Ingestion Pipeline
- Background workers (cron-triggered via Vercel Cron or job queue)
- Per-source crawlers (RSS parser, GitHub API, Reddit API, HN API, web scraper for changelogs)
- **Claude API** for: relevance filtering, entry structuring, supersession detection, digest generation

### Hosting
- **Vercel** for the Next.js app
- **Vercel Postgres** (or Supabase) for the database
- **Vercel Cron** for scheduled crawls

### Auth
- **NextAuth.js** with email/password for the curator admin
- Single admin account at MVP. Multi-curator support deferred to Phase 3.
- Admin routes protected by middleware. Public feed routes require no auth.

### API Surface (key routes)
- `GET /api/feed?cursor=&limit=20` — cursor-based paginated feed (filterable by category, tool, type). Default page size: 20.
- `GET /api/feed/summary` — "Since You've Been Gone" generated summary
- `GET /api/entries/:id` — single entry detail
- `GET /api/search?q=` — semantic + full-text search
- `GET /api/admin/queue` — draft entries pending review
- `POST /api/admin/entries/:id/approve` — publish a draft
- `POST /api/admin/entries/:id/reject` — reject a draft
- `POST /api/admin/entries/:id/verify` — re-verify an active entry
- `GET /api/admin/sources` — list configured sources
- `POST /api/admin/sources` — add a new source
- `DELETE /api/admin/sources/:id` — remove a source

### Key Design Decisions
- No real-time — hourly/daily crawls match this content's velocity
- Embeddings generated at entry creation time, stored in pgvector, reused for search and supersession
- Auth is simple — single curator admin via NextAuth, public read access for the feed
- AI layer (Claude) used at ingestion time, not query time — keeps the app fast and costs predictable
- Email digests via **Resend** (Phase 2)
- **Cost guardrail**: monthly Claude API budget cap (e.g., $50/mo). Ingestion pauses and alerts curator if spend exceeds threshold. Estimated usage: ~$10-20/mo at moderate source volume (50-100 raw items/day).
