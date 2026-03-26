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
