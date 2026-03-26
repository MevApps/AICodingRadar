import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://codingradar.dev";

  const publishedEntries = await db
    .select({ slug: entries.slug, publishedAt: entries.publishedAt })
    .from(entries)
    .where(and(eq(entries.status, "active"), eq(entries.confidence, "verified")));

  const entryUrls = publishedEntries.map((entry) => ({
    url: `${baseUrl}/entry/${entry.slug}`,
    lastModified: entry.publishedAt ?? new Date(),
    changeFrequency: "weekly" as const,
  }));

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "hourly" },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly" },
    ...entryUrls,
  ];
}
