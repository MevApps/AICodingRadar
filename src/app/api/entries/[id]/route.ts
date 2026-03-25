import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSupersessionLinks } from "@/lib/feed/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const entry = await db
    .select()
    .from(entries)
    .where(eq(entries.id, id))
    .limit(1);

  if (!entry[0]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const links = await getSupersessionLinks(id);

  return NextResponse.json({ entry: entry[0], ...links });
}
