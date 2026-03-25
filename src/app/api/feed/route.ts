import { NextRequest, NextResponse } from "next/server";
import { getFeedEntries, buildFeedFilters } from "@/lib/feed/queries";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const filters = buildFeedFilters({
    category: params.get("category") ?? undefined,
    tool: params.get("tool") ?? undefined,
    type: params.get("type") ?? undefined,
  });

  const cursor = params.get("cursor") ?? undefined;
  const limit = Math.min(parseInt(params.get("limit") ?? "20"), 50);
  const sort = (params.get("sort") as "latest" | "breaking_first") ?? "latest";

  const result = await getFeedEntries({ cursor, limit, filters, sort });

  return NextResponse.json(result);
}
