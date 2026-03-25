import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { and, eq, gt, desc } from "drizzle-orm";
import { getAnthropicClient } from "@/lib/ai/client";

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

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `Summarize these recent AI coding tool updates in 2-3 concise sentences for a tech lead. Be specific about tools and changes:\n\n${recentEntries.map((e) => `- [${e.type}] ${e.title} (${e.tools.join(", ")})`).join("\n")}`,
      },
    ],
  });

  const summary =
    response.content[0].type === "text" ? response.content[0].text : "";

  return NextResponse.json({ summary, count: recentEntries.length });
}
