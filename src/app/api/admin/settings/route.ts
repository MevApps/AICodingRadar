import { NextRequest, NextResponse } from "next/server";
import { getAllSettings, setSetting } from "@/lib/settings";

export async function GET() {
  const settings = await getAllSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const { key, value } = await request.json();
  if (!key || value === undefined) {
    return NextResponse.json({ error: "key and value required" }, { status: 400 });
  }
  await setSetting(key, value);
  return NextResponse.json({ success: true });
}
