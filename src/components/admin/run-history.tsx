"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SourceResult {
  sourceId: string;
  sourceName: string;
  crawl: { itemsFound: number; errors: string[] };
  relevance: { itemsScored: number; itemsPassed: number; scores: number[] };
  structuring: { itemsStructured: number; errors: string[] };
  supersession: { checked: number; found: number };
}

interface IngestionRun {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  sourcesProcessed: number;
  itemsCrawled: number;
  itemsRelevant: number;
  itemsStructured: number;
  supersessionsFound: number;
  errors: string[];
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  perSourceResults: SourceResult[] | null;
  triggeredBy: string;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RunDetail({ run }: { run: IngestionRun }) {
  return (
    <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Status</span>
          <span className={run.status === "completed" ? "text-emerald-600" : "text-red-600"}>
            {run.status}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Triggered by</span>
          <span>{run.triggeredBy}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Sources processed</span>
          <span>{run.sourcesProcessed}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Items crawled</span>
          <span>{run.itemsCrawled}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Relevant</span>
          <span>{run.itemsRelevant}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Structured</span>
          <span>{run.itemsStructured}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Supersessions</span>
          <span>{run.supersessionsFound}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Cost</span>
          <span>${run.costUsd.toFixed(4)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Tokens (in/out)</span>
          <span>{Number(run.tokensInput).toLocaleString()} / {Number(run.tokensOutput).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Duration</span>
          <span>
            {run.completedAt
              ? `${Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`
              : "—"}
          </span>
        </div>
      </div>

      {/* Per-source results */}
      {run.perSourceResults && run.perSourceResults.length > 0 && (
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Per Source
          </span>
          <div className="mt-1 space-y-2">
            {run.perSourceResults.map((src) => (
              <div key={src.sourceId} className="rounded bg-gray-50 px-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{src.sourceName}</span>
                  <div className="flex gap-3 text-gray-500">
                    <span>{src.crawl.itemsFound} crawled</span>
                    <span>{src.relevance.itemsPassed} relevant</span>
                    <span>{src.structuring.itemsStructured} structured</span>
                    {src.supersession.found > 0 && (
                      <span className="text-amber-600">{src.supersession.found} superseded</span>
                    )}
                  </div>
                </div>
                {src.relevance.scores.length > 0 && (
                  <div className="mt-1 text-gray-400">
                    Relevance scores: {src.relevance.scores.map((s) => s.toFixed(1)).join(", ")}
                  </div>
                )}
                {src.crawl.errors.length > 0 && (
                  <div className="mt-1 text-red-500">
                    {src.crawl.errors.map((e, i) => (
                      <div key={i}>{e}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Errors */}
      {run.errors.length > 0 && (
        <div>
          <span className="text-xs font-medium text-red-500 uppercase tracking-wide">
            Errors ({run.errors.length})
          </span>
          <div className="mt-1 max-h-48 overflow-y-auto space-y-1">
            {run.errors.map((error, i) => (
              <div
                key={i}
                className="rounded bg-red-50 px-3 py-1.5 text-xs text-red-700 break-words"
              >
                {error.length > 200 ? error.slice(0, 200) + "…" : error}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function RunHistory({ runs }: { runs: IngestionRun[] }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const visible = expanded ? runs : runs.slice(0, 5);

  if (runs.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Recent Runs
        </span>
        {runs.length > 5 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-500 hover:text-black"
          >
            {expanded ? "Show less" : "Show all"}
          </button>
        )}
      </div>
      <div className="space-y-1">
        {visible.map((run) => (
          <div key={run.id}>
            <button
              onClick={() => setSelectedRunId(selectedRunId === run.id ? null : run.id)}
              className="flex w-full items-center justify-between text-xs py-1.5 px-1 rounded hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    run.status === "completed" ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
                <span className="text-gray-600">
                  {formatTime(run.completedAt ?? run.startedAt)}
                </span>
                <Badge variant={run.triggeredBy === "cron" ? "default" : "tip"}>
                  {run.triggeredBy}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-gray-500">
                <span>{run.itemsCrawled} crawled</span>
                <span>{run.itemsStructured} structured</span>
                {run.errors.length > 0 && (
                  <span className="text-red-500">{run.errors.length} errors</span>
                )}
                <span>${run.costUsd.toFixed(3)}</span>
                <span className="text-gray-400">{selectedRunId === run.id ? "▲" : "▼"}</span>
              </div>
            </button>
            {selectedRunId === run.id && <RunDetail run={run} />}
          </div>
        ))}
      </div>
    </Card>
  );
}
