# Design & Credibility Implementation Plan (Plan B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the prototype UI into a cohesive, launch-ready publication with proper branding, responsive design, SEO, and social sharing — ready for HN front page.

**Architecture:** Rename-first approach. Establish the design system (colors, typography, spacing) in Tailwind config and globals.css, then propagate through components. SEO and OG images added last since they depend on the final design. All changes are to the existing Next.js 16 App Router codebase with Tailwind CSS 4.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS 4 (CSS-first config via `@theme` blocks), Framer Motion, next/og (built-in OG images), lucide-react (icons)

**IMPORTANT — Tailwind CSS 4 Notes:** This project uses Tailwind v4 with `@tailwindcss/postcss`. In v4: content detection is automatic (no `content` array), dark mode is configured via `@variant dark` in CSS not JS config, theme extensions use `@theme` blocks in CSS, and the JS `tailwind.config.ts` is only loaded if `@config` is explicitly added to CSS. All design tokens MUST go in `globals.css` using `@theme` blocks.

**Spec:** `docs/superpowers/specs/2026-03-25-launch-ready-polish-design.md` (Sections 3-4)

---

## File Structure

### Files to Create

| File | Responsibility |
|------|---------------|
| `src/components/ui/logo.tsx` | Coding Radar SVG logomark + wordmark component |
| `src/components/ui/theme-toggle.tsx` | Dark mode toggle with system preference detection |
| `src/components/ui/relative-time.tsx` | Reusable relative timestamp component ("2h ago") |
| `src/components/feed/feed-header.tsx` | Site header with logo, nav, theme toggle |
| `src/components/feed/entry-card.tsx` | Unified clickable card replacing 4 type-specific cards |
| `src/components/feed/feed-stats.tsx` | Feed freshness indicator ("247 entries · Updated 2h ago") |
| `src/components/entry/entry-sources.tsx` | Source attribution component |
| `src/components/entry/related-entries.tsx` | Related entries sidebar/section |
| `src/app/about/page.tsx` | About page |
| `src/app/sitemap.ts` | Dynamic sitemap generation |
| `src/app/feed.xml/route.ts` | RSS 2.0 feed output |
| `src/app/api/og/route.tsx` | Dynamic OG image generation via next/og |
| `src/app/api/feed/stats/route.ts` | Feed stats API (entry count, last updated) |
| `src/lib/utils/relative-time.ts` | Relative time formatting logic |

### Files to Modify

| File | What Changes |
|------|-------------|
| `src/app/layout.tsx` | Rename to "Coding Radar", add fonts, global meta, dark mode class |
| `src/app/page.tsx` | New header, feed stats, updated layout |
| `src/app/globals.css` | Design tokens via `@theme` blocks, dark mode via `@variant`, CSS variables |
| `src/app/entry/[slug]/page.tsx` | Redesigned reading layout with sources, related entries, supersession |
| `src/app/admin/layout.tsx` | Rename "AI Coding Radar Admin" → "Coding Radar Admin" |
| `src/components/feed/feed-list.tsx` | Use new entry-card, add click navigation |
| `src/components/feed/feed-card.tsx` | Replace with unified clickable card |
| `src/components/feed/feed-filters.tsx` | Mobile-responsive filter pills |
| `src/components/feed/feed-summary.tsx` | Rename localStorage key, update styling |
| `src/components/ui/card.tsx` | Dark mode support, hover states |
| `src/components/ui/badge.tsx` | Dark mode colors using CSS variables |
| `src/components/ui/button.tsx` | Dark mode colors using CSS variables |
| `src/components/entry/entry-reading-view.tsx` | Redesign with 65ch width, semantic HTML, supersession context |
| `src/app/admin/layout.tsx` | Tighten spacing, improve nav styling |

---

