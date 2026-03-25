import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ingestionRuns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  const [run] = await db
    .select()
    .from(ingestionRuns)
    .where(eq(ingestionRuns.id, runId))
    .limit(1);

  if (!run) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ run });
}
