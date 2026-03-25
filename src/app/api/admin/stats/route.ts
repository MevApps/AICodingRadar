import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entries, sources, ingestionRuns } from "@/lib/db/schema";
import { eq, and, desc, sql, lt, gte, count } from "drizzle-orm";

export async function GET() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Queue count
  const [queueResult] = await db
    .select({ count: count() })
    .from(entries)
    .where(eq(entries.confidence, "draft"));
  const queueCount = queueResult.count;

  // Source health (only enabled sources)
  const allSources = await db.select().from(sources).where(eq(sources.enabled, true));
  const healthySources = allSources.filter((s) => s.errorCount <= 2);
  const unhealthySources = allSources.filter((s) => s.errorCount > 2);
  const lastCrawl = allSources
    .filter((s) => s.lastCrawlAt)
    .sort((a, b) => new Date(b.lastCrawlAt!).getTime() - new Date(a.lastCrawlAt!).getTime())[0]?.lastCrawlAt ?? null;

  // Content counts by type
  const activeEntries = await db
    .select({ type: entries.type, count: count() })
    .from(entries)
    .where(eq(entries.status, "active"))
    .groupBy(entries.type);

  const totalActive = activeEntries.reduce((sum, e) => sum + e.count, 0);

  // Stale entries
  const [staleResult] = await db
    .select({ count: count() })
    .from(entries)
    .where(
      and(
        eq(entries.status, "active"),
        eq(entries.confidence, "verified"),
        lt(entries.verifiedAt, sixtyDaysAgo)
      )
    );

  // Monthly cost
  const monthlyRuns = await db
    .select({
      totalCost: sql<number>`COALESCE(SUM(${ingestionRuns.costUsd}), 0)`,
      totalInput: sql<number>`COALESCE(SUM(${ingestionRuns.tokensInput}), 0)`,
      totalOutput: sql<number>`COALESCE(SUM(${ingestionRuns.tokensOutput}), 0)`,
    })
    .from(ingestionRuns)
    .where(gte(ingestionRuns.startedAt, monthStart));

  // Recent runs
  const recentRuns = await db
    .select()
    .from(ingestionRuns)
    .orderBy(desc(ingestionRuns.startedAt))
    .limit(10);

  // Auto-heal stale running jobs (>10 min)
  const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
  await db
    .update(ingestionRuns)
    .set({ status: "failed", completedAt: now })
    .where(
      and(
        eq(ingestionRuns.status, "running"),
        lt(ingestionRuns.startedAt, tenMinAgo)
      )
    );

  const budgetCap = parseFloat(process.env.MONTHLY_BUDGET_CAP ?? "50");

  return NextResponse.json({
    queue: { count: queueCount },
    sources: {
      healthy: healthySources.length,
      unhealthy: unhealthySources.length,
      total: allSources.length,
      lastCrawlAt: lastCrawl,
    },
    content: {
      total: totalActive,
      byType: Object.fromEntries(activeEntries.map((e) => [e.type, e.count])),
      staleCount: staleResult.count,
    },
    cost: {
      currentMonth: monthlyRuns[0]?.totalCost ?? 0,
      budgetCap,
      tokensInput: monthlyRuns[0]?.totalInput ?? 0,
      tokensOutput: monthlyRuns[0]?.totalOutput ?? 0,
    },
    recentRuns,
    schedule: "0 * * * *",
  });
}