## Task 1: Rename "AI Coding Radar" → "Coding Radar"

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/components/feed/feed-summary.tsx`

- [ ] **Step 1: Search for all "AI Coding Radar" references**

Run: `grep -r "AI Coding Radar" src/`
Note all occurrences.

- [ ] **Step 2: Replace in layout.tsx**

In `src/app/layout.tsx`, change metadata title from `"AI Coding Radar"` to `"Coding Radar"`. Update description to `"Stay sharp on AI coding tools — curated, structured, evergreen."`.

- [ ] **Step 3: Replace in page.tsx**

In `src/app/page.tsx`, change the h1 from `"AI Coding Radar"` to `"Coding Radar"`.

- [ ] **Step 4: Replace in admin layout**

In `src/app/admin/layout.tsx`, change `"AI Coding Radar Admin"` to `"Coding Radar Admin"`.

- [ ] **Step 5: Update localStorage key in feed-summary.tsx**

In `src/components/feed/feed-summary.tsx`, change `"ai-radar-last-seen"` to `"coding-radar-last-seen"`.

- [ ] **Step 6: Search again to confirm no remaining references**

Run: `grep -r "AI Coding Radar" src/`
Expected: No results.

- [ ] **Step 7: Run tests**

Run: `npx vitest run`
Expected: All pass.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: rename AI Coding Radar to Coding Radar"
```

---

## Task 2: Design System — Colors, Typography, Dark Mode Foundation

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Context:** Establish design tokens using Tailwind CSS v4's CSS-first approach. All theme extensions go in `globals.css` via `@theme` blocks — NOT in `tailwind.config.ts` (which is not loaded unless `@config` is explicitly added). This sets up: accent colors, neutral palette via CSS variables, heading + body fonts, and dark mode.

- [ ] **Step 1: Update globals.css with Tailwind v4 design tokens**

Replace `src/app/globals.css` with:

```css
@import "tailwindcss";

/* Dark mode via class toggle */
@variant dark (&:where(.dark, .dark *));

/* Register custom colors and fonts with Tailwind v4 */
@theme {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --font-heading: var(--font-heading);
  --font-body: var(--font-body);
}

/* Light mode tokens */
:root {
  --background: #ffffff;
  --foreground: #0f172a;
  --muted: #f8fafc;
  --muted-foreground: #64748b;
  --border: #e2e8f0;
  --accent: #059669;
  --accent-foreground: #ffffff;
  --card: #ffffff;
  --card-foreground: #0f172a;
}

/* Dark mode tokens (class-based) */
.dark {
  --background: #0c0a09;
  --foreground: #f5f5f4;
  --muted: #1c1917;
  --muted-foreground: #a8a29e;
  --border: #292524;
  --accent: #34d399;
  --accent-foreground: #0c0a09;
  --card: #1c1917;
  --card-foreground: #f5f5f4;
}

/* System preference fallback (when no class is set) */
@media (prefers-color-scheme: dark) {
  :root:not(.light) {
    --background: #0c0a09;
    --foreground: #f5f5f4;
    --muted: #1c1917;
    --muted-foreground: #a8a29e;
    --border: #292524;
    --accent: #34d399;
    --accent-foreground: #0c0a09;
    --card: #1c1917;
    --card-foreground: #f5f5f4;
  }
}

/* Scrollbar hide utility */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* Focus visible for keyboard navigation */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-body);
}
```

- [ ] **Step 2: DO NOT modify tailwind.config.ts**

In Tailwind v4, the JS config is NOT loaded unless `@config` is added to the CSS. All theme customization is done in `globals.css` above. Leave `tailwind.config.ts` as-is or delete it.

- [ ] **Step 3: Update layout.tsx with font imports, dark mode script, and metadata**

In `src/app/layout.tsx`:
- Import a heading font (e.g., `Space_Grotesk` from `next/font/google`) alongside Inter
- Set CSS variables `--font-heading` and `--font-body` via font className
- Add `suppressHydrationWarning` to `<html>` for dark mode
- Add an inline `<script>` in `<head>` to prevent flash of unstyled content (FOUC) on dark mode pages

```typescript
import { Inter, Space_Grotesk } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-heading" });

// In the html tag:
<html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
  <head>
    <script dangerouslySetInnerHTML={{ __html: `
      (function() {
        var t = localStorage.getItem('coding-radar-theme');
        if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          document.documentElement.classList.add('dark');
        } else if (t === 'light') {
          document.documentElement.classList.add('light');
        }
      })();
    `}} />
  </head>
```

This script runs before paint, preventing the flash of light theme for dark-mode users.

- [ ] **Step 4: Verify the app renders correctly**

Run: `npx next dev` and check `http://localhost:3000`
Expected: Fonts load, colors are consistent, no visual breakage.

- [ ] **Step 5: Run tests**

Run: `npx vitest run`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.ts src/app/globals.css src/app/layout.tsx
git commit -m "feat: establish design system — colors, typography, dark mode tokens"
```

---

## Task 3: Logo and Site Header

**Files:**
- Create: `src/components/ui/logo.tsx`
- Create: `src/components/feed/feed-header.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create logo component**

