"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  costUsd: number;
  triggeredBy: string;
}

interface IngestionBarProps {
  lastRun: IngestionRun | null;
  isRunning: boolean;
  budgetExceeded: boolean;
  schedule: string;
  onTrigger: () => Promise<void>;
}

export function IngestionBar({
  lastRun,
  isRunning,
  budgetExceeded,
  schedule,
  onTrigger,
}: IngestionBarProps) {
  const [triggering, setTriggering] = useState(false);

  async function handleTrigger() {
    setTriggering(true);
    await onTrigger();
    setTriggering(false);
  }

  function getNextRunTime(): string {
    const now = new Date();
    const next = new Date(now);
    next.setHours(next.getHours() + 1, 0, 0, 0);
    const diffMin = Math.round((next.getTime() - now.getTime()) / 60000);
    return `${diffMin} min`;
  }

  function getRelativeTime(run: IngestionRun): string {
    // Use completedAt if available, fall back to startedAt
    const dateStr = run.completedAt ?? run.startedAt;
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.round(diff / 60000);
    if (minutes < 0) return "just now"; // guard against clock skew
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-6">
        <div className="flex-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Last Run
          </span>
          {lastRun ? (
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  lastRun.status === "completed" ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm font-medium">
                {getRelativeTime(lastRun)}
              </span>
              <span className="text-xs text-gray-500">
                {lastRun.itemsCrawled} crawled, {lastRun.itemsRelevant} relevant,{" "}
                {lastRun.itemsStructured} structured
                {lastRun.errors.length > 0 && `, ${lastRun.errors.length} errors`}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-400">No runs yet</p>
          )}
        </div>

        <div className="text-center">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Next Run
          </span>
          <p className="mt-1 text-sm font-medium">in {getNextRunTime()}</p>
          <p className="text-xs text-gray-400">Every hour</p>
        </div>

        <div>
          {budgetExceeded ? (
            <Badge variant="breaking">Budget Exceeded</Badge>
          ) : (
            <Button
              size="sm"
              disabled={isRunning || triggering}
              onClick={handleTrigger}
            >
              {isRunning || triggering ? "Ingesting..." : "Run Now"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
