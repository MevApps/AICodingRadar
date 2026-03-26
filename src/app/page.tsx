import { Suspense } from "react";
import { FeedSummary } from "@/components/feed/feed-summary";
import { FeedFilters } from "@/components/feed/feed-filters";
import { FeedList } from "@/components/feed/feed-list";
import { FeedHeader } from "@/components/feed/feed-header";
import { FeedStats } from "@/components/feed/feed-stats";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <FeedHeader />
      <p className="mt-1 text-muted-foreground mb-8">
        What changed in AI coding since you last checked
      </p>

      <FeedStats />

      <div className="space-y-6">
        <Suspense fallback={null}>
          <FeedSummary />
        </Suspense>

        <Suspense fallback={null}>
          <FeedFilters />
        </Suspense>

        <Suspense fallback={<div className="py-8 text-center text-sm text-gray-500">Loading...</div>}>
          <FeedList />
        </Suspense>
      </div>
    </main>
  );
}
