"use client";

import { useEffect, useState, useCallback } from "react";
import { QueueItem } from "./queue-item";

interface QueueEntry {
  id: string;
  type: string;
  title: string;
  summary: string;
  body: string;
  tools: string[];
  categories: string[];
  sources: string[];
  confidence: string;
  createdAt: string;
}

export function QueueList() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = useCallback(async () => {
    const res = await fetch("/api/admin/queue");
    const data = await res.json();
    setEntries(data.entries);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  async function handleAction(id: string, action: "approve" | "reject") {
    await fetch(`/api/admin/entries/${id}/${action}`, { method: "POST" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading queue...</p>;
  }

  if (entries.length === 0) {
    return <p className="text-sm text-gray-500">No drafts pending review.</p>;
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <QueueItem key={entry.id} entry={entry} onAction={handleAction} />
      ))}
    </div>
  );
}
