"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES } from "@/types";

const TOOLS = ["Claude Code", "Cursor", "Copilot", "Windsurf", "Aider", "Cline"];

export function FeedFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");
  const activeTool = searchParams.get("tool");

  function setFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setFilter("category", null)}
          aria-pressed={!activeCategory}
          className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${
            !activeCategory ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-border"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() =>
              setFilter("category", activeCategory === cat ? null : cat)
            }
            aria-pressed={activeCategory === cat}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${
              activeCategory === cat ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-border"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {TOOLS.map((tool) => (
          <button
            key={tool}
            onClick={() => setFilter("tool", activeTool === tool ? null : tool)}
            aria-pressed={activeTool === tool}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm ${
              activeTool === tool
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-muted text-muted-foreground hover:bg-border"
            }`}
          >
            {tool}
          </button>
        ))}
      </div>
    </div>
  );
}
