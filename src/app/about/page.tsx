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
    <main className="mx-auto max-w-[65ch] px-4 py-12">
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
