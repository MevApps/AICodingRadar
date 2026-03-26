import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { eq, and, desc, count } from "drizzle-orm";

export async function GET() {
  const [total] = await db
    .select({ count: count() })
    .from(entries)
    .where(and(eq(entries.status, "active"), eq(entries.confidence, "verified")));

  const [latest] = await db
    .select({ publishedAt: entries.publishedAt })
    .from(entries)
    .where(and(eq(entries.status, "active"), eq(entries.confidence, "verified")))
    .orderBy(desc(entries.publishedAt))
    .limit(1);

  return Response.json({
    totalEntries: total.count,
    lastUpdated: latest?.publishedAt?.toISOString() ?? null,
  });
}
