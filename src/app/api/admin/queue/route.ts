import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const drafts = await db
    .select()
    .from(entries)
    .where(eq(entries.confidence, "draft"))
    .orderBy(desc(entries.createdAt));

  return NextResponse.json({ entries: drafts });
}
