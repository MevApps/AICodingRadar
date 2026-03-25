import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sources, ingestionRuns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { processSource } from "@/lib/ingestion/pipeline";
import { RunTracker } from "@/lib/ingestion/tracker";
import { PipelineLogger } from "@/lib/ingestion/logger";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [run] = await db
    .insert(ingestionRuns)
    .values({ triggeredBy: "cron" })
    .returning();

  const tracker = new RunTracker();
  const logger = new PipelineLogger();
  const enabledSources = await db
    .select()
    .from(sources)
    .where(eq(sources.enabled, true));

  let sourcesProcessed = 0;
  let totalCrawled = 0;
  let totalRelevant = 0;
  let totalStructured = 0;
  let totalSupersessions = 0;
  const allErrors: string[] = [];

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
    .where(eq(ingestionRuns.id, run.id));

  return NextResponse.json({
    runId: run.id,
    sourcesProcessed,
    itemsCrawled: totalCrawled,
    itemsRelevant: totalRelevant,
    itemsStructured: totalStructured,
    errors: allErrors,
    cost: usage.costUsd,
  });
}
