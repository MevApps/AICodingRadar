import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { eq, and, ne, desc } from "drizzle-orm";

interface RelatedEntriesProps {
  currentEntryId: string;
  tools: string[];
}

export async function RelatedEntries({ currentEntryId, tools }: RelatedEntriesProps) {
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

  // Score by tool overlap
  const scored = related
    .map((entry) => {
      const toolOverlap = entry.tools.filter((t) => tools.includes(t)).length;
      return { ...entry, score: toolOverlap };
    })
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (scored.length === 0) return null;

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
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
