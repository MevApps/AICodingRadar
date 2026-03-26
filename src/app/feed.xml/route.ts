import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://codingradar.dev";

  const published = await db
    .select()
    .from(entries)
    .where(and(eq(entries.status, "active"), eq(entries.confidence, "verified")))
    .orderBy(desc(entries.publishedAt))
    .limit(50);

  const items = published
    .map((entry) => `
    <item>
      <title><![CDATA[${entry.title}]]></title>
      <link>${baseUrl}/entry/${entry.slug}</link>
      <description><![CDATA[${entry.summary}]]></description>
      <pubDate>${entry.publishedAt ? new Date(entry.publishedAt).toUTCString() : ""}</pubDate>
      <guid>${baseUrl}/entry/${entry.slug}</guid>
    </item>`)
    .join("");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Coding Radar</title>
    <link>${baseUrl}</link>
    <description>Stay sharp on AI coding tools — curated, structured, evergreen.</description>
    <language>en</language>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
