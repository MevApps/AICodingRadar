"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Google Gemini",
};

interface ProviderPriorityProps {
  priority: string[];
  configuredProviders: Set<string>;
  embeddingProvider: string;
  onReorder: (newOrder: string[]) => void;
  onEmbeddingChange: (provider: string) => void;
}

export function ProviderPriority({
  priority,
  configuredProviders,
  embeddingProvider,
  onReorder,
  onEmbeddingChange,
}: ProviderPriorityProps) {
  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...priority];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onReorder(next);
  }

  function moveDown(index: number) {
    if (index === priority.length - 1) return;
    const next = [...priority];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onReorder(next);
  }

  const embeddingOptions = priority.filter(
    (p) => configuredProviders.has(p) && p !== "anthropic"
  );

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">Provider Priority</h3>
      <p className="text-xs text-gray-500 mb-3">
        Providers are tried in order. Unconfigured providers are skipped.
      </p>

      <div className="space-y-2 mb-4">
        {priority.map((name, i) => (
          <div
            key={name}
            className={`flex items-center justify-between rounded border px-3 py-2 text-sm ${
              configuredProviders.has(name) ? "border-gray-200" : "border-gray-100 text-gray-400"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-4">{i + 1}.</span>
              <span
                className={`h-2 w-2 rounded-full ${
                  configuredProviders.has(name) ? "bg-emerald-500" : "bg-gray-300"
                }`}
              />
              <span>{PROVIDER_LABELS[name]}</span>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => moveUp(i)} disabled={i === 0}>
                ↑
              </Button>
              <Button size="sm" variant="ghost" onClick={() => moveDown(i)} disabled={i === priority.length - 1}>
                ↓
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="text-xs text-gray-500">Embedding Provider</label>
        <select
          value={embeddingProvider}
          onChange={(e) => onEmbeddingChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          {embeddingOptions.length === 0 && (
            <option value="">Configure OpenAI or Gemini first</option>
          )}
          {embeddingOptions.map((p) => (
            <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400">
          Anthropic doesn&apos;t support embeddings directly — use OpenAI or Gemini.
        </p>
      </div>
    </Card>
  );
}
