import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { processSource } from "@/lib/ingestion/pipeline";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enabledSources = await db
    .select()
    .from(sources)
    .where(eq(sources.enabled, true));

  const results = [];

  for (const source of enabledSources) {
    try {
      const result = await processSource({
        id: source.id,
        url: source.url,
        type: source.type,
        name: source.name,
        relevanceThreshold: source.relevanceThreshold,
      });

      await db
        .update(sources)
        .set({ lastCrawlAt: new Date(), errorCount: 0 })
        .where(eq(sources.id, source.id));

      results.push({ source: source.name, ...result });
    } catch (error) {
      await db
        .update(sources)
        .set({ errorCount: source.errorCount + 1 })
        .where(eq(sources.id, source.id));

      results.push({
        source: source.name,
        error: (error as Error).message,
      });
    }
  }

  return NextResponse.json({ results });
}
