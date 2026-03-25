import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const EDITABLE_FIELDS = ["title", "summary", "body", "tools", "categories", "type"] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Build update object with only valid fields
  const updates: Record<string, unknown> = {};
  const editedFields: string[] = [];

  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
      editedFields.push(field);
    }
  }

  if (editedFields.length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  updates.editedFields = JSON.stringify(editedFields);

  const [updated] = await db
    .update(entries)
    .set(updates)
    .where(eq(entries.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, entry: updated });
}
