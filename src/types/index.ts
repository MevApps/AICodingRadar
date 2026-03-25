export const ENTRY_TYPES = ["tip", "comparison", "guide", "breaking"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export const ENTRY_STATUSES = ["active", "superseded", "archived", "rejected"] as const;
export type EntryStatus = (typeof ENTRY_STATUSES)[number];

export const CONFIDENCE_LEVELS = ["draft", "verified"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const SOURCE_TYPES = ["rss", "github", "reddit", "hackernews", "twitter", "scraper"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const CATEGORIES = [
  "Code Generation",
  "Code Review",
  "Testing",
  "Debugging",
  "DevOps",
  "Architecture",
] as const;
export type Category = (typeof CATEGORIES)[number];
