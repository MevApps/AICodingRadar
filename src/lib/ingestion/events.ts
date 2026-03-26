type IngestionEventType =
  | "run:start"
  | "source:start"
  | "source:crawled"
  | "item:scoring"
  | "item:scored"
  | "item:structuring"
  | "item:structured"
  | "item:supersession"
  | "item:error"
  | "source:complete"
  | "source:error"
  | "run:complete";

interface IngestionEvent {
  type: IngestionEventType;
  timestamp: number;
  data: Record<string, any>;
}

type Listener = (event: IngestionEvent) => void;

class IngestionEventBus {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(type: IngestionEventType, data: Record<string, any> = {}): void {
    const event: IngestionEvent = { type, timestamp: Date.now(), data };
    for (const listener of this.listeners) {
      try { listener(event); } catch {}
    }
  }
}

// Global singleton — shared between the ingest route and SSE route
export const ingestionEvents = new IngestionEventBus();
export type { IngestionEvent, IngestionEventType };
