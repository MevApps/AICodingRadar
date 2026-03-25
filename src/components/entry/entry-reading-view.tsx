import { Badge } from "@/components/ui/badge";

interface EntryReadingViewProps {
  entry: {
    type: string;
    title: string;
    body: string;
    tools: string[];
    categories: string[];
    publishedAt: string | null;
  };
}

export function EntryReadingView({ entry }: EntryReadingViewProps) {
  return (
    <article className="prose prose-gray mx-auto max-w-2xl">
      <div className="not-prose mb-4 flex gap-2">
        <Badge variant={entry.type as any}>{entry.type}</Badge>
        {entry.tools.map((tool) => (
          <Badge key={tool}>{tool}</Badge>
        ))}
        {entry.categories.map((cat) => (
          <Badge key={cat} variant="default">{cat}</Badge>
        ))}
      </div>

      <h1>{entry.title}</h1>

      {entry.publishedAt && (
        <p className="text-sm text-gray-500">
          {new Date(entry.publishedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      )}

      <div dangerouslySetInnerHTML={{ __html: entry.body }} />
    </article>
  );
}
