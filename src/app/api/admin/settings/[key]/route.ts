import { NextRequest, NextResponse } from "next/server";
import { deleteSetting } from "@/lib/settings";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  await deleteSetting(key);
  return NextResponse.json({ success: true });
}
