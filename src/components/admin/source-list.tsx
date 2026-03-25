"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SourceForm } from "./source-form";
import type { SourceType } from "@/types";

interface Source {
  id: string;
  url: string;
  type: string;
  name: string;
  enabled: boolean;
  errorCount: number;
  lastCrawlAt: string | null;
  relevanceThreshold: number;
}

export function SourceList() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSources = useCallback(async () => {
    const res = await fetch("/api/admin/sources");
    const data = await res.json();
    setSources(data.sources);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  async function handleAdd(source: { url: string; type: SourceType; name: string }) {
    const res = await fetch("/api/admin/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(source),
    });
    if (res.ok) {
      fetchSources();
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/sources/${id}`, { method: "DELETE" });
    setSources((prev) => prev.filter((s) => s.id !== id));
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading sources...</p>;
  }

  return (
    <div className="space-y-6">
      <SourceForm onSubmit={handleAdd} />

      <div className="space-y-3">
        {sources.map((source) => (
          <Card key={source.id} className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{source.name}</span>
                <Badge>{source.type}</Badge>
                {source.errorCount > 2 && (
                  <Badge variant="breaking">Unhealthy</Badge>
                )}
                {!source.enabled && (
                  <Badge variant="superseded">Disabled</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">{source.url}</p>
              {source.lastCrawlAt && (
                <p className="text-xs text-gray-400">
                  Last crawl: {new Date(source.lastCrawlAt).toLocaleString()}
                </p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(source.id)}>
              Remove
            </Button>
          </Card>
        ))}

        {sources.length === 0 && (
          <p className="text-sm text-gray-500">No sources configured yet.</p>
        )}
      </div>
    </div>
  );
}
