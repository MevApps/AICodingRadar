# Launch Prep Implementation Plan (Plan C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Final hardening before public launch — error monitoring, empty states, favicon, 404 page, analytics, and rate limiting so the app survives the HN front page.

**Architecture:** Small, targeted additions to the existing Next.js 16 app. Each task is independent and produces a working improvement. No structural changes — just filling gaps.

**Tech Stack:** Next.js 16 (App Router), @vercel/analytics, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-03-25-launch-ready-polish-design.md` (Section 5)

---

## File Structure

### Files to Create

| File | Responsibility |
|------|---------------|
| `src/app/not-found.tsx` | Branded 404 page |
| `src/app/icon.svg` | Favicon (SVG radar icon matching logo) |
| `src/app/apple-icon.png` | Apple touch icon (generated from SVG) |

### Files to Modify

| File | What Changes |
|------|-------------|
| `src/components/feed/feed-list.tsx` | Add empty state for zero entries |
| `src/app/layout.tsx` | Add Vercel Analytics component |
| `src/middleware.ts` | Add rate limiting for public API routes |
| `package.json` | Add @vercel/analytics |

---

## Task 1: Branded 404 Page

**Files:**
- Create: `src/app/not-found.tsx`

- [ ] **Step 1: Create the 404 page**

```typescript
// src/app/not-found.tsx
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Logo className="mb-8" />
      <h1 className="font-heading text-4xl font-bold mb-2">404</h1>
      <p className="text-muted-foreground mb-6">
        This page doesn't exist or has been removed.
      </p>
      <Link
        href="/"
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity"
      >
        Back to feed
      </Link>
    </main>
  );
}
```

- [ ] **Step 2: Verify by navigating to a non-existent URL**

Open `http://localhost:3000/this-does-not-exist` in browser.
Expected: Branded 404 page with logo, message, and "Back to feed" button.

- [ ] **Step 3: Commit**

```bash
git add src/app/not-found.tsx
git commit -m "feat: add branded 404 page"
```

---

## Task 2: Favicon

**Files:**
- Create: `src/app/icon.svg`

- [ ] **Step 1: Create SVG favicon**

The favicon should match the Logo component's radar icon. Create `src/app/icon.svg`:

```svg
<svg width="32" height="32" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="14" cy="14" r="4" fill="#059669" />
  <path d="M14 6a8 8 0 0 1 8 8" stroke="#059669" stroke-width="2" stroke-linecap="round" opacity="0.6" />
  <path d="M14 2a12 12 0 0 1 12 12" stroke="#059669" stroke-width="2" stroke-linecap="round" opacity="0.3" />
</svg>
```

Next.js App Router automatically picks up `icon.svg` from the `app/` directory and serves it as the favicon.

- [ ] **Step 2: Verify**

Refresh any page — the browser tab should show the emerald radar icon.

- [ ] **Step 3: Commit**

```bash
git add src/app/icon.svg
git commit -m "feat: add SVG favicon"
```

---

## Task 3: Feed Empty States

**Files:**
- Modify: `src/components/feed/feed-list.tsx`

- [ ] **Step 1: Read the current feed-list.tsx**

Note the existing loading state and end-of-feed state. Identify where to add the empty state (after loading is false and entries.length === 0).

- [ ] **Step 2: Add empty state**

After the loading check and before the entries map, add a branch for when entries is empty:

```typescript
if (!loading && entries.length === 0) {
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground text-lg mb-2">No entries yet</p>
      <p className="text-muted-foreground text-sm">
        {/* If filters are active, show a different message */}
        Try adjusting your filters or check back soon.
      </p>
    </div>
  );
}
```

Also improve the loading state from plain "Loading..." to something slightly better:

```typescript
if (loading) {
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground text-sm">Loading entries...</p>
    </div>
  );
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/feed/feed-list.tsx
git commit -m "feat: add empty and loading states to feed"
```

---

## Task 4: Analytics

**Files:**
- Modify: `package.json` (add dependency)
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Install Vercel Analytics**

Run: `npm install @vercel/analytics`

- [ ] **Step 2: Add Analytics component to layout**

Read `src/app/layout.tsx`. Import and add the Analytics component inside the body, alongside Providers:

