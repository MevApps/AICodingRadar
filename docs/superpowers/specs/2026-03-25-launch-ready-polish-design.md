# Coding Radar — Launch-Ready Polish

**Date:** 2026-03-25
**Status:** Approved
**Goal:** Take the existing Phase 1 MVP from prototype to launch-ready quality — trustworthy enough to survive the HN front page.

## Context

Coding Radar (formerly "AI Coding Radar") is a web app that auto-aggregates AI coding news, structures it into actionable content, and detects when entries become outdated via supersession. Phase 1 MVP is built: feed with typed cards, ingestion pipeline, admin UI with review queue and source management.

Current state: small group of early users, seed data only (pipeline hasn't been run end-to-end with real sources), placeholder UI with Radix primitives, no branding or SEO.

**Rename:** Drop "AI" from the name. "Coding Radar" is cleaner — the radar metaphor implies scanning and detecting signals. Avoids AI fatigue.

## Approach

Pipeline-first, then polish. Validate the core product works with real content before investing in design and SEO. Real content informs every design decision.

## Section 1: Pipeline Validation & Hardening

**Goal:** Get the ingestion pipeline running end-to-end with real sources, fix what breaks, and make it reliable enough to run unattended.

### 1.1 Local Pipeline Run

Trigger ingestion manually (not just via cron). Fix crawler failures, API auth issues, and timeout problems as they surface. Validate each crawler (RSS, GitHub, Reddit, HN) individually before running the full pipeline.

### 1.2 Structured Logging

Add structured logging to each pipeline stage with visibility into:
- Which sources were crawled and their response status
- How many items found per source
- How many passed relevance filtering (with score distribution)
- How many became draft entries
- Any errors with context (source, stage, error message)

### 1.3 Deduplication Hardening

Test URL dedup and semantic similarity check (>0.95 cosine) under real conditions. Key scenario: the same story appears on HN, Reddit, and an RSS feed simultaneously. Validate that one entry is created, not three.

### 1.4 Supersession Validation

Test with real entries. Verify:
- A new Cursor release correctly supersedes a previous Cursor release entry
- Unrelated entries are not false-positived as supersessions
- Tune the similarity threshold based on observed results

### 1.5 Cost Monitoring

Add a simple cost tracker: count API calls per pipeline run (Claude for relevance + structuring, Voyage for embeddings), estimate spend. Log per-run costs. Target: stay within ~$50/mo budget at hourly cadence.

### Success Criteria

Run the pipeline 5 times, get real draft entries in the review queue, approve them via admin, and nothing breaks silently.

## Section 2: Editorial Quality Tuning

**Goal:** Make AI-generated entries good enough that 80%+ are publish-worthy with zero or minimal edits.

### 2.1 Prompt Evaluation

Run real content through the 3 prompts in `src/lib/ai/prompts.ts` (relevance scoring, structuring, summary generation). Collect output and identify patterns in what's bad.

### 2.2 Prompt Iteration

Tighten prompts based on real output. Key levers:
- **Titles:** Require specificity and action ("Claude Code now runs background agents" not "Claude Code Update")
- **Summaries:** Require the "so what" — why should a tech lead care?
- **Body:** Structured, scannable, opinionated — not source regurgitation
- **Type classification:** Validate tips vs guides vs comparisons vs breaking are correctly assigned
- **Tool/category tagging:** Tighten extraction logic against real entries

### 2.3 Relevance Threshold Tuning

Calibrate the 0.0-1.0 relevance scoring by reviewing what scored high vs low against human judgment. Adjust per-source thresholds if needed.

### 2.4 Review Queue Inline Editing

Add inline edit capability to the admin review queue. Currently it's approve/reject only. Allow editing title, summary, body, tools, categories, and type before approving. This makes the human-in-the-loop fast enough to be sustainable.

### 2.5 Quality Feedback Loop

Track which entries are edited before approving and what was changed. This data informs future prompt improvements.

### Success Criteria

Review 20+ real draft entries. At least 16 are publish-worthy with at most a minor title tweak.

## Section 3: Design Identity & UI Overhaul

**Goal:** Replace the prototype UI with a cohesive visual identity that feels like a real publication.

### 3.1 Brand Identity

- **Name treatment:** "Coding Radar" with a simple logomark (styled radar/pulse icon in CSS/SVG)
- **Color palette:** Primary accent color, neutral grays, semantic colors for entry types (tip=blue, comparison=purple, guide=green, breaking=red)
- **Typography:** Distinctive heading font + clean body font (e.g., Inter for body, something with character for headlines)
- **Overall vibe:** Clean, editorial, slightly opinionated — think Changelog or TLDR newsletter, not generic SaaS

### 3.2 Feed Redesign

With real content flowing, redesign card layouts:
- Tighter information density — tech leads scan, they don't browse
- Clearer visual hierarchy between entry types
- Better tool/category badges (replace basic Radix primitives)
- Relative timestamps ("2h ago" not ISO strings)
- Smooth transitions that feel intentional, not decorative

### 3.3 Card Interactivity

- **Click to navigate:** Clicking anywhere on a feed card navigates to the full entry detail page (`/entry/[slug]`)
- **Hover state:** Subtle elevation/shadow shift or background tint to signal cards are interactive
- **Separate action targets:** Share/dismiss buttons remain as distinct click targets that don't trigger navigation

### 3.4 Mobile Responsive

- Cards stack cleanly on mobile
- Filters collapse into a sheet or dropdown
- Reading experience works well on phones
- Touch targets are appropriately sized

### 3.5 Entry Detail Page

Currently bare. Add:
- Proper reading layout with readable line length (~65ch)
- Clear source attribution with links to originals
- Related entries section
- Supersession context ("This supersedes: [older entry]" with link)

### 3.6 Admin UI Tightening

Doesn't need to be fancy, but should feel functional:
- Clean up spacing and consistency
- Add loading and empty states
- Make the review workflow (with new inline editing) snappy

### 3.7 Dark Mode

Optional but expected by developer audiences. Tailwind makes this straightforward. Implement as a toggle with system preference detection.

### Success Criteria

A stranger landing on the feed immediately understands what this is, trusts the content, and can navigate it effortlessly on any device.

## Section 4: Credibility & SEO

**Goal:** Make the site discoverable, shareable, and look like a legitimate publication.

### 4.1 Essential Pages

- **About page:** What is Coding Radar, who's behind it, why it exists. Brief, opinionated, human.
- **How it works:** One paragraph explaining the curation approach (AI-assisted, human-reviewed). Transparency builds trust.

### 4.2 SEO Fundamentals

- Proper `<title>` and `<meta description>` on every page
- Semantic HTML: `<article>`, heading hierarchy, `<time>` elements
- Sitemap generation (`sitemap.xml`) for all published entry pages
- RSS feed output — let people subscribe to the radar itself
- Clean canonical URLs (already have `/entry/[slug]`)

### 4.3 Social Sharing (OG/Twitter Cards)

- Dynamic OG images per entry (entry type + title + tool badges rendered as image)
- Proper `og:title`, `og:description`, `og:image` meta tags
- Twitter card markup
- Critical for HN/Twitter/Reddit sharing — good preview cards drive clicks

### 4.4 Trust Signals

- Source attribution on every entry: "Derived from: [link to original]"
- Publish dates and "last updated" timestamps
- Supersession context visible to readers
- Freshness indicator on feed ("247 entries · Updated 2 hours ago")

### 4.5 Performance

- Lighthouse audit: target 90+ on all metrics
- Proper caching headers for feed API
- Image optimization if any are introduced
- Fast initial paint — feed should feel instant

### Success Criteria

Share an entry URL on Twitter/HN and it renders a clean, professional preview card. Google can index all published entries. Lighthouse scores 90+.

## Section 5: Launch Prep

**Goal:** Final hardening before public launch. Catch anything that would embarrass you on the HN front page.

### 5.1 Error Monitoring

- Basic error tracking (Vercel Analytics or Sentry free tier)
- Pipeline failure alerts — know within minutes if ingestion breaks
- Cron job health: verify it's actually firing on schedule

### 5.2 Content Buffer

Before launch, let the pipeline run for a few days and curate a backlog:
- Target: 20-30 published entries minimum
- Mix of entry types (tips, comparisons, guides, at least one breaking)
- A feed with 3 seed entries looks dead; 30 real entries looks active

### 5.3 Edge Case QA

- Empty state: all entries filtered out → clear messaging
- Source down: graceful degradation, no broken UI
- Feed at various sizes: 1 entry, 100 entries
- All filter combinations return sensible results
- Admin auth: queue and sources are not accidentally exposed

### 5.4 Analytics

- Simple page view tracking (Vercel Analytics or Plausible)
- Key metrics: visits, entry clicks, return visits, filter usage

### 5.5 Launch Checklist

- Custom domain configured
- Favicon and app icons
- 404 page that doesn't look broken
- Final copy pass on all static text (about, empty states, filter labels)
- Full flow test as new visitor: land → scan → click entry → share → return

### Success Criteria

You can hand the URL to a stranger, walk away, and not worry about what they'll find.

## Execution Order

1. Pipeline Validation & Hardening (Section 1)
2. Editorial Quality Tuning (Section 2)
3. Design Identity & UI Overhaul (Section 3)
4. Credibility & SEO (Section 4)
5. Launch Prep (Section 5)

Each section builds on the previous. Real content from Section 1 feeds into Section 2's quality tuning. Polished content from Section 2 informs Section 3's design decisions. The designed product gets SEO and credibility in Section 4. Section 5 is the final sweep.
