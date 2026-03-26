"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MetricCard } from "./metric-card";
import { IngestionBar } from "./ingestion-bar";
import { RunHistory } from "./run-history";
import { LiveIngestionLog } from "./live-ingestion-log";

interface DashboardStats {
  queue: { count: number };
  sources: { healthy: number; unhealthy: number; total: number; lastCrawlAt: string | null };
  content: { total: number; byType: Record<string, number>; staleCount: number };
  cost: { currentMonth: number; budgetCap: number; tokensInput: number; tokensOutput: number };
  recentRuns: any[];
  schedule: string;
}

export function StatusDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("admin-dashboard-collapsed") === "true";
    }
    return false;
  });
  const [pollingRunId, setPollingRunId] = useState<string | null>(null);
  const [showLiveLog, setShowLiveLog] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStats(data);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  useEffect(() => {
    if (!pollingRunId) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/admin/ingest/${pollingRunId}`);
      const data = await res.json();
      if (data.run.status !== "running") {
        setPollingRunId(null);
        fetchStats();
      }
    }, 2000);
    const timeout = setTimeout(() => { setPollingRunId(null); }, 5 * 60 * 1000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [pollingRunId, fetchStats]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("admin-dashboard-collapsed", String(next));
  }

  async function handleTrigger(manualMode: boolean = false) {
    const res = await fetch("/api/admin/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manualMode }),
    });
    if (res.ok) {
      const data = await res.json();
      setPollingRunId(data.runId);
      setShowLiveLog(true);
    }
    fetchStats();
  }

  if (error && !stats) {
    return (
      <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
        Dashboard unavailable — retrying...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="mb-6 space-y-3">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
        <div className="h-16 animate-pulse rounded-lg bg-gray-200" />
      </div>
    );
  }

  const isRunning = !!pollingRunId || stats.recentRuns.some((r) => r.status === "running");
  const budgetExceeded = stats.cost.currentMonth >= stats.cost.budgetCap;
  const lastRun = stats.recentRuns[0] ?? null;
  const queueStatus = stats.queue.count > 20 ? "red" : stats.queue.count > 10 ? "amber" : "green";
  const costPercent = (stats.cost.currentMonth / stats.cost.budgetCap) * 100;
  const costStatus = costPercent > 85 ? "red" : costPercent > 60 ? "amber" : "green";

  return (
    <div className="mb-6">
      <button
        onClick={toggleCollapsed}
        className="mb-2 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
      >
        <span>{collapsed ? "▶" : "▼"}</span>
        <span>Dashboard</span>
      </button>

      {collapsed ? (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs text-gray-600">
          {stats.queue.count} drafts · {stats.sources.healthy}/{stats.sources.total} sources healthy · ${stats.cost.currentMonth.toFixed(2)} spent · {lastRun ? `Last run ${Math.round((Date.now() - new Date(lastRun.startedAt).getTime()) / 60000)}m ago` : "No runs"}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <MetricCard
              title="Queue"
              value={String(stats.queue.count)}
              subtitle="Drafts pending"
              status={queueStatus}
              onClick={() => router.push("/admin/queue")}
            />
            <MetricCard
              title="Sources"
              value={`${stats.sources.healthy} / ${stats.sources.total}`}
              subtitle={stats.sources.unhealthy > 0 ? `${stats.sources.unhealthy} unhealthy` : "All healthy"}
              status={stats.sources.unhealthy > 0 ? "red" : "green"}
              onClick={() => router.push("/admin/sources")}
            />
            <MetricCard
              title="Content"
              value={String(stats.content.total)}
              subtitle={
                Object.entries(stats.content.byType)
                  .map(([type, count]) => `${count} ${type}s`)
                  .join(" · ") || "No entries"
              }
            >
              {stats.content.staleCount > 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  {stats.content.staleCount} need re-verification
                </p>
              )}
            </MetricCard>
            <MetricCard
              title="Cost"
              value={`$${stats.cost.currentMonth.toFixed(2)}`}
              subtitle={`of $${stats.cost.budgetCap} budget`}
              status={costStatus}
            >
              <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    costStatus === "red" ? "bg-red-500" : costStatus === "amber" ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(costPercent, 100)}%` }}
                />
              </div>
            </MetricCard>
          </div>

          <IngestionBar
            lastRun={lastRun}
            isRunning={isRunning}
            budgetExceeded={budgetExceeded}
            schedule={stats.schedule}
            onTrigger={handleTrigger}
          />

          <RunHistory runs={stats.recentRuns} />
        </div>
      )}
      <LiveIngestionLog visible={showLiveLog} onClose={() => setShowLiveLog(false)} />
    </div>
  );
}
