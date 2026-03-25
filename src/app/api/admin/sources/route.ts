import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import type { SourceType } from "@/types";

export async function GET() {
  const allSources = await db
    .select()
    .from(sources)
    .orderBy(desc(sources.createdAt));

  return NextResponse.json({ sources: allSources });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { url, type, name, crawlInterval, relevanceThreshold } = body as {
    url: string;
    type: SourceType;
    name: string;
    crawlInterval?: string;
    relevanceThreshold?: number;
  };

  if (!url || !type || !name) {
    return NextResponse.json(
      { error: "url, type, and name are required" },
      { status: 400 }
    );
  }

  const [newSource] = await db
    .insert(sources)
    .values({
      url,
      type,
      name,
      crawlInterval: crawlInterval ?? "1 hour",
      relevanceThreshold: relevanceThreshold ?? 0.5,
    })
    .returning();

  return NextResponse.json({ source: newSource }, { status: 201 });
}
