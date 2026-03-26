import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEntryBySlug } from "@/lib/feed/queries";
import { Badge } from "@/components/ui/badge";
import { RelativeTime } from "@/components/ui/relative-time";
import { EntrySources } from "@/components/entry/entry-sources";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getEntryBySlug(slug);
  if (!entry) return { title: "Not found" };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://codingradar.dev";
  const tools: string[] = Array.isArray(entry.tools) ? (entry.tools as string[]) : [];

  return {
    title: entry.title,
    description: entry.summary,
    openGraph: {
      title: entry.title,
      description: entry.summary ?? undefined,
      type: "article",
      publishedTime: entry.publishedAt?.toISOString(),
      images: [`${baseUrl}/api/og?title=${encodeURIComponent(entry.title)}&type=${entry.type}&tools=${encodeURIComponent(tools.join(","))}`],
    },
    twitter: {
      card: "summary_large_image",
      title: entry.title,
      description: entry.summary ?? undefined,
    },
  };
}

export default async function EntryPage({ params }: Props) {
  const { slug } = await params;
  const entry = await getEntryBySlug(slug);

  if (!entry) notFound();

  const publishedAt = entry.publishedAt?.toISOString() ?? null;
  const tools: string[] = Array.isArray(entry.tools) ? (entry.tools as string[]) : [];
  const sources: string[] = Array.isArray(entry.sources) ? (entry.sources as string[]) : [];

  return (
    <main className="px-4 py-8">
      <div className="max-w-[65ch] mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          ← Back to feed
        </Link>

        {entry.status === "superseded" && (
          <div className="mb-6 rounded-md border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
            This entry has been superseded by a newer entry.
          </div>
        )}

        <article>
          <header className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant={(entry.type as "tip" | "comparison" | "guide" | "breaking" | "default") ?? "default"}>
                {entry.type}
              </Badge>
              {publishedAt && (
                <RelativeTime
                  date={publishedAt}
                  className="text-xs text-muted-foreground"
                />
              )}
            </div>

            <h1 className="font-heading text-3xl font-bold text-foreground mb-4">
              {entry.title}
            </h1>

            {tools.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tools.map((tool) => (
                  <Badge key={tool} variant="default">
                    {tool}
                  </Badge>
                ))}
              </div>
            )}
          </header>

          {entry.summary && (
            <p className="text-base text-muted-foreground leading-relaxed mb-6 border-l-2 border-border pl-4 italic">
              {entry.summary}
            </p>
          )}

          {entry.body && (
            <div className="prose prose-sm max-w-none text-foreground leading-relaxed space-y-4">
              {entry.body.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          )}

          {publishedAt && (
            <p className="mt-6 text-xs text-muted-foreground">
              Published{" "}
              <time dateTime={publishedAt}>
                {new Date(publishedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </p>
          )}

          <EntrySources sources={sources} />
        </article>
      </div>
    </main>
  );
}
