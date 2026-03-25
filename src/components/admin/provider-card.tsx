"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MODEL_OPTIONS: Record<string, string[]> = {
  anthropic: ["claude-sonnet-4-6", "claude-haiku-4-5-20251001", "claude-opus-4-6"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
  gemini: ["gemini-2.0-flash", "gemini-2.5-pro", "gemini-2.5-flash"],
};

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Google Gemini",
};

interface ProviderCardProps {
  provider: string;
  maskedKey: string | null;
  model: string;
  onSaveKey: (key: string) => Promise<void>;
  onSaveModel: (model: string) => Promise<void>;
  onValidate: () => Promise<boolean>;
}

export function ProviderCard({
  provider,
  maskedKey,
  model,
  onSaveKey,
  onSaveModel,
  onValidate,
}: ProviderCardProps) {
  const [editing, setEditing] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const isConfigured = maskedKey !== null;
  const statusColor = validationResult === true
    ? "bg-emerald-500"
    : validationResult === false
      ? "bg-red-500"
      : isConfigured
        ? "bg-emerald-500"
        : "bg-gray-300";
  const statusText = validationResult === true
    ? "Connected"
    : validationResult === false
      ? "Invalid"
      : isConfigured
        ? "Configured"
        : "Not configured";

  async function handleSave() {
    setSaving(true);
    await onSaveKey(keyInput);
    setSaving(false);
    setEditing(false);
    setKeyInput("");
    setValidationResult(null);
  }

  async function handleValidate() {
    setValidating(true);
    setValidationMessage(null);
    try {
      const valid = await onValidate();
      setValidationResult(valid);
      setValidationMessage(valid ? "API key is valid!" : "API key is invalid or expired.");
    } catch {
      setValidationResult(false);
      setValidationMessage("Connection failed. Check your key.");
    }
    setValidating(false);
    // Auto-hide message after 5 seconds
    setTimeout(() => setValidationMessage(null), 5000);
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
          <span className="font-semibold">{PROVIDER_LABELS[provider]}</span>
          <span className="text-xs text-gray-400">{statusText}</span>
        </div>
      </div>

      <div className="mb-3">
        <label className="text-xs text-gray-500">API Key</label>
        {editing ? (
          <div className="flex gap-2 mt-1">
            <Input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Paste API key..."
            />
            <Button size="sm" onClick={handleSave} disabled={saving || !keyInput}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-mono text-gray-600">
              {maskedKey ?? "Not set"}
            </span>
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              {isConfigured ? "Edit" : "Add"}
            </Button>
            {isConfigured && (
              <Button size="sm" variant="secondary" onClick={handleValidate} disabled={validating}>
                {validating ? "Testing..." : "Test"}
              </Button>
            )}
          </div>
        )}
      </div>

      {validationMessage && (
        <div
          className={`mb-3 rounded-md px-3 py-2 text-sm ${
            validationResult
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {validationResult ? "✓" : "✗"} {validationMessage}
        </div>
      )}

      <div>
        <label className="text-xs text-gray-500">Model</label>
        <select
          value={model}
          onChange={(e) => onSaveModel(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          {(MODEL_OPTIONS[provider] ?? []).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
    </Card>
  );
}