```typescript
// src/components/ui/logo.tsx
export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-accent"
      >
        {/* Radar pulse icon — concentric arcs */}
        <circle cx="14" cy="14" r="4" fill="currentColor" />
        <path
          d="M14 6a8 8 0 0 1 8 8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M14 2a12 12 0 0 1 12 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.3"
        />
      </svg>
      <span className="font-heading text-xl font-bold tracking-tight">
        Coding Radar
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Create feed header component**

```typescript
// src/components/feed/feed-header.tsx
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function FeedHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border pb-4 mb-6">
      <Link href="/">
        <Logo />
      </Link>
      <nav className="flex items-center gap-4 text-sm text-muted-foreground">
        <Link href="/about" className="hover:text-foreground transition-colors">
          About
        </Link>
        <Link
          href="/feed.xml"
          className="hover:text-foreground transition-colors"
          title="RSS Feed"
        >
          RSS
        </Link>
      </nav>
    </header>
  );
}
```

- [ ] **Step 3: Update page.tsx to use header**

Replace the current h1/subtitle in `src/app/page.tsx` with the `FeedHeader` component. Keep the subtitle below it as a `<p>` tag.

- [ ] **Step 4: Verify in browser**

Expected: Logo + "Coding Radar" text + nav links visible at top of feed page.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/logo.tsx src/components/feed/feed-header.tsx src/app/page.tsx
git commit -m "feat: add logo and site header with nav"
```

---

## Task 4: Relative Time Utility and Component

**Files:**
- Create: `src/lib/utils/relative-time.ts`
- Create: `src/components/ui/relative-time.tsx`

- [ ] **Step 1: Create relative time utility**

```typescript
// src/lib/utils/relative-time.ts
export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return "just now";

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
```

- [ ] **Step 2: Create React component wrapper**

```typescript
// src/components/ui/relative-time.tsx
"use client";

import { formatRelativeTime } from "@/lib/utils/relative-time";

export function RelativeTime({ date, className = "" }: { date: string; className?: string }) {
  return (
    <time dateTime={date} className={className} title={new Date(date).toLocaleString()}>
      {formatRelativeTime(date)}
    </time>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/relative-time.ts src/components/ui/relative-time.tsx
git commit -m "feat: add relative time utility and component"
```

---

## Task 5: Unified Clickable Entry Card

**Files:**
- Create: `src/components/feed/entry-card.tsx`
- Modify: `src/components/feed/feed-list.tsx`
- Modify: `src/components/ui/card.tsx`

**Context:** Replace the 4 type-specific cards (tip, comparison, guide, breaking) with a single unified card that's clickable, has hover states, and uses relative timestamps. The type is communicated via a colored left border + badge, not separate component files.

- [ ] **Step 1: Update Card primitive with hover and dark mode**

Replace `src/components/ui/card.tsx`:

```typescript
import { type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ className = "", interactive = false, ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-border bg-card text-card-foreground p-5 shadow-sm ${
        interactive
          ? "cursor-pointer transition-all hover:shadow-md hover:border-accent/30 hover:-translate-y-0.5"
          : ""
      } ${className}`}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Create unified entry card**

