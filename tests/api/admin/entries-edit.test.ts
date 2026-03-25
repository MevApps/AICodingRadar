import { describe, it, expect, vi, beforeEach } from "vitest";

const mockReturning = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: mockReturning,
        }),
      }),
    }),
  },
}));

describe("PUT /api/admin/entries/[id]/edit", () => {
  beforeEach(() => {
    vi.resetModules();
    mockReturning.mockReset();
  });

  it("updates entry fields and records which fields were edited", async () => {
    mockReturning.mockResolvedValue([{
      id: "test-id",
      title: "Updated Title",
      summary: "Updated Summary",
      editedFields: '["title","summary"]',
    }]);

    const { PUT } = await import("@/app/api/admin/entries/[id]/edit/route");

    const request = new Request("http://localhost/api/admin/entries/test-id/edit", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Updated Title",
        summary: "Updated Summary",
      }),
    });

    const response = await PUT(request, {
      params: Promise.resolve({ id: "test-id" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it("returns 400 when no valid fields are provided", async () => {
    const { PUT } = await import("@/app/api/admin/entries/[id]/edit/route");

    const request = new Request("http://localhost/api/admin/entries/test-id/edit", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invalidField: "value" }),
    });

    const response = await PUT(request, {
      params: Promise.resolve({ id: "test-id" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 404 when entry does not exist", async () => {
    mockReturning.mockResolvedValue([]);

    const { PUT } = await import("@/app/api/admin/entries/[id]/edit/route");

    const request = new Request("http://localhost/api/admin/entries/nonexistent/edit", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Title" }),
    });

    const response = await PUT(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(response.status).toBe(404);
  });
});
