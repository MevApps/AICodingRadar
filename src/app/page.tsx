import { Suspense } from "react";
import { FeedSummary } from "@/components/feed/feed-summary";
import { FeedFilters } from "@/components/feed/feed-filters";
import { FeedList } from "@/components/feed/feed-list";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">AI Coding Radar</h1>
        <p className="mt-1 text-gray-600">
          What changed in AI coding since you last checked
        </p>
      </header>

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
