"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface IngestionRun {
  id: string;
  status: string;
  startedAt: string;
  itemsCrawled: number;
  itemsStructured: number;
  errors: string[];
  costUsd: number;
  triggeredBy: string;
}

export function RunHistory({ runs }: { runs: IngestionRun[] }) {
  const [expanded, setExpanded] = useState(false);
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
      <div className="space-y-2">
        {visible.map((run) => (
          <div key={run.id} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  run.status === "completed" ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              <span className="text-gray-600">
                {new Date(run.startedAt).toLocaleString(undefined, {
                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                })}
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
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
