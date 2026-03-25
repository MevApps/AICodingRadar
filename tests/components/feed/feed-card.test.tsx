import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { FeedCard } from "@/components/feed/feed-card";

afterEach(() => {
  cleanup();
});

const mockTip = {
  id: "1",
  type: "tip" as const,
  title: "Use Claude Code background agents for test runs",
  summary: "Background agents can run your tests while you keep coding.",
  body: "",
  tools: ["Claude Code"],
  categories: ["Testing"],
  slug: "use-claude-code-background-agents",
};

describe("FeedCard", () => {
  it("renders tip card with title and summary", () => {
    render(<FeedCard entry={mockTip} />);
    expect(screen.getByText(mockTip.title)).toBeDefined();
    expect(screen.getByText(mockTip.summary)).toBeDefined();
  });

  it("shows tool badges", () => {
    render(<FeedCard entry={mockTip} />);
    expect(screen.getByText("Claude Code")).toBeDefined();
  });

  it("shows entry type badge", () => {
    render(<FeedCard entry={mockTip} />);
    expect(screen.getByText("tip")).toBeDefined();
  });
});
