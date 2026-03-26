# Pipeline Validation Observations

**Date:** 2026-03-26
**Runs completed:** 6 manual runs across 4 sources

## Sources Tested

| Source | Type | Items/Run | Notes |
|--------|------|-----------|-------|
| Simon Willison's Weblog | RSS | ~30 | Consistent, mixed relevance (most posts not AI-coding specific) |
| Claude Code Releases | GitHub | ~10 | High relevance when new releases exist |
| r/cursor | Reddit | ~25 | Good AI-coding content, had 403 errors initially (resolved) |
| Hacker News | HN | ~24 | Low relevance — mostly general tech, few AI-coding items |

## Issues Found and Fixed

### 1. Embedding model deprecated (FIXED)
- `text-embedding-004` returned 404 on v1beta API
- Fixed: switched to `gemini-embedding-001` (3072 dims, truncated to 1024)

### 2. Gemini rate limiting (FIXED)
- Free tier: 5 requests/min for generateContent
- Pipeline fired all relevance checks rapidly, hit 429 after 5 calls
- Fixed: added 13s delay between Gemini chat calls

### 3. Stale Anthropic API key (USER ACTION)
- `ANTHROPIC_API_KEY` in `.env` is invalid, causing 401 fallback errors
- Not blocking since Gemini is primary provider now

### 4. JSON parse errors (PREVIOUSLY FIXED)
- One run showed `"```json\n..." is not valid JSON` — this was from a pre-extractJson run
- The `extractJson` helper (Task 2) handles this correctly now

### 5. Timestamp timezone mismatch (FIXED)
- `startedAt` (DB defaultNow) and `completedAt` (JS new Date) differ by ~2 hours
- Dashboard showed negative relative times (-110m ago)
- Fixed: use `completedAt` for display, guard against negative diffs

## Pipeline Behavior

- **URL dedup works correctly** — subsequent runs skip already-seen URLs (onConflictDoNothing)
- **Relevance scoring works** — items that reach the AI get scored correctly (0.0-1.0)
- **Rate limiter works** — latest run had 0 errors after fix
- **Per-source logging works** — detailed breakdown visible in run history
- **Cost tracking works** — runs show token counts and USD cost

## Not Yet Validated (needs fresh content)

- **Structuring** — 0 items have been structured because all relevant items failed at embedding/rate-limit stage in earlier runs, and are now URL-deduped
- **Supersession detection** — no entries have been published to test against
- **Semantic dedup** — no entries with embeddings to test cosine similarity
- **Inline editing** — no draft entries in queue to edit

## Recommendations for Task 10

1. Add 2-3 more sources (AI-coding focused blogs, tool changelogs) to increase relevant content
2. Or clear `raw_items` table to reprocess existing content with fixed pipeline
3. Relevance threshold (0.5 default) seems appropriate — HN correctly filters out non-AI content
4. Per-source thresholds may help: lower for focused sources (r/cursor), higher for broad ones (HN)
