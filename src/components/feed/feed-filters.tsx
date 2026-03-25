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
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter("category", null)}
          className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${
            !activeCategory ? "bg-black text-white" : "bg-gray-100 text-gray-700"
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
            className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${
              activeCategory === cat ? "bg-black text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {TOOLS.map((tool) => (
          <button
            key={tool}
            onClick={() => setFilter("tool", activeTool === tool ? null : tool)}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm ${
              activeTool === tool
                ? "border-black bg-black text-white"
                : "border-gray-300 text-gray-600"
            }`}
          >
            {tool}
          </button>
        ))}
      </div>
    </div>
  );
}
