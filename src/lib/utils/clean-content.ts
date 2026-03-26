/**
 * Strip HTML tags, decode HTML entities, and clean up raw content from crawlers.
 */
export function cleanContent(html: string): string {
  return html
    // Decode common HTML entities
    .replace(/&#x2F;/g, "/")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    // Strip HTML tags
    .replace(/<[^>]*>/g, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if an item is likely low-quality noise that should be filtered out.
 * Returns true if the item should be SKIPPED.
 */
export function isLowQuality(item: {
  title: string;
  content: string;
  score?: number;
  comments?: number;
}): boolean {
  const title = item.title.toLowerCase();

  // Filter out version-only titles (e.g., "v2.1.80", "0.117.0-alpha.22")
  if (/^v?\d+\.\d+/.test(title) && title.length < 30) return true;

  // Only apply engagement-based filtering when we have engagement data (community sources)
  const hasCommunityData = item.score !== undefined || item.comments !== undefined;

  if (hasCommunityData) {
    // Filter out items with very low engagement (Reddit, HN)
    if ((item.score ?? 0) < 5 && (item.comments ?? 0) < 3) return true;
  }

  // Filter out pure URL content (no actual text beyond links)
  const cleanedContent = item.content.replace(/https?:\/\/\S+/g, "").trim();
  if (cleanedContent.length < 10 && title.length < 20) return true;

  return false;
}
