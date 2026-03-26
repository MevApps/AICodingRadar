"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface IngestionEvent {
  type: string;
  timestamp: number;
  data: Record<string, any>;
}

interface SourceStatus {
  name: string;
  status: "waiting" | "crawling" | "complete" | "error";
  crawled?: number;
  relevant?: number;
  structured?: number;
  errors?: number;
}

interface LiveIngestionLogProps {
  visible: boolean;
  onClose: () => void;
}

export function LiveIngestionLog({ visible, onClose }: LiveIngestionLogProps) {
  const [events, setEvents] = useState<IngestionEvent[]>([]);
  const [sources, setSources] = useState<Map<string, SourceStatus>>(new Map());
  const [currentItem, setCurrentItem] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [totals, setTotals] = useState({ crawled: 0, relevant: 0, structured: 0, errors: 0 });
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;

    const eventSource = new EventSource("/api/admin/ingest/stream");

    eventSource.onmessage = (e) => {
      const event: IngestionEvent = JSON.parse(e.data);
      setEvents((prev) => [...prev.slice(-100), event]); // Keep last 100

      switch (event.type) {
        case "run:start":
          setIsRunning(true);
          setTotals({ crawled: 0, relevant: 0, structured: 0, errors: 0 });
          const sourceMap = new Map<string, SourceStatus>();
          (event.data.sourceNames as string[]).forEach((name) => {
            sourceMap.set(name, { name, status: "waiting" });
          });
          setSources(sourceMap);
          break;

        case "source:start":
          setSources((prev) => {
            const next = new Map(prev);
            next.set(event.data.sourceName, {
              name: event.data.sourceName,
              status: "crawling",
            });
            return next;
          });
          break;

        case "item:scoring":
          setCurrentItem(event.data.title);
          setCurrentStep("Scoring relevance...");
          break;

        case "item:scored":
          setCurrentStep(
            `Relevance: ${event.data.score.toFixed(2)} ${event.data.relevant ? "✓" : "✗"}`
          );
          if (event.data.relevant) {
            setTotals((prev) => ({ ...prev, relevant: prev.relevant + 1 }));
          }
          break;

        case "item:structuring":
          setCurrentStep("Structuring entry...");
          break;

        case "item:structured":
          setCurrentItem(event.data.title);
          setCurrentStep(`Structured as ${event.data.type}`);
          setTotals((prev) => ({ ...prev, structured: prev.structured + 1 }));
          break;

        case "item:error":
          setTotals((prev) => ({ ...prev, errors: prev.errors + 1 }));
          setCurrentItem(null);
          setCurrentStep(null);
          break;

        case "source:complete":
          setSources((prev) => {
            const next = new Map(prev);
            next.set(event.data.sourceName, {
              name: event.data.sourceName,
              status: "complete",
              crawled: event.data.crawled,
              relevant: event.data.relevant,
              structured: event.data.structured,
              errors: event.data.errors,
            });
            return next;
          });
          setTotals((prev) => ({ ...prev, crawled: prev.crawled + (event.data.crawled ?? 0) }));
          setCurrentItem(null);
          setCurrentStep(null);
          break;

        case "source:error":
          setSources((prev) => {
            const next = new Map(prev);
            next.set(event.data.sourceName, {
              name: event.data.sourceName,
              status: "error",
            });
            return next;
          });
          break;

        case "run:complete":
          setIsRunning(false);
          setCurrentItem(null);
          setCurrentStep(null);
          break;
      }
    };

    eventSource.onerror = () => {
      // Reconnect is automatic with EventSource
    };

    return () => {
      eventSource.close();
    };
  }, [visible]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  if (!visible) return null;

  const sourceList = Array.from(sources.values());

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-[500px] max-h-[600px] flex flex-col shadow-xl border-gray-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
          <span className="text-sm font-semibold">
            {isRunning ? "Ingestion Running" : "Ingestion Complete"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{totals.crawled} crawled</span>
          <span>{totals.relevant} relevant</span>
          <span>{totals.structured} structured</span>
          {totals.errors > 0 && (
            <span className="text-red-500">{totals.errors} errors</span>
          )}
          <button
            onClick={onClose}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Sources progress */}
      <div className="border-b px-4 py-2 max-h-[200px] overflow-y-auto">
        {sourceList.map((source) => (
          <div
            key={source.name}
            className="flex items-center justify-between py-1 text-xs"
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  source.status === "complete"
                    ? "bg-emerald-500"
                    : source.status === "crawling"
                      ? "bg-blue-500 animate-pulse"
                      : source.status === "error"
                        ? "bg-red-500"
                        : "bg-gray-300"
                }`}
              />
              <span
                className={
                  source.status === "waiting" ? "text-gray-400" : "text-gray-700"
                }
              >
                {source.name}
              </span>
            </div>
            {source.status === "complete" && (
              <span className="text-gray-400">
                {source.crawled} items → {source.relevant} relevant
              </span>
            )}
            {source.status === "crawling" && (
              <span className="text-blue-500">Processing...</span>
            )}
            {source.status === "error" && (
              <span className="text-red-500">Failed</span>
            )}
          </div>
        ))}
      </div>

      {/* Current item */}
      {currentItem && (
        <div className="border-b px-4 py-2 bg-gray-50">
          <div className="text-xs text-gray-500 truncate">
            <span className="font-medium">Processing:</span> {currentItem}
          </div>
          {currentStep && (
            <div className="text-xs text-blue-600 mt-0.5">{currentStep}</div>
          )}
        </div>
      )}

      {/* Event log */}
      <div
        ref={logRef}
        className="flex-1 overflow-y-auto px-4 py-2 max-h-[200px] font-mono text-[11px] text-gray-500"
      >
        {events.map((event, i) => (
          <div key={i} className="py-0.5">
            <span className="text-gray-300">
              {new Date(event.timestamp).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>{" "}
            <span
              className={
                event.type.includes("error")
                  ? "text-red-500"
                  : event.type.includes("structured")
                    ? "text-emerald-600"
                    : event.type.includes("scored")
                      ? "text-blue-500"
                      : "text-gray-500"
              }
            >
              {formatEvent(event)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function formatEvent(event: IngestionEvent): string {
  switch (event.type) {
    case "run:start":
      return `Starting ingestion (${event.data.totalSources} sources)`;
    case "source:start":
      return `⟳ ${event.data.sourceName}`;
    case "source:crawled":
      return `  Crawled ${event.data.count} items from ${event.data.sourceName}`;
    case "item:scoring":
      return `  Scoring: ${truncate(event.data.title, 60)}`;
    case "item:scored":
      return `  Score: ${event.data.score.toFixed(2)} ${event.data.relevant ? "✓ relevant" : "✗ filtered"}`;
    case "item:structuring":
      return `  Structuring: ${truncate(event.data.title, 60)}`;
    case "item:structured":
      return `  ✓ ${event.data.type}: ${truncate(event.data.title, 50)}`;
    case "item:error":
      return `  ✗ Error: ${truncate(event.data.error, 80)}`;
    case "source:complete":
      return `✓ ${event.data.sourceName}: ${event.data.crawled} → ${event.data.relevant} relevant → ${event.data.structured} structured`;
    case "source:error":
      return `✗ ${event.data.sourceName}: ${truncate(event.data.error, 80)}`;
    case "run:complete":
      return `Done! ${event.data.itemsStructured} entries created, $${event.data.cost?.toFixed(4) ?? "0"} spent`;
    default:
      return `${event.type}: ${JSON.stringify(event.data)}`;
  }
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "..." : str;
}
