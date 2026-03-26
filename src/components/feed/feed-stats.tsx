"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/utils/relative-time";

interface FeedStatsData {
  totalEntries: number;
  lastUpdated: string | null;
}

export function FeedStats() {
  const [stats, setStats] = useState<FeedStatsData | null>(null);

  useEffect(() => {
    fetch("/api/feed/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats || stats.totalEntries === 0) return null;

  return (
    <p className="text-xs text-muted-foreground mb-4">
      {stats.totalEntries} entries
      {stats.lastUpdated && ` · Updated ${formatRelativeTime(stats.lastUpdated)}`}
    </p>
  );
}
