import { notFound } from "next/navigation";
import { getEntryBySlug } from "@/lib/feed/queries";
import { EntryReadingView } from "@/components/entry/entry-reading-view";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const entry = await getEntryBySlug(slug);
  if (!entry) return { title: "Not Found" };
  return { title: entry.title, description: entry.summary };
}

export default async function EntryPage({ params }: Props) {
  const { slug } = await params;
  const entry = await getEntryBySlug(slug);

  if (!entry) notFound();

  return (
    <main className="px-4 py-8">
      <EntryReadingView
        entry={{
          ...entry,
          publishedAt: entry.publishedAt?.toISOString() ?? null,
        }}
      />
    </main>
  );
}
