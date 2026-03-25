import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { and, eq, gt, desc } from "drizzle-orm";
import { chatWithFallback } from "@/lib/ai/providers";

export async function GET(request: NextRequest) {
  const since = request.nextUrl.searchParams.get("since");

  if (!since) {
    return NextResponse.json({ summary: null });
  }

  const sinceDate = new Date(since);

  const recentEntries = await db
    .select({ title: entries.title, type: entries.type, tools: entries.tools })
    .from(entries)
    .where(
      and(
        eq(entries.status, "active"),
        eq(entries.confidence, "verified"),
        gt(entries.publishedAt, sinceDate)
      )
    )
    .orderBy(desc(entries.publishedAt))
    .limit(10);

  if (recentEntries.length === 0) {
    return NextResponse.json({ summary: null });
  }

  const result = await chatWithFallback({
    system: "You are a helpful assistant that summarizes AI coding tool updates.",
    message: `Summarize these recent AI coding tool updates in 2-3 concise sentences for a tech lead. Be specific about tools and changes:\n\n${recentEntries.map((e) => `- [${e.type}] ${e.title} (${e.tools.join(", ")})`).join("\n")}`,
    maxTokens: 256,
  });

  return NextResponse.json({ summary: result.text, count: recentEntries.length });
}
