import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const TYPE_COLORS: Record<string, string> = {
  tip: "#3b82f6",
  comparison: "#a855f7",
  guide: "#22c55e",
  breaking: "#ef4444",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") ?? "Coding Radar";
  const type = searchParams.get("type") ?? "tip";
  const tools = searchParams.get("tools")?.split(",").filter(Boolean) ?? [];

  const accentColor = TYPE_COLORS[type] ?? "#059669";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px",
          backgroundColor: "#0f172a",
          color: "#f5f5f4",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: accentColor,
            }}
          />
          <span style={{ fontSize: "20px", color: "#a8a29e", textTransform: "uppercase", letterSpacing: "2px" }}>
            {type}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px", flex: 1, justifyContent: "center" }}>
          <h1 style={{ fontSize: "48px", fontWeight: 700, lineHeight: 1.2, margin: 0 }}>
            {title.length > 80 ? title.slice(0, 80) + "…" : title}
          </h1>
          {tools.length > 0 && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {tools.slice(0, 4).map((tool) => (
                <span
                  key={tool}
                  style={{
                    backgroundColor: "#292524",
                    padding: "6px 16px",
                    borderRadius: "20px",
                    fontSize: "16px",
                    color: "#a8a29e",
                  }}
                >
                  {tool}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              backgroundColor: "#059669",
            }}
          />
          <span style={{ fontSize: "18px", fontWeight: 600 }}>Coding Radar</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