```typescript
import { Analytics } from "@vercel/analytics/react";

// In the body:
<body className={...}>
  <Providers>{children}</Providers>
  <Analytics />
</body>
```

The Analytics component is zero-config — it automatically tracks page views on Vercel deployments. In local dev, it's a no-op.

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/app/layout.tsx
git commit -m "feat: add Vercel Analytics for page view tracking"
```

---

## Task 5: Rate Limiting for Public APIs

**Files:**
- Modify: `src/middleware.ts`

**Context:** The existing middleware only handles admin auth. Add a simple in-memory rate limiter for public API routes to handle traffic spikes. This is a basic sliding window approach — good enough for launch on Vercel (where each serverless function instance has its own memory).

- [ ] **Step 1: Read current middleware.ts**

Understand the existing auth logic. The rate limiting must NOT interfere with admin auth checks.

- [ ] **Step 2: Add rate limiting for public API routes**

Add a simple rate limiter above the existing middleware function. Rate limit only `/api/feed` and `/api/entries` routes — NOT admin routes.

```typescript
// Simple in-memory rate limiter
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60; // requests per window
const RATE_WINDOW = 60_000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  entry.count++;
  return entry.count <= RATE_LIMIT;
}

// Clean up stale entries periodically (prevent memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimit) {
    if (now > entry.resetAt) rateLimit.delete(key);
  }
}, RATE_WINDOW);
```

In the middleware function, before the admin auth checks, add:

```typescript
// Rate limit public API routes
if (request.nextUrl.pathname.startsWith("/api/feed") || request.nextUrl.pathname.startsWith("/api/entries")) {
  const ip = request.headers.get("x-forwarded-for") ?? request.ip ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }
}
```

Update the matcher config to include the public API routes:

```typescript
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/feed/:path*", "/api/entries/:path*"],
};
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add rate limiting for public API routes"
```

---

## Task 6: Final QA Checklist (Manual)

**No code changes — this is a verification task.**

- [ ] **Step 1: Full flow test as new visitor**

Open the app in an incognito window at `http://localhost:3000`:
1. Feed loads with entries (or shows empty state if none)
2. Filters work (URL updates, feed refreshes)
3. Click an entry card → detail page loads
4. Detail page shows: back link, title, body, sources, related entries
5. Navigate back to feed
6. Click "About" → about page loads
7. Click "RSS" → XML renders
8. Visit `/sitemap.xml` → sitemap renders
9. Toggle dark mode → all pages look correct
10. Visit non-existent URL → branded 404 page

- [ ] **Step 2: Mobile test at 375px**

Use browser devtools at 375px width:
1. Feed renders, cards stack vertically
2. Filters scroll horizontally
3. Entry detail is readable
4. About page is readable
5. 404 page is centered

- [ ] **Step 3: Check OG image**

Visit: `http://localhost:3000/api/og?title=Test%20Entry&type=tip&tools=Claude%20Code`
Expected: 1200x630 image renders with title, type dot, tool pill, and "Coding Radar" footer.

- [ ] **Step 4: Verify admin auth**

1. Visit `/admin/queue` without auth → redirected to login
2. Visit `/api/admin/stats` without auth → 401 response
3. Login → dashboard loads with metrics

- [ ] **Step 5: Document any issues found**

If issues are found during QA, fix them before launch. Create a `docs/launch-qa.md` with findings and fixes.

- [ ] **Step 6: Commit QA notes**

```bash
git add docs/launch-qa.md
git commit -m "docs: record launch QA results"
```

---

## Summary

| Task | What | Spec Section |
|------|------|-------------|
| 1 | Branded 404 page | 5.5 |
| 2 | SVG favicon | 5.5 |
| 3 | Feed empty/loading states | 5.3 |
| 4 | Vercel Analytics | 5.4 |
| 5 | Rate limiting for public APIs | 5.1 |
| 6 | Final QA checklist (manual) | 5.3, 5.5 |

**Note on Section 5.2 (Content Buffer):** Building a content buffer requires the pipeline to run for several days with real sources. This is an operational task, not a code task — run the pipeline, review and approve entries in the admin queue, and build up to 20-30 published entries before announcing the launch.

**After completing this plan:** The app is launch-ready. Share it.
