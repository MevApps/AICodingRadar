import { db } from "./index";
import { entries, sources } from "./schema";

async function seed() {
  console.log("Seeding database...");

  await db.insert(sources).values([
    {
      url: "https://simonwillison.net/atom/everything/",
      type: "rss",
      name: "Simon Willison's Weblog",
      relevanceThreshold: 0.6,
    },
    {
      url: "https://github.com/anthropics/claude-code",
      type: "github",
      name: "Claude Code Releases",
      relevanceThreshold: 0.3,
    },
    {
      url: "https://www.reddit.com/r/cursor",
      type: "reddit",
      name: "r/cursor",
      relevanceThreshold: 0.7,
    },
    {
      url: "https://news.ycombinator.com",
      type: "hackernews",
      name: "Hacker News",
      relevanceThreshold: 0.8,
    },
  ]);

  await db.insert(entries).values([
    {
      type: "tip",
      status: "active",
      confidence: "verified",
      title: "Use Claude Code background agents for long-running test suites",
      slug: "claude-code-background-agents-test-suites",
      summary:
        "Claude Code's background agents can run your test suite while you continue coding. Start them with /background and check results when ready.",
      body: "Claude Code now supports background agents that run independently...",
      tools: ["Claude Code"],
      categories: ["Testing"],
      sources: ["https://docs.anthropic.com/claude-code"],
      publishedAt: new Date(),
      verifiedAt: new Date(),
    },
    {
      type: "comparison",
      status: "active",
      confidence: "verified",
      title: "Cursor vs Claude Code for multi-file refactoring",
      slug: "cursor-vs-claude-code-multi-file-refactoring",
      summary:
        "Both tools handle multi-file refactoring, but with different strengths. Cursor excels at visual diff review, Claude Code at autonomous execution.",
      body: "When it comes to refactoring across multiple files...",
      tools: ["Cursor", "Claude Code"],
      categories: ["Code Generation"],
      sources: [],
      publishedAt: new Date(),
      verifiedAt: new Date(),
    },
    {
      type: "breaking",
      status: "active",
      confidence: "verified",
      title: "GitHub Copilot deprecated legacy chat API — migrate to Copilot Extensions",
      slug: "copilot-deprecated-legacy-chat-api",
      summary:
        "GitHub has deprecated the old Copilot Chat API. Teams using custom integrations must migrate to the new Copilot Extensions framework by April 2026.",
      body: "GitHub announced the deprecation of the legacy Copilot Chat API...",
      tools: ["Copilot"],
      categories: ["Code Generation"],
      sources: ["https://github.blog"],
      publishedAt: new Date(),
      verifiedAt: new Date(),
    },
  ]);

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
