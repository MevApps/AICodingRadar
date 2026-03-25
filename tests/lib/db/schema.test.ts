import { describe, it, expect } from "vitest";
import { entries, sources, entrySupersessions, ingestionRuns, settings } from "@/lib/db/schema";

describe("entries schema", () => {
  it("has required columns", () => {
    const columns = Object.keys(entries);
    expect(columns).toContain("id");
    expect(columns).toContain("type");
    expect(columns).toContain("status");
    expect(columns).toContain("confidence");
    expect(columns).toContain("title");
    expect(columns).toContain("summary");
    expect(columns).toContain("body");
    expect(columns).toContain("tools");
    expect(columns).toContain("categories");
    expect(columns).toContain("sources");
    expect(columns).toContain("slug");
    expect(columns).toContain("createdAt");
    expect(columns).toContain("verifiedAt");
    expect(columns).toContain("publishedAt");
  });
});

describe("sources schema", () => {
  it("has required columns", () => {
    const columns = Object.keys(sources);
    expect(columns).toContain("id");
    expect(columns).toContain("url");
    expect(columns).toContain("type");
    expect(columns).toContain("name");
    expect(columns).toContain("enabled");
    expect(columns).toContain("relevanceThreshold");
  });
});

describe("entrySupersessions schema", () => {
  it("has foreign key columns", () => {
    const columns = Object.keys(entrySupersessions);
    expect(columns).toContain("supersedingEntryId");
    expect(columns).toContain("supersededEntryId");
  });
});

describe("settings schema", () => {
  it("has required columns", () => {
    const columns = Object.keys(settings);
    expect(columns).toContain("id");
    expect(columns).toContain("key");
    expect(columns).toContain("value");
    expect(columns).toContain("createdAt");
    expect(columns).toContain("updatedAt");
  });
});

describe("ingestionRuns schema", () => {
  it("has required columns", () => {
    const columns = Object.keys(ingestionRuns);
    expect(columns).toContain("id");
    expect(columns).toContain("startedAt");
    expect(columns).toContain("completedAt");
    expect(columns).toContain("status");
    expect(columns).toContain("sourcesProcessed");
    expect(columns).toContain("itemsCrawled");
    expect(columns).toContain("itemsRelevant");
    expect(columns).toContain("itemsStructured");
    expect(columns).toContain("supersessionsFound");
    expect(columns).toContain("errors");
    expect(columns).toContain("tokensInput");
    expect(columns).toContain("tokensOutput");
    expect(columns).toContain("costUsd");
    expect(columns).toContain("triggeredBy");
  });
});
