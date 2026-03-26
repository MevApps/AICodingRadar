"use client";

import { useEffect, useState } from "react";

export function FeedSummary() {
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    const lastSeen = localStorage.getItem("coding-radar-last-seen");
    if (!lastSeen) {
      localStorage.setItem("coding-radar-last-seen", new Date().toISOString());
      return;
    }

    fetch(`/api/feed/summary?since=${encodeURIComponent(lastSeen)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.summary) {
          setSummary(data.summary);
        }
      })
      .catch(() => {});

    localStorage.setItem("coding-radar-last-seen", new Date().toISOString());
  }, []);

  if (!summary) return null;

  return (
    <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
      <h2 className="text-sm font-semibold text-foreground">
        Since you&apos;ve been gone
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
    </div>
  );
}
