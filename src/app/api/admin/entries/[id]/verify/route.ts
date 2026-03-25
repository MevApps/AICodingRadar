import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await db
    .update(entries)
    .set({ verifiedAt: new Date() })
    .where(eq(entries.id, id));

  return NextResponse.json({ success: true });
}
