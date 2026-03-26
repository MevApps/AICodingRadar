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
