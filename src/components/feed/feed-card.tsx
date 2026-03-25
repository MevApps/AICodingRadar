import { TipCard } from "./tip-card";
import { ComparisonCard } from "./comparison-card";
import { GuideCard } from "./guide-card";
import { BreakingCard } from "./breaking-card";
import { Badge } from "@/components/ui/badge";

interface Entry {
  id: string;
  type: "tip" | "comparison" | "guide" | "breaking";
  title: string;
  summary: string;
  body: string;
  tools: string[];
  categories: string[];
  slug: string;
}

export function FeedCard({ entry }: { entry: Entry }) {
  return (
    <article>
      <div className="mb-1">
        <Badge variant={entry.type}>{entry.type}</Badge>
      </div>
      {entry.type === "tip" && (
        <TipCard title={entry.title} summary={entry.summary} tools={entry.tools} />
      )}
      {entry.type === "comparison" && (
        <ComparisonCard title={entry.title} summary={entry.summary} tools={entry.tools} />
      )}
      {entry.type === "guide" && (
        <GuideCard title={entry.title} summary={entry.summary} tools={entry.tools} categories={entry.categories} />
      )}
      {entry.type === "breaking" && (
        <BreakingCard title={entry.title} summary={entry.summary} tools={entry.tools} />
      )}
    </article>
  );
}
