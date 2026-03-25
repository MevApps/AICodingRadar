import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sources, ingestionRuns } from "@/lib/db/schema";
import { eq, gte, sql } from "drizzle-orm";
import { processSource } from "@/lib/ingestion/pipeline";
import { RunTracker } from "@/lib/ingestion/tracker";
import { PipelineLogger } from "@/lib/ingestion/logger";

export async function POST() {
  // Concurrency guard
  const [running] = await db
    .select()
    .from(ingestionRuns)
    .where(eq(ingestionRuns.status, "running"))
    .limit(1);

  if (running) {
    return NextResponse.json(
      { error: "Run already in progress", runId: running.id },
      { status: 409 }
    );
  }

  // Budget check
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const budgetCap = parseFloat(process.env.MONTHLY_BUDGET_CAP ?? "50");

  const [monthlySpend] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${ingestionRuns.costUsd}), 0)`,
    })
    .from(ingestionRuns)
    .where(gte(ingestionRuns.startedAt, monthStart));

  if ((monthlySpend?.total ?? 0) >= budgetCap) {
    return NextResponse.json(
      { error: "Monthly budget exceeded" },
      { status: 403 }
    );
  }

  // Create run record
  const [run] = await db
    .insert(ingestionRuns)
    .values({ triggeredBy: "manual" })
    .returning();

  // Execute pipeline in background (non-blocking)
  executeIngestion(run.id).catch(console.error);

  return NextResponse.json({ runId: run.id }, { status: 202 });
}

async function executeIngestion(runId: string) {
  const tracker = new RunTracker();
  const logger = new PipelineLogger();
  let sourcesProcessed = 0;
  let totalCrawled = 0;
  let totalRelevant = 0;
  let totalStructured = 0;
  let totalSupersessions = 0;
  const allErrors: string[] = [];

  try {
    const enabledSources = await db
      .select()
      .from(sources)
      .where(eq(sources.enabled, true));

    for (const source of enabledSources) {
      try {
        logger.startSource(source.id, source.name);
        const result = await processSource(
          {
            id: source.id,
            url: source.url,
            type: source.type,
            name: source.name,
            relevanceThreshold: source.relevanceThreshold,
          },
          tracker,
          logger
        );

        sourcesProcessed++;
        totalCrawled += result.crawled;
        totalRelevant += result.relevant;
        totalStructured += result.structured;
        totalSupersessions += result.supersessionsFound;
        allErrors.push(...result.errors);

        await db
          .update(sources)
          .set({ lastCrawlAt: new Date(), errorCount: 0 })
          .where(eq(sources.id, source.id));

        // Update run progress in DB
        const usage = tracker.getUsage();
        await db
          .update(ingestionRuns)
          .set({
            sourcesProcessed,
            itemsCrawled: totalCrawled,
            itemsRelevant: totalRelevant,
            itemsStructured: totalStructured,
            supersessionsFound: totalSupersessions,
            tokensInput: usage.inputTokens,
            tokensOutput: usage.outputTokens,
            costUsd: usage.costUsd,
          })
          .where(eq(ingestionRuns.id, runId));
      } catch (error) {
        await db
          .update(sources)
          .set({ errorCount: source.errorCount + 1 })
          .where(eq(sources.id, source.id));

        allErrors.push(`${source.name}: ${(error as Error).message}`);
      }
    }

    const usage = tracker.getUsage();
    await db
      .update(ingestionRuns)
      .set({
        status: "completed",
        completedAt: new Date(),
        sourcesProcessed,
        itemsCrawled: totalCrawled,
        itemsRelevant: totalRelevant,
        itemsStructured: totalStructured,
        supersessionsFound: totalSupersessions,
        errors: allErrors,
        tokensInput: usage.inputTokens,
        tokensOutput: usage.outputTokens,
        costUsd: usage.costUsd,
        perSourceResults: logger.getSourceResults(),
      })
      .where(eq(ingestionRuns.id, runId));
  } catch (error) {
    await db
      .update(ingestionRuns)
      .set({
        status: "failed",
        completedAt: new Date(),
        errors: [...allErrors, (error as Error).message],
      })
      .where(eq(ingestionRuns.id, runId));
  }
}
