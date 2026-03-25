import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueueItem } from "@/components/admin/queue-item";

afterEach(cleanup);

const mockDraft = {
  id: "1",
  type: "tip" as const,
  title: "Test Draft Entry",
  summary: "A test draft waiting for review",
  body: "Full body content here",
  tools: ["Claude Code"],
  categories: ["Testing"],
  sources: ["https://example.com/source"],
  confidence: "draft" as const,
  createdAt: new Date().toISOString(),
};

describe("QueueItem", () => {
  it("renders draft entry with title and summary", () => {
    render(<QueueItem entry={mockDraft} onAction={vi.fn()} />);
    expect(screen.getByText("Test Draft Entry")).toBeDefined();
    expect(screen.getByText("A test draft waiting for review")).toBeDefined();
  });

  it("shows approve and reject buttons", () => {
    render(<QueueItem entry={mockDraft} onAction={vi.fn()} />);
    expect(screen.getByText("Approve")).toBeDefined();
    expect(screen.getByText("Reject")).toBeDefined();
  });
});