```typescript
// src/components/feed/entry-card.tsx
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RelativeTime } from "@/components/ui/relative-time";

interface Entry {
  id: string;
  slug: string;
  type: string;
  title: string;
  summary: string;
  tools: string[];
  categories: string[];
  publishedAt: string | null;
  createdAt: string;
}

const TYPE_BORDERS: Record<string, string> = {
  tip: "border-l-4 border-l-blue-500",
  comparison: "border-l-4 border-l-purple-500",
  guide: "border-l-4 border-l-green-500",
  breaking: "border-l-4 border-l-red-500",
};

export function EntryCard({ entry }: { entry: Entry }) {
  const borderClass = TYPE_BORDERS[entry.type] ?? "";

  return (
    <Link href={`/entry/${entry.slug}`} className="block">
      <Card interactive className={borderClass}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant={entry.type as any}>{entry.type}</Badge>
              <RelativeTime
                date={entry.publishedAt ?? entry.createdAt}
                className="text-xs text-muted-foreground"
              />
            </div>
            <h3 className="font-heading font-semibold text-card-foreground leading-snug">
              {entry.title}
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
              {entry.summary}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {entry.tools.map((tool) => (
                <span
                  key={tool}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 3: Update feed-list.tsx to use EntryCard**

Replace the `FeedCard` import with `EntryCard`. Update the map to render `<EntryCard entry={entry} />` instead of `<FeedCard entry={entry} />`.

- [ ] **Step 4: Verify in browser**

Expected: Cards have colored left borders by type, hover elevates them, clicking navigates to entry detail.

- [ ] **Step 5: Run tests**

Run: `npx vitest run`
Expected: Feed card tests may need updating for new component name.

- [ ] **Step 6: Commit**

```bash
git add src/components/feed/entry-card.tsx src/components/feed/feed-list.tsx src/components/ui/card.tsx
git commit -m "feat: unified clickable entry card with hover states and relative time"
```

---

## Task 6: Mobile-Responsive Feed Filters

**Files:**
- Modify: `src/components/feed/feed-filters.tsx`

- [ ] **Step 1: Restyle filters for mobile (preserve URL state)**

IMPORTANT: The existing `feed-filters.tsx` uses `useRouter` and `useSearchParams` for URL-based filter state. This must be preserved — filters stored in URL params are shareable and survive page refreshes. Import categories from `@/types` (the canonical source), don't hardcode them.

Restyle the existing component:
- Replace hardcoded color classes (`bg-black text-white`, `bg-gray-100`) with design token classes (`bg-foreground text-background`, `bg-muted text-muted-foreground`)
- Add `scrollbar-hide` class to the filter rows for cleaner mobile scroll
- Add `aria-pressed` to filter buttons for accessibility
- Keep the existing `useRouter`/`useSearchParams` state management intact

- [ ] **Step 2: Verify on mobile viewport (375px)**

Use browser devtools to test at 375px width. Filters should scroll horizontally.

- [ ] **Step 4: Commit**

```bash
git add src/components/feed/feed-filters.tsx
git commit -m "feat: mobile-responsive feed filters with design tokens"
```

---

## Task 7: Entry Detail Page Redesign

**Files:**
- Modify: `src/app/entry/[slug]/page.tsx`
- Create: `src/components/entry/entry-sources.tsx`

**Context:** The entry detail page is currently bare. Add: readable line length (~65ch), source attribution, supersession context, back navigation, and proper semantic HTML.

- [ ] **Step 1: Create source attribution component**

```typescript
// src/components/entry/entry-sources.tsx
export function EntrySources({ sources }: { sources: string[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-6 pt-4 border-t border-border">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        Sources
      </h4>
      <ul className="space-y-1">
        {sources.map((url, i) => {
          let hostname = url;
          try { hostname = new URL(url).hostname; } catch {}
          return (
            <li key={i}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline"
              >
                {hostname}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Redesign entry detail page**

Rewrite `src/app/entry/[slug]/page.tsx` with:
- Back link to feed
- Article semantic HTML
- Readable max-width (~65ch)
- Type badge + relative time
- Tool badges
- Markdown body rendering
- Source attribution
- Supersession context (if entry has supersession relations)

The page should use `<article>` with `max-w-prose mx-auto` for the reading layout.

- [ ] **Step 3: Verify in browser**

Navigate to an entry detail page. Check: readable width, source links, back navigation, semantic markup.

- [ ] **Step 4: Commit**

```bash
git add src/app/entry/[slug]/page.tsx src/components/entry/entry-sources.tsx
git commit -m "feat: redesign entry detail page with sources and reading layout"
```

---

## Task 8: Dark Mode Toggle

**Files:**
- Create: `src/components/ui/theme-toggle.tsx`
- Modify: `src/components/feed/feed-header.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create theme toggle component**

```typescript
// src/components/ui/theme-toggle.tsx
"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  useEffect(() => {
    const stored = localStorage.getItem("coding-radar-theme") as "light" | "dark" | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.classList.toggle("dark", stored === "dark");
      document.documentElement.classList.toggle("light", stored === "light");
    }
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("coding-radar-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.classList.toggle("light", next === "light");
  }

  return (
    <button
      onClick={toggle}
      className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      aria-label="Toggle dark mode"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Add toggle to feed header**

Import `ThemeToggle` in `src/components/feed/feed-header.tsx` and add it to the nav area.

- [ ] **Step 3: Update UI primitives for dark mode**

Verify that Card, Badge, Button, and Input all use the CSS variable colors (`bg-card`, `text-card-foreground`, `border-border`, etc.) instead of hardcoded Tailwind colors. Update any that still use hardcoded `gray-*` or `white` classes.

- [ ] **Step 4: Test dark mode**

Toggle dark mode in browser. Verify: background changes, text is readable, cards have proper contrast, badges are visible, no white-on-white or black-on-black text.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/theme-toggle.tsx src/components/feed/feed-header.tsx src/app/layout.tsx
git commit -m "feat: add dark mode toggle with system preference detection"
```

---

## Task 9: About Page

**Files:**
- Create: `src/app/about/page.tsx`

- [ ] **Step 1: Create about page**

```typescript
// src/app/about/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "About — Coding Radar",
  description: "What is Coding Radar, who's behind it, and why it exists.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-prose px-4 py-12">
      <Link href="/" className="inline-block mb-8">
        <Logo />
      </Link>

      <h1 className="font-heading text-3xl font-bold tracking-tight mb-6">
        About Coding Radar
      </h1>

      <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
        <p>
          Coding Radar aggregates AI coding tool news from across the internet,
          structures it into actionable content, and keeps it evergreen by
          detecting when entries become outdated.
        </p>

        <p>
          Built for tech leads and engineering managers who need to stay informed
          about AI coding tools without spending hours tracking the space.
        </p>

        <h2 className="font-heading text-xl font-semibold text-foreground pt-4">
          How it works
        </h2>

        <p>
          We crawl RSS feeds, GitHub releases, Reddit, and Hacker News hourly.
          An AI pipeline scores each item for relevance, structures the good ones
          into typed entries (tips, comparisons, guides, breaking news), and
          checks whether new information supersedes older entries. Every entry is
          human-reviewed before publishing.
        </p>

        <h2 className="font-heading text-xl font-semibold text-foreground pt-4">
          Open and transparent
        </h2>

        <p>
          Every entry links back to its original source. If we got something
          wrong, the source is right there. Our curation is AI-assisted but
          human-approved — nothing publishes without a person reviewing it.
        </p>
      </div>

      <div className="mt-12 pt-6 border-t border-border text-sm text-muted-foreground">
        <Link href="/" className="text-accent hover:underline">
          ← Back to feed
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `/about`. Check: content renders, links work, metadata correct.

- [ ] **Step 3: Commit**

```bash
git add src/app/about/page.tsx
git commit -m "feat: add about page"
```

---

## Task 10: SEO — Metadata, Sitemap, RSS Feed

**Files:**
- Modify: `src/app/layout.tsx` (global metadata)
- Modify: `src/app/entry/[slug]/page.tsx` (entry metadata with OG tags)
- Create: `src/app/sitemap.ts`
- Create: `src/app/feed.xml/route.ts`

- [ ] **Step 1: Enhance global metadata in layout.tsx**

Add to the metadata export:

```typescript
export const metadata: Metadata = {
  title: {
    default: "Coding Radar",
    template: "%s — Coding Radar",
  },
  description: "Stay sharp on AI coding tools — curated, structured, evergreen.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "https://codingradar.dev"),
  openGraph: {
    type: "website",
    siteName: "Coding Radar",
  },
  twitter: {
    card: "summary_large_image",
  },
};
```

- [ ] **Step 2: Add OG metadata to entry detail page**

In `src/app/entry/[slug]/page.tsx`, update the `generateMetadata` function to include OG tags:

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getEntryBySlug(slug);
  if (!entry) return { title: "Not found" };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://codingradar.dev";

  return {
    title: entry.title,
    description: entry.summary,
    openGraph: {
      title: entry.title,
      description: entry.summary,
      type: "article",
      publishedTime: entry.publishedAt?.toISOString(),
      images: [`${baseUrl}/api/og?title=${encodeURIComponent(entry.title)}&type=${entry.type}&tools=${encodeURIComponent(entry.tools.join(","))}`],
    },
    twitter: {
      card: "summary_large_image",
      title: entry.title,
      description: entry.summary,
    },
  };
}
```

- [ ] **Step 3: Create sitemap.ts**

```typescript
// src/app/sitemap.ts
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://codingradar.dev";

  const publishedEntries = await db
    .select({ slug: entries.slug, publishedAt: entries.publishedAt })
    .from(entries)
    .where(and(eq(entries.status, "active"), eq(entries.confidence, "verified")));

  const entryUrls = publishedEntries.map((entry) => ({
    url: `${baseUrl}/entry/${entry.slug}`,
    lastModified: entry.publishedAt ?? new Date(),
    changeFrequency: "weekly" as const,
  }));

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "hourly" },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly" },
    ...entryUrls,
  ];
}
```

- [ ] **Step 4: Create RSS feed route**

```typescript
// src/app/feed.xml/route.ts
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://codingradar.dev";

  const published = await db
    .select()
    .from(entries)
    .where(and(eq(entries.status, "active"), eq(entries.confidence, "verified")))
    .orderBy(desc(entries.publishedAt))
    .limit(50);

  const items = published
    .map((entry) => `
    <item>
      <title><![CDATA[${entry.title}]]></title>
      <link>${baseUrl}/entry/${entry.slug}</link>
      <description><![CDATA[${entry.summary}]]></description>
      <pubDate>${entry.publishedAt ? new Date(entry.publishedAt).toUTCString() : ""}</pubDate>
      <guid>${baseUrl}/entry/${entry.slug}</guid>
    </item>`)
    .join("");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Coding Radar</title>
    <link>${baseUrl}</link>
    <description>Stay sharp on AI coding tools — curated, structured, evergreen.</description>
    <language>en</language>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
```

- [ ] **Step 5: Verify sitemap and RSS**

Navigate to `/sitemap.xml` and `/feed.xml` in browser. Both should render valid XML.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/app/entry/[slug]/page.tsx src/app/sitemap.ts src/app/feed.xml/route.ts
git commit -m "feat: add SEO metadata, sitemap, and RSS feed"
```

---

## Task 11: Dynamic OG Images

**Files:**
- Create: `src/app/api/og/route.tsx`
- Modify: `package.json` (add @vercel/og)

- [ ] **Step 1: Create OG image route (uses built-in next/og, no extra dependency needed)**

```typescript
// src/app/api/og/route.tsx
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const TYPE_COLORS: Record<string, string> = {
  tip: "#3b82f6",
  comparison: "#a855f7",
  guide: "#22c55e",
  breaking: "#ef4444",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") ?? "Coding Radar";
  const type = searchParams.get("type") ?? "tip";
  const tools = searchParams.get("tools")?.split(",").filter(Boolean) ?? [];

  const accentColor = TYPE_COLORS[type] ?? "#059669";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px",
          backgroundColor: "#0f172a",
          color: "#f5f5f4",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: accentColor,
            }}
          />
          <span style={{ fontSize: "20px", color: "#a8a29e", textTransform: "uppercase", letterSpacing: "2px" }}>
            {type}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px", flex: 1, justifyContent: "center" }}>
          <h1 style={{ fontSize: "48px", fontWeight: 700, lineHeight: 1.2, margin: 0 }}>
            {title.length > 80 ? title.slice(0, 80) + "…" : title}
          </h1>
          {tools.length > 0 && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {tools.slice(0, 4).map((tool) => (
                <span
                  key={tool}
                  style={{
                    backgroundColor: "#292524",
                    padding: "6px 16px",
                    borderRadius: "20px",
                    fontSize: "16px",
                    color: "#a8a29e",
                  }}
                >
                  {tool}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              backgroundColor: "#059669",
            }}
          />
          <span style={{ fontSize: "18px", fontWeight: 600 }}>Coding Radar</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

- [ ] **Step 3: Test OG image**

Navigate to: `http://localhost:3000/api/og?title=Claude%20Code%20now%20runs%20background%20agents&type=tip&tools=Claude%20Code`
Expected: Renders a 1200x630 image with the title, type badge, and tool pill.

- [ ] **Step 4: Test with social media preview tools**

Use a social card validator to check the OG image renders correctly for a sample entry URL.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/og/route.tsx
git commit -m "feat: add dynamic OG image generation via next/og"
```

---

## Task 12: Feed Stats and Trust Signals

**Files:**
- Create: `src/components/feed/feed-stats.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create feed stats component**

```typescript
// src/components/feed/feed-stats.tsx
"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/utils/relative-time";

interface FeedStatsData {
  totalEntries: number;
  lastUpdated: string | null;
}

export function FeedStats() {
  const [stats, setStats] = useState<FeedStatsData | null>(null);

  useEffect(() => {
    fetch("/api/feed/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats || stats.totalEntries === 0) return null;

  return (
    <p className="text-xs text-muted-foreground mb-4">
      {stats.totalEntries} entries
      {stats.lastUpdated && ` · Updated ${formatRelativeTime(stats.lastUpdated)}`}
    </p>
  );
}
```

- [ ] **Step 2: Create the feed stats API endpoint**

Create `src/app/api/feed/stats/route.ts`:

```typescript
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { eq, and, desc, count } from "drizzle-orm";

export async function GET() {
  const [total] = await db
    .select({ count: count() })
    .from(entries)
    .where(and(eq(entries.status, "active"), eq(entries.confidence, "verified")));

  const [latest] = await db
    .select({ publishedAt: entries.publishedAt })
    .from(entries)
    .where(and(eq(entries.status, "active"), eq(entries.confidence, "verified")))
    .orderBy(desc(entries.publishedAt))
    .limit(1);

  return Response.json({
    totalEntries: total.count,
    lastUpdated: latest?.publishedAt?.toISOString() ?? null,
  });
}
```

- [ ] **Step 3: Add FeedStats to page.tsx**

Import and render `<FeedStats />` below the subtitle, above the filters.

- [ ] **Step 4: Commit**

```bash
git add src/components/feed/feed-stats.tsx src/app/api/feed/stats/route.ts src/app/page.tsx
git commit -m "feat: add feed stats with entry count and freshness indicator"
```

---

## Task 13: Performance and Accessibility Pass

**Files:**
- Various components (small updates)

- [ ] **Step 1: Add semantic HTML to feed page**

In `src/app/page.tsx`, wrap the feed in `<main>` and add `role` attributes where needed. Ensure heading hierarchy (h1 → h2 → h3).

- [ ] **Step 2: Add ARIA labels**

- Filter buttons: `aria-pressed` for active state
- Theme toggle: `aria-label` (already done in Task 8)
- Entry cards: use semantic `<article>` element

- [ ] **Step 3: Add focus styles**

In globals.css, add a visible focus ring for keyboard navigation:

```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

- [ ] **Step 4: Add caching headers to feed API**

In `src/app/api/feed/route.ts`, add:

```typescript
response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
```

- [ ] **Step 5: Run Lighthouse audit**

Use Chrome DevTools Lighthouse tab on the feed page. Target: 90+ on Performance, Accessibility, Best Practices, SEO.

- [ ] **Step 6: Fix any issues found**

Address Lighthouse findings (contrast issues, missing alt text, etc.).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: accessibility and performance improvements"
```

---

## Task 14: Dark Mode for UI Primitives (Badge, Button, FeedSummary)

**Files:**
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/feed/feed-summary.tsx`

**Context:** The current Badge uses hardcoded light-mode colors (`bg-blue-100 text-blue-800`, etc.). Button uses `bg-black`, `bg-gray-100`. FeedSummary uses `bg-blue-50`. All need dark mode support. Use Tailwind's `dark:` variant (configured via the `@variant dark` block in globals.css).

- [ ] **Step 1: Update Badge with dark mode variants**

For each variant in `src/components/ui/badge.tsx`, add dark: counterparts:
- `default`: add `dark:bg-zinc-800 dark:text-zinc-300`
- `tip`: add `dark:bg-blue-900/50 dark:text-blue-300`
- `comparison`: add `dark:bg-purple-900/50 dark:text-purple-300`
- `guide`: add `dark:bg-green-900/50 dark:text-green-300`
- `breaking`: add `dark:bg-red-900/50 dark:text-red-300`
- `draft`: add `dark:bg-yellow-900/50 dark:text-yellow-300`
- `verified`: add `dark:bg-emerald-900/50 dark:text-emerald-300`
- `superseded`: add `dark:bg-zinc-800 dark:text-zinc-500`

- [ ] **Step 2: Update Button with dark mode variants**

In `src/components/ui/button.tsx`, update variants:
- `primary`: `bg-foreground text-background hover:opacity-90` (uses CSS vars, works in both modes)
- `secondary`: `bg-muted text-foreground hover:bg-border` (uses CSS vars)
- `danger`: keep `bg-red-600 text-white` (works in both modes)
- `ghost`: `text-muted-foreground hover:bg-muted` (uses CSS vars)

- [ ] **Step 3: Update FeedSummary with dark mode**

Replace hardcoded `border-blue-200 bg-blue-50 text-blue-900` with:
`border-accent/20 bg-accent/5 text-foreground`

- [ ] **Step 4: Verify dark mode toggle with all components**

Toggle dark mode and verify Badge, Button, and FeedSummary all look correct.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/badge.tsx src/components/ui/button.tsx src/components/feed/feed-summary.tsx
git commit -m "feat: add dark mode support to Badge, Button, and FeedSummary"
```

---

## Task 15: Related Entries Component

**Files:**
- Create: `src/components/entry/related-entries.tsx`
- Modify: `src/app/entry/[slug]/page.tsx`

**Context:** Spec Section 3.5 requires a related entries section on the entry detail page. Show entries that share the same tools or categories, excluding the current entry.

- [ ] **Step 1: Create related entries component**

```typescript
// src/components/entry/related-entries.tsx
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { eq, and, ne, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

interface RelatedEntriesProps {
  currentEntryId: string;
  tools: string[];
  categories: string[];
}

export async function RelatedEntries({ currentEntryId, tools, categories }: RelatedEntriesProps) {
  // Find entries that share tools or categories with the current entry
  const related = await db
    .select({ id: entries.id, slug: entries.slug, title: entries.title, type: entries.type, tools: entries.tools })
    .from(entries)
    .where(
      and(
        eq(entries.status, "active"),
        eq(entries.confidence, "verified"),
        ne(entries.id, currentEntryId)
      )
    )
    .orderBy(desc(entries.publishedAt))
    .limit(20);

  // Score by overlap
  const scored = related
    .map((entry) => {
      const toolOverlap = entry.tools.filter((t) => tools.includes(t)).length;
      const score = toolOverlap;
      return { ...entry, score };
    })
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (scored.length === 0) return null;

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
        Related
      </h3>
      <div className="space-y-2">
        {scored.map((entry) => (
          <Link
            key={entry.id}
            href={`/entry/${entry.slug}`}
            className="block rounded-lg p-3 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={entry.type as any}>{entry.type}</Badge>
            </div>
            <p className="text-sm font-medium text-card-foreground">{entry.title}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add RelatedEntries to entry detail page**

Import and render `<RelatedEntries currentEntryId={entry.id} tools={entry.tools} categories={entry.categories} />` below the entry body in `src/app/entry/[slug]/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/entry/related-entries.tsx src/app/entry/[slug]/page.tsx
git commit -m "feat: add related entries section to entry detail page"
```

---

## Task 16: Admin UI Tightening

**Files:**
- Modify: `src/app/admin/layout.tsx`

**Context:** Spec Section 3.6 requires the admin UI to feel functional and professional. The current admin layout has basic styling. Tighten spacing, use design tokens for colors, and improve the nav.

- [ ] **Step 1: Update admin layout with design tokens**

In `src/app/admin/layout.tsx`:
- Replace `bg-gray-50` with `bg-muted`
- Replace hardcoded gray nav text colors with `text-muted-foreground` / `text-foreground`
- Add active nav link highlighting based on current path
- Use `font-heading` for the admin title
- Add `dark:` variants for the admin background and nav

- [ ] **Step 2: Verify admin pages in both light and dark mode**

Check `/admin/queue`, `/admin/sources`, `/admin/settings` — all should have consistent styling.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/layout.tsx
git commit -m "feat: tighten admin UI with design tokens and dark mode"
```

---

## Summary

| Task | What | Spec Section |
|------|------|-------------|
| 1 | Rename to "Coding Radar" | 3.1 |
| 2 | Design system — colors, fonts, dark mode tokens (Tailwind v4 CSS-first) | 3.1 |
| 3 | Logo and site header | 3.1 |
| 4 | Relative time utility | 3.2 |
| 5 | Unified clickable entry card | 3.2, 3.3 |
| 6 | Mobile-responsive filters (preserve URL state) | 3.4 |
| 7 | Entry detail page redesign | 3.5 |
| 8 | Dark mode toggle (with anti-FOUC script) | 3.7 |
| 9 | About page | 4.1 |
| 10 | SEO, sitemap, RSS feed | 4.2 |
| 11 | Dynamic OG images (next/og) | 4.3 |
| 12 | Feed stats and trust signals | 4.4 |
| 13 | Performance and accessibility | 4.5 |
| 14 | Dark mode for Badge, Button, FeedSummary | 3.7 |
| 15 | Related entries component | 3.5 |
| 16 | Admin UI tightening | 3.6 |

**After completing this plan:** Proceed to Plan C (Launch Prep) which covers error monitoring, content buffer, edge case QA, analytics, and the final launch checklist.
